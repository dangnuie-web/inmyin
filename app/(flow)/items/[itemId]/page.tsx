import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gridColumnsClass, gridFor, SlotCell, toGridColumns } from "@/components/inventory/Slot";
import { ItemMenu } from "@/components/item/ItemMenu";
import { BookmarkButton } from "@/components/bookmark/BookmarkButton";
import { CommentSection } from "@/components/comment/CommentSection";
import { FollowButton } from "@/components/follow/FollowButton";
import { HeartButton } from "@/components/heart/HeartButton";
import { Avatar } from "@/components/profile/Avatar";
import { BackHeader } from "@/components/ui/BackHeader";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { hasBookmarked } from "@/lib/bookmark/queries";
import { getComments } from "@/lib/comment/queries";
import { inventoryPath } from "@/lib/inventory/paths";
import { getMyInventoryDetail, type SlotEntry } from "@/lib/inventory/queries";
import { hasHearted } from "@/lib/heart/queries";
import { getItemDetail, getVisibleInventoryEntries } from "@/lib/item/queries";
import { formatShortDate } from "@/lib/item/rules";
import { isFollowing } from "@/lib/follow/queries";
import { profilePath } from "@/lib/profile/paths";

export const metadata: Metadata = { title: "아이템 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 아이템 상세. 어디서 왔는지로 모양이 정해진다:
//   내 인벤토리(M-04)에서 온 내 아이템 = M-14 — 닫으면 그 인벤토리로, ⋮ 메뉴로 수정 · 삭제, 아래는 같은 인벤토리의 칸들. 둘 다 맨 아래는 댓글
//   홈 피드(H-01)에서 왔거나 남의 아이템 = H-02 — 작성자 줄 · 팔로우 · 북마크. 홈에서 왔으면 제목 · 내용에서 끝난다
//   (홈으로 돌아가면 이어서 볼 수 있다), 프로필 · 인벤토리에서 왔으면 아래에 같은 인벤토리의 공개 아이템들.
//   홈에서 연 내 아이템도 남의 것과 똑같이 보인다 — 내가 올린 것이 남에게 어떻게 보이는지 그대로 보려고
// 주소는 둘 다 /items/[id]. 하단 탭이 없는 화면이라 (flow) 묶음에 둔다
export default async function ItemDetailPage(props: PageProps<"/items/[itemId]">) {
  const profile = await requireProfile();
  const { itemId } = await props.params;
  if (!UUID_PATTERN.test(itemId)) notFound();
  // 홈 피드에서 왔는지 (?from=home). 피드의 검색어 · 카테고리도 같이 실려 오지만 지금은 쓰지 않는다 — 돌아갈 때 주소가 그대로라 홈이 알아서 이어 보여준다
  const fromHome = (await props.searchParams).from === "home";

  // 남의 비공개 아이템은 DB 규칙(RLS)이 애초에 돌려주지 않아서 여기서 없는 것이 된다
  const item = await getItemDetail(itemId);
  if (!item) notFound();
  const isMine = item.owner.id === profile.id;
  const asOwner = isMine && !fromHome;

  const facts = [
    { label: "획득날짜", value: item.acquiredNote },
    { label: "유통기한", value: item.expiresAt && `${formatShortDate(item.expiresAt)} 까지` },
  ].filter((fact) => fact.value);
  // 댓글 목록에서 "나"를 그릴 때 (방금 쓴 댓글을 서버의 답보다 먼저 보여준다)
  const me = { id: profile.id, handle: profile.handle, nickname: profile.nickname, avatarUrl: profile.avatar_url };

  // ---- 내 인벤토리에서 온 내 아이템 (M-14) ----
  if (asOwner) {
    const [inventory, hearted, comments] = await Promise.all([
      getMyInventoryDetail(profile.id, item.inventoryId),
      hasHearted(profile.id, "item", item.id),
      getComments("item", item.id),
    ]);
    if (!inventory) notFound();
    return (
      // 아래 여백은 댓글 입력칸이 맡는다 (화면 맨 아래에 붙어 있다)
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <HeaderMini icon="close" href={inventoryPath(inventory.id)} title="아이템" action={<ItemMenu itemId={item.id} inventoryId={item.inventoryId} />} />
        <Photo item={item} className="mx-5 mt-3 bg-gray-1" />
        <section className="mt-10 px-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="min-w-0 truncate text-title font-bold">{item.name}</h2>
            {/* 내 아이템에도 하트 · 하트 수 — 누가 얼마나 반응했는지 보려고. 북마크는 없다 (내 것을 모을 일이 없다) */}
            <HeartButton targetType="item" targetId={item.id} hearted={hearted} count={item.heartCount} />
          </div>
          <Description item={item} facts={facts} />
        </section>
        <Grid entries={inventory.entries} currentId={item.id} className={gridFor(inventory.slotCount, toGridColumns(profile.grid_columns)).className} />
        <CommentSection targetType="item" targetId={item.id} comments={comments} me={me} ownerId={item.owner.id} />
      </main>
    );
  }

  // ---- 홈에서 왔거나 남의 아이템 (H-02) ----
  // 아래의 칸들: 프로필 · 인벤토리에서 왔으면 그 사람 인벤토리의 공개 아이템. 홈에서 왔으면 없다 —
  // "이것보다 먼저 올라온 것"만 쌓이는 건 이상하고, 홈으로 돌아가면 이어서 볼 수 있다
  const [nearby, hearted, bookmarked, following, comments] = await Promise.all([
    fromHome ? [] : getVisibleInventoryEntries(item.inventoryId),
    hasHearted(profile.id, "item", item.id),
    hasBookmarked(profile.id, "item", item.id),
    isMine ? false : isFollowing(profile.id, item.owner.id),
    getComments("item", item.id),
  ]);

  return (
    // 아래 여백은 댓글 입력칸이 맡는다 (화면 맨 아래에 붙어 있다)
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      {/* 피드 · 프로필 등 어디서든 올 수 있어서 왔던 곳으로 돌아간다. 수정 · 삭제 메뉴는 없다 */}
      <BackHeader icon="close" title="아이템" />

      {/* 작성자 줄 (피그마 H-02). 사진과 이름을 누르면 그 사람의 프로필(H-06). 내 것이면 내 프로필 */}
      <div className="mt-4 flex items-center gap-5 px-5">
        <Link href={isMine ? "/my" : profilePath(item.owner.handle)} className="flex min-w-0 flex-1 items-center gap-5 active:opacity-60">
          <Avatar url={item.owner.avatarUrl} size={72} />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-body font-bold">{item.owner.nickname}</span>
            {/* 등록한 날. 서버는 UTC 로 주므로 한국 날짜로 바꿔서 26.09.05 꼴로 */}
            <span className="text-body">{formatShortDate(new Date(item.createdAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }))}</span>
          </span>
        </Link>
        {!isMine && <FollowButton userId={item.owner.id} following={following} />}
      </div>

      {/* 피그마 H-02: 흰 바탕에 옅은 테두리 */}
      <Photo item={item} className="mx-5 mt-5 border border-border bg-white" />

      <section className="mt-6 px-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="min-w-0 truncate text-title font-bold">{item.name}</h2>
          {/* 오른쪽은 [하트 · 하트 수 · 북마크] 순서 (CLAUDE.md). 하트는 반응, 북마크는 모으기 */}
          <div className="flex shrink-0 items-center gap-4">
            <HeartButton targetType="item" targetId={item.id} hearted={hearted} count={item.heartCount} />
            <BookmarkButton targetType="item" targetId={item.id} bookmarked={bookmarked} />
          </div>
        </div>
        <Description item={item} facts={facts} />
      </section>

      {nearby.length > 0 && <Grid entries={nearby} currentId={item.id} className={gridColumnsClass(toGridColumns(profile.grid_columns))} />}
      <CommentSection targetType="item" targetId={item.id} comments={comments} me={me} ownerId={item.owner.id} />
    </main>
  );
}

