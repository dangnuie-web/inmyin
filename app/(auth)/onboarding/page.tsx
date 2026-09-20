import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getSessionProfile } from "@/lib/auth/profile";
import { NICKNAME_MAX } from "@/lib/auth/rules";

export const metadata: Metadata = { title: "프로필 만들기 · INMYIN" };

// A-03 · 프로필 만들기
export default async function OnboardingPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (profile) redirect("/");

  // 구글은 full_name, 카카오는 name 에 이름을 담아 준다
  const socialName = user.user_metadata.full_name ?? user.user_metadata.name;
  const defaultNickname = typeof socialName === "string" ? socialName.slice(0, NICKNAME_MAX) : "";

  return (
    <div className="flex flex-col gap-12">
      <h1 className="text-center text-title font-bold">
        환영합니다!
        <br />
        사용할 닉네임과 아이디를 입력해주세요.
      </h1>
      <OnboardingForm
        defaultNickname={defaultNickname}
        needsTerms={!user.user_metadata.terms_agreed_at}
      />
    </div>
  );
}
