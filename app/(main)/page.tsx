import { requireProfile } from "@/lib/auth/profile";

// 임시 — 2단계에서 Home › 아이템 피드(H-01)로 채운다
export default async function Home() {
  await requireProfile();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
      <h1 className="text-title font-bold">Home</h1>
      <p className="text-body text-ink-muted">다른 사람들의 아이템이 여기에 모입니다.</p>
    </div>
  );
}
