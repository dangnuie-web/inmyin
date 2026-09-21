"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  authErrorMessage,
  HANDLE_PATTERN,
  isEmail,
  isOtp,
  NICKNAME_MAX,
  PASSWORD_MIN,
  type FormState,
} from "@/lib/auth/rules";
import { TERMS, termFieldName } from "@/lib/terms";

const PROVIDERS = ["google", "kakao"] as const;
type Provider = (typeof PROVIDERS)[number];

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// 체크된 약관을 읽는다. 필수 항목이 하나라도 빠지면 null
function readTerms(formData: FormData) {
  const agreed = (id: (typeof TERMS)[number]["id"]) => formData.get(termFieldName(id)) === "on";
  if (TERMS.some((term) => term.required && !agreed(term.id))) return null;
  return {
    terms_agreed_at: new Date().toISOString(),
    marketing_opt_in: agreed("marketing"),
  };
}

// A-01 · 이메일 + 비밀번호 로그인
export async function signInWithEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!isEmail(email) || !password) {
    return { error: "이메일과 비밀번호를 입력해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error.code) };

  redirect("/");
}

// A-01 · 구글·카카오 로그인. 각 회사의 로그인 창으로 보낸다.
// 끝나면 그쪽에서 /auth/callback 으로 돌려보내 준다.
export async function signInWithProvider(formData: FormData) {
  const provider = text(formData, "provider") as Provider;
  if (!PROVIDERS.includes(provider)) redirect("/login?error=oauth");

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=oauth");

  redirect(data.url);
}

// A-02 · 인증번호 메일 보내기
export async function sendSignupCode(email: string): Promise<FormState> {
  if (typeof email !== "string" || !isEmail(email.trim())) {
    return { error: "이메일 주소를 확인해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) return { error: authErrorMessage(error.code) };

  return {};
}

// A-02 · A-04 · 인증번호 확인. 맞으면 그 이메일로 로그인된 상태가 된다
export async function verifyEmailCode(email: string, code: string): Promise<FormState> {
  if (typeof email !== "string" || !isEmail(email.trim())) {
    return { error: "이메일 주소를 확인해 주세요." };
  }
  if (typeof code !== "string" || !isOtp(code)) {
    return { error: "메일로 받은 인증번호를 입력해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
  if (error) return { error: authErrorMessage(error.code) };

  return {};
}

// A-02 · 비밀번호 + 약관 동의 저장. 인증번호 확인을 마친 뒤에 부른다
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");
  const terms = readTerms(formData);

  if (password.length < PASSWORD_MIN) {
    return { error: `비밀번호는 ${PASSWORD_MIN}자 이상으로 입력해 주세요.` };
  }
  if (!terms) return { error: "필수 약관에 동의해 주세요." };

  const result = await setVerifiedPassword(email, password, terms);
  if (result.error) return result;

  redirect("/onboarding");
}

// A-04 · 인증번호 메일 보내기. 가입과 달리 계정을 새로 만들지 않는다
export async function sendResetCode(email: string): Promise<FormState> {
  if (typeof email !== "string" || !isEmail(email.trim())) {
    return { error: "이메일 주소를 확인해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false },
  });
  // otp_disabled = 계정을 만들 수 없는데 그 이메일의 계정도 없다
  if (error?.code === "otp_disabled") return { error: "가입하지 않은 이메일입니다." };
  if (error) return { error: authErrorMessage(error.code) };

  return {};
}

// A-04 · 새 비밀번호 저장. 인증번호 확인을 마친 뒤에 부른다
export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");

  if (password.length < PASSWORD_MIN) {
    return { error: `비밀번호는 ${PASSWORD_MIN}자 이상으로 입력해 주세요.` };
  }

  const result = await setVerifiedPassword(email, password);
  if (result.error) return result;

  // 프로필이 없는 사람은 홈이 A-03 으로 보낸다
  redirect("/");
}

// 인증번호 확인을 마친 사람의 비밀번호를 저장한다. 가입(A-02)과 비밀번호 재설정(A-04)이 같이 쓴다.
// data 는 계정에 함께 적어둘 것 (약관 동의 시각 등)
async function setVerifiedPassword(
  email: string,
  password: string,
  data?: Record<string, unknown>,
): Promise<FormState> {
  const supabase = await createClient();

  // 인증번호를 확인하면 그 이메일로 로그인된다. 로그인된 이메일이 다르면 확인을 건너뛴 것이다
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || user.email.toLowerCase() !== email.toLowerCase()) {
    return { error: "인증번호 확인을 먼저 해 주세요." };
  }

  // same_password = 예전과 같은 비밀번호. 그 비밀번호로 로그인할 수 있으니 성공으로 친다
  const { error } = await supabase.auth.updateUser({ password, data });
  if (error && error.code !== "same_password") return { error: authErrorMessage(error.code) };

  return {};
}

// A-03 · 프로필(users 행) 만들기
export async function createProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const nickname = text(formData, "nickname");
  const handle = text(formData, "handle").toLowerCase();

  if (!nickname || nickname.length > NICKNAME_MAX) {
    return { error: `닉네임은 1~${NICKNAME_MAX}자로 입력해 주세요.` };
  }
  if (!HANDLE_PATTERN.test(handle)) {
    return { error: "아이디는 영소문자·숫자·밑줄(_)로 3~30자여야 합니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 구글·카카오로 들어온 사람은 가입 화면을 거치지 않아서 여기서 약관 동의를 받는다
  if (!user.user_metadata.terms_agreed_at) {
    const terms = readTerms(formData);
    if (!terms) return { error: "필수 약관에 동의해 주세요." };
    const { error } = await supabase.auth.updateUser({ data: terms });
    if (error) return { error: authErrorMessage(error.code) };
  }

  const provider = user.app_metadata.provider;
  const { error } = await supabase.from("users").insert({
    id: user.id,
    handle,
    nickname,
    provider: provider === "google" || provider === "kakao" || provider === "email" ? provider : null,
  });

  if (error) {
    // 23505 = 중복. 아이디가 겹친 것이 아니라면 이미 프로필이 있는 사람이다
    if (error.code !== "23505") return { error: authErrorMessage(undefined) };
    if (error.message.includes("users_handle_key")) {
      return { error: "이미 사용 중인 아이디입니다." };
    }
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
