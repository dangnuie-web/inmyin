import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { getSessionProfile } from "@/lib/auth/profile";
import { formatShortDate } from "@/lib/item/rules";

export const metadata: Metadata = { title: "로그인 정보 · INMYIN" };

const PROVIDERS: Record<string, string> = { google: "구글", kakao: "카카오", email: "이메일" };

// 설정 › 로그인 정보. 어떤 방법으로, 어떤 메일로 로그인했는지 보여준다. 고치는 기능은 없다
export default async function AccountPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");

  const provider = user.app_metadata.provider ?? "email";
  const rows = [
    { label: "로그인 방법", value: PROVIDERS[provider] ?? provider },
    { label: "이메일", value: user.email ?? "-" },
    { label: "아이디", value: profile.handle },
    { label: "가입한 날", value: formatShortDate(user.created_at.slice(0, 10)) },
  ];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <HeaderMini icon="back" href="/my/settings" title="로그인 정보" />
      <dl className="mt-4 flex flex-col px-5">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex h-12 items-center justify-between gap-4 border-b border-gray-3 text-body">
            <dt className="shrink-0 font-bold">{label}</dt>
            <dd className="min-w-0 truncate text-ink-muted">{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
