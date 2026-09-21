import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SoonButton } from "@/components/profile/SoonButton";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
import { TabIcon } from "@/components/ui/TabIcon";
import { requireProfile } from "@/lib/auth/profile";
import { itemPath } from "@/lib/inventory/paths";
import { getMyInventories } from "@/lib/inventory/queries";
import { planLimits } from "@/lib/plans";
import { getMyProfileStats } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "프로필 · INMYIN" };

const ACTION_CLASS = "flex h-9.5 flex-1 items-center justify-center rounded-sm bg-ink text-label font-bold text-white active:opacity-80";

// M-01 · My › 내 프로필. My 탭의 기본 화면. 여기서 설정 · 인벤토리 · 아이템으로 갈라진다.
export default async function MyProfilePage() {
  const profile = await requireProfile();
  const [stats, inventories] = await Promise.all([getMyProfileStats(profile.id), getMyInventories(profile.id)]);
  const { maxInventories, slotCount } = planLimits(profile.plan);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-6">
      <HeaderMini icon="settings" href="/my/settings" title="PROFILE" />

      <section className="flex items-center gap-8.5 px-10.25 pt-1">
        <div className="relative flex size-24.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-2 text-disabled">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt="" fill sizes="98px" unoptimized className="object-cover" />
          ) : (
            // 프로필 사진이 아직 없을 때. 하단 탭의 My 와 같은 사람 그림
            <TabIcon name="my" active />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-caption font-bold">{profile.handle}</p>
          <p className="flex items-center gap-2 text-title font-bold">
            <span className="truncate">{profile.nickname}</span>
            {profile.plan === "premium" && (
              // 프리미엄 표시. 보라색 원 안의 별
              <span aria-label="프리미엄" className="flex size-4 shrink-0 items-center justify-center rounded-full bg-point text-[9px] leading-none text-white">
                ★
              </span>
            )}
          </p>
          {/* 팔로우는 2단계에서 열린다. 그때 이 숫자를 누르면 팔로워 · 팔로잉 목록(M-12)으로 간다 */}
          <p className="flex gap-2.5 text-label">
            <span>팔로워 {stats.followerCount.toLocaleString("ko-KR")}</span>
            <span>팔로잉 {stats.followingCount.toLocaleString("ko-KR")}</span>
          </p>
        </div>
      </section>

      <div className="mt-6 flex gap-1 px-6">
        <SoonButton notice="프로필 관리는 곧 만들어요." className={ACTION_CLASS}>
          프로필 관리
        </SoonButton>
        <SoonButton notice="프로필 공유는 곧 만들어요." className={ACTION_CLASS}>
          프로필 공유
        </SoonButton>
      </div>

      <Link href="/my/inventories" className="mt-8.5 flex h-15.5 items-center border-y border-gray-3 pl-7 active:opacity-60">
        <SectionTitle title="INVENTORY" note={`${inventories.length}/${maxInventories}`} />
        {/* 뒤로가기 화살표를 뒤집어 쓴다 */}
        <Icon name="back" className="ml-auto rotate-180" />
      </Link>

      <section className="border-b border-gray-3 pb-7">
        <div className="flex h-16 items-center pl-7 pr-6.5">
          <SectionTitle title="ITEM" note={`TOTAL ${stats.itemCount}/${maxInventories * slotCount}`} />
          <SoonButton notice="아이템 모아보기는 곧 만들어요." className="ml-auto rounded-md bg-ink px-2.5 text-label font-bold text-white active:opacity-80">
            더보기
          </SoonButton>
        </div>
        {stats.recentItems.length > 0 ? (
          <ul className="flex gap-2.25 overflow-x-auto px-6 [scrollbar-width:none]">
            {stats.recentItems.map((item) => (
              <li key={item.id} className="shrink-0">
                <Link href={itemPath(item.id)} aria-label={item.name} className="relative block size-18 overflow-hidden rounded-md bg-gray-1 active:opacity-80">
                  {/* 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다 */}
                  <Image src={item.imageUrl} alt="" fill sizes="72px" unoptimized className="object-cover" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>아직 등록한 아이템이 없어요. 인벤토리에서 + 를 눌러 넣어 보세요.</EmptyNote>
        )}
      </section>

      <section>
        <div className="flex h-16 items-center pl-7">
          <SectionTitle title="INMYIN" note={`게시물 ${stats.postCount}`} />
        </div>
        {/* INMYIN 에디터와 게시물은 3단계에서 만든다 */}
        <EmptyNote>아직 게시물이 없어요.</EmptyNote>
      </section>
    </div>
  );
}

// 줄의 제목. 큰 영문 제목 옆에 작은 숫자가 붙는다 (INVENTORY 5/25)
function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <h2 className="flex items-baseline gap-3 text-link font-bold">
      {title}
      <span className="text-caption font-normal">{note}</span>
    </h2>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="break-keep px-7 text-label text-ink-muted">{children}</p>;
}
