import type { Metadata } from "next";
import { PushSettings } from "@/components/push/PushSettings";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { StickyTop } from "@/components/ui/StickyTop";
import { requireProfile } from "@/lib/auth/profile";

export const metadata: Metadata = { title: "알림 · INMYIN" };

// 설정 › 알림. 이 기기에서 푸시 알림을 켜고 끄고, 받을 종류를 고른다.
// 앱 안 알림(종 · 알림 화면)은 여기와 상관없이 늘 쌓인다
export default async function NotificationSettingsPage() {
  await requireProfile();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-10">
      <StickyTop>
        <HeaderMini icon="back" href="/my/settings" title="알림" />
      </StickyTop>
      <PushSettings publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
    </main>
  );
}
