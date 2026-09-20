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

// A-02 · 인증번호 확인 + 비밀번호 저장
export async function signUpWithCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email");
  const code = text(formData, "code");
  const password = String(formData.get("password") ?? "");
  const terms = readTerms(formData);

  if (!isEmail(email)) return { error: "이메일 주소를 확인해 주세요." };
  if (!isOtp(code)) return { error: "메일로 받은 인증번호를 입력해 주세요." };
  if (password.length < PASSWORD_MIN) {
    return { error: `비밀번호는 ${PASSWORD_MIN}자 이상으로 입력해 주세요.` };
  }
  if (!terms) return { error: "필수 약관에 동의해 주세요." };

  const supabase = await createClient();

  // 인증번호는 한 번 쓰면 사라진다. 인증은 됐는데 비밀번호 저장에서 실패해 다시 누른 경우를 위해
  // 이미 같은 이메일로 로그인돼 있으면 인증 단계를 건너뛴다.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email?.toLowerCase() !== email.toLowerCase()) {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) return { error: authErrorMessage(error.code) };
  }

  const { error } = await supabase.auth.updateUser({ password, data: terms });
  if (error && error.code !== "same_password") return { error: authErrorMessage(error.code) };

  redirect("/onboarding");
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
