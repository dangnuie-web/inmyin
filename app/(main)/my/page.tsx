import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { requireProfile } from "@/lib/auth/profile";

// 임시 — 내 프로필(M-01)을 만들면 이 화면을 대체한다
export default async function My() {
  const profile = await requireProfile();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
      <h1 className="text-title font-bold">My</h1>
      <p className="text-body text-ink-muted">
        {profile.nickname} (@{profile.handle}) 님으로 로그인했습니다.
      </p>
      {/* 임시 — 설정(M-02)을 만들면 그쪽으로 옮긴다 */}
      <form action={signOut} className="mt-4 w-40">
        <Button type="submit" variant="outline">
          로그아웃
        </Button>
      </form>
    </div>
  );
}