type Item = NonNullable<Awaited<ReturnType<typeof getItemDetail>>>;
type Fact = { label: string; value: string | null };

// 큰 정사각형 사진. 개수가 둘 이상이면 오른쪽 아래에 × n
function Photo({ item, className }: { item: Item; className: string }) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-lg ${className}`}>
      {/* 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다 */}
      <Image src={item.imageUrl} alt={item.name} fill sizes="(min-width: 448px) 400px, 90vw" unoptimized priority className="object-cover" />
      {item.quantity > 1 && (
        <span className="absolute bottom-5.5 right-5 rounded-full bg-white px-3 text-link font-bold">× {item.quantity}</span>
      )}
    </div>
  );
}

function Description({ item, facts }: { item: Item; facts: Fact[] }) {
  return (
    <>
      {item.description && <p className="mt-4 whitespace-pre-line break-keep text-label">{item.description}</p>}
      {facts.length > 0 && (
        <dl className="mt-5 flex flex-col gap-1 pl-2.5 text-body">
          {facts.map(({ label, value }) => (
            <div key={label} className="flex gap-7">
              <dt className="font-bold before:mr-3.5 before:content-['•']">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}

// 아래의 칸들. 지금 보고 있는 아이템에는 검은 테두리, 다른 칸을 누르면 그 아이템으로 건너간다
function Grid({ entries, currentId, className }: { entries: SlotEntry[]; currentId: string; className: string }) {
  return (
    <ul className={`mt-16 grid gap-3.5 px-5 ${className}`}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <SlotCell entry={entry} current={entry.id === currentId} />
        </li>
      ))}
    </ul>
  );
}
