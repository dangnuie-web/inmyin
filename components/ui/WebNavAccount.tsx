import { signOut } from "@/app/(auth)/actions";
import { WebNavAdd } from "@/components/ui/WebNavAdd";
import { WebNavLoginLink } from "@/components/ui/WebNavLoginLink";
import { isLoggedIn } from "@/lib/auth/profile";

// 웹 상단 바 오른쪽 끝 — 로그인했으면 "+ 추가"(WebNavAdd) · "로그아웃", 안 했으면 "로그인"(구경 화면: 발견 · INMYIN · 타유저 프로필).
// 보조 동작이라 메뉴보다 한 단계 작은 회색 글자. 검정 채움 버튼은 주 버튼에만 쓴다.
// 레이아웃은 탭을 옮겨 다닐 때 다시 그려지지 않지만, 로그인 · 로그아웃은 언제나 로그인 화면을 거쳐 오가므로 상태가 어긋나지 않는다
const ACCOUNT_CLASS = "text-label text-ink-muted hover:text-ink active:opacity-60";

export async function WebNavAccount() {
  if (!(await isLoggedIn())) return <WebNavLoginLink className={ACCOUNT_CLASS} />;
  return (
    <div className="flex items-center gap-6">
      <WebNavAdd />
      <form action={signOut}>
        <button type="submit" className={ACCOUNT_CLASS}>
          로그아웃
        </button>
      </form>
    </div>
  );
}
