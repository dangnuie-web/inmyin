import { requireProfile } from "@/lib/auth/profile";

// 임시 — 2단계에서 Like 탭(V-01, V-02)으로 채운다
export default async function Like() {
  await requireProfile();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
      <h1 className="text-title font-bold">Like</h1>
      <p className="text-body text-ink-muted">좋아요를 누른 것들이 여기에 모입니다.</p>
    </div>
  );
}
