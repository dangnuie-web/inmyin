"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateItem } from "@/app/(flow)/items/[itemId]/actions";
import { createItem } from "@/app/(flow)/my/inventories/[id]/items/new/actions";
import { InventoryTargetSheet } from "@/components/inventory/InventoryTargetSheet";
import { usePhotoChange } from "@/components/item/usePhotoChange";
import { SMALL_OUTLINE_CLASS } from "@/components/profile/ProfileParts";
import { Button } from "@/components/ui/Button";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { DarkInput, DarkTextarea } from "@/components/ui/DarkInput";
import { FormError } from "@/components/ui/FormError";
import { Icon } from "@/components/ui/Icon";
import { PhotoPreview } from "@/components/ui/PhotoPreview";
import { Switch } from "@/components/ui/Switch";
import { MAX_CATEGORY_LENGTH } from "@/lib/categories";
import {
  clearPhotoChange,
  getPendingPhoto,
  peekEditedPhoto,
  peekPhotoChangeDraft,
  savePhotoChangeDraft,
  setPendingPhoto,
  type PendingPhoto,
} from "@/lib/image/pending-photo";
import { uploadPhotoPair } from "@/lib/image/upload";
import { inventoryPath, itemPhotoCameraPath, itemPhotoEditPath } from "@/lib/inventory/paths";
import type { InventoryChoice } from "@/lib/inventory/queries";
import { hasRoom } from "@/lib/inventory/target";
import type { ItemDetail } from "@/lib/item/queries";
import {
  ACQUIRED_NOTE_MAX,
  formatShortDate,
  ITEM_DESCRIPTION_MAX,
  ITEM_NAME_MAX,
  ITEM_QUANTITY_MAX,
} from "@/lib/item/rules";

type ItemFormProps = {
  userId: string;
  // 새로 넣을 때는 주소의 [id] — 사진 없이 들어왔을 때 돌아갈 곳. 수정할 때는 그 아이템이 든 인벤토리
  inventoryId: string;
} & (
  | {
      // 수정 — 그 값으로 채워서 연다. 맨 위 사진을 누르거나 "사진 바꾸기"로 촬영 → 사진편집을 다시 거쳐 돌아온다.
      // 넣을 곳 줄은 없다(옮기기는 짐싸기의 몫)
      item: ItemDetail;
      // 이 인벤토리에 달린 태그. 칩으로 보여주고 하나를 고른다
      categories: string[];
    }
  | {
      item?: undefined;
      // 내 인벤토리 전부 (인벤토리 관리와 같은 순서). "넣을 곳" 판에서 고른다. 칩은 고른 인벤토리의 태그
      inventories: InventoryChoice[];
      // 처음 골라 둘 곳 (page 가 정한다 — 무늬 인벤토리고르기설계 v01 3-2)
      initialInventoryId: string;
      // 아이템 모아보기(M-13)에서 칩을 고른 채 왔으면 그 카테고리. 입력칸에 미리 채운다
      initialCategory?: string | null;
    }
);

// 사진 바꾸러 떠날 때 맡겨 두는 수정 화면의 값 (lib/image/pending-photo.ts)
type ItemDraft = {
  name: string;
  description: string;
  category: string;
  quantity: number;
  acquiredNote: string;
  expiresAt: string;
  isPublic: boolean;
  // 이미 한 번 바꿔 둔 새 사진. 또 바꾸러 갔다가 닫고 오면 이것으로 돌아온다
  photo: PendingPhoto | null;
};

// M-08 · 아이템 정보 입력. 사진은 앞 단계에서 이미 골랐고, 여기서는 넣을 곳과 글자 정보를 받는다.
// 아이템 수정도 같은 폼이다.
export function ItemForm(props: ItemFormProps) {
  const { userId, inventoryId, item } = props;
  const router = useRouter();
  const draftKey = item ? `item:${item.id}` : "";
  // 수정 — 사진 바꾸기에서 돌아왔으면 떠나기 전 값. 새로 열었으면 null
  const [restored] = useState(() => (item ? peekPhotoChangeDraft<ItemDraft>(draftKey) : null));
  // 새로 넣을 때 = 앞 단계에서 고른 사진. 수정할 때 = 바꿀 새 사진 (null 이면 지금 사진 그대로).
  // 사진편집에서 저장하기로 왔으면 그 사진, 촬영 · 사진편집을 닫고 왔으면 떠나기 전 그대로
  const [photo] = useState(() => (item ? (restored ? (peekEditedPhoto() ?? restored.photo) : null) : getPendingPhoto()));
  // 넣을 곳 (새로 넣을 때만). 저장하려다 꽉 찼다고 돌아온 인벤토리는 판에서 꽉 찬 것으로 보인다
  const [targetId, setTargetId] = useState(props.item ? inventoryId : props.initialInventoryId);
  const [fullIds, setFullIds] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const targetButtonRef = useRef<HTMLButtonElement>(null);
  const choices = props.item
    ? []
    : props.inventories.map((inventory) => (fullIds.includes(inventory.id) ? { ...inventory, usedSlots: Math.max(inventory.usedSlots, inventory.slotCount) } : inventory));
  const target = choices.find((inventory) => inventory.id === targetId);
  const categories = props.item ? props.categories : (target?.categories ?? []);
  const targetFull = target ? !hasRoom(target) : false;

  const [name, setName] = useState(restored?.name ?? item?.name ?? "");
  const [description, setDescription] = useState(restored?.description ?? item?.description ?? "");
  const [category, setCategory] = useState(restored?.category ?? item?.category ?? (props.item ? "" : (props.initialCategory ?? "")));
  const [quantity, setQuantity] = useState(restored?.quantity ?? item?.quantity ?? 1);
  const [acquiredNote, setAcquiredNote] = useState(restored?.acquiredNote ?? item?.acquiredNote ?? "");
  const [expiresAt, setExpiresAt] = useState(restored?.expiresAt ?? item?.expiresAt ?? "");
  const [isPublic, setIsPublic] = useState(restored?.isPublic ?? item?.isPublic ?? true);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // 사진 없이는 등록할 수 없다. 새로고침으로 사진을 잃었으면 인벤토리로 돌아가 + 부터 다시 한다
  useEffect(() => {
    if (!item && !photo) router.replace(inventoryPath(inventoryId));
  }, [item, photo, router, inventoryId]);

  // 새로 넣을 때 — 화면을 떠나면 보관함을 비운다. 사진은 이미 위의 photo 가 들고 있다.
  // 수정할 때 — 열리자마자 맡긴 값 · 보관함을 비운다(위에서 다 읽었다). 떠날 때는 비우지 않는다 — 컴퓨터에서 사진을 고르면
  // 보관함에 넣고 바로 사진편집으로 가는데, 그 뒤에 이 화면이 닫힌다
  const editing = Boolean(item);
  useEffect(() => {
    if (editing) return clearPhotoChange();
    return () => setPendingPhoto(null);
  }, [editing]);

  const photoChange = usePhotoChange({
    cameraHref: item ? itemPhotoCameraPath(item.id) : "",
    editHref: item ? itemPhotoEditPath(item.id) : "",
    beforeLeave: () => savePhotoChangeDraft(draftKey, { name, description, category, quantity, acquiredNote, expiresAt, isPublic, photo } satisfies ItemDraft),
  });

  function changeQuantity(next: number) {
    if (Number.isNaN(next)) return;
    setQuantity(Math.min(ITEM_QUANTITY_MAX, Math.max(1, next)));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return setError("아이템 이름을 입력해 주세요.");
    if (!description.trim()) return setError("설명을 입력해 주세요.");
    const fields = { name, description, category: category.trim() || null, quantity, acquiredNote, expiresAt, isPublic };

    setError(undefined);
    startTransition(async () => {
      // 성공하면 서버가 다음 화면으로 보낸다. 돌아온 값이 있으면 오류다
      if (item) {
        // 사진을 바꿨으면 새 이름으로 먼저 올린다. 옛 사진은 지우지 않는다 — 지난 INMYIN 이 그 주소를 쓰고 있을 수 있다
        let newPhoto: Parameters<typeof updateItem>[2];
        if (photo) {
          const photoId = crypto.randomUUID();
          try {
            newPhoto = { photoId, ...(await uploadPhotoPair("items", photo, userId, photoId)) };
          } catch {
            setError("사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
            return;
          }
        }
        const result = await updateItem(item.id, fields, newPhoto);
        if (result?.error) setError(result.error);
        return;
      }

      if (!photo) return;
      const id = crypto.randomUUID();
      let extensions: Awaited<ReturnType<typeof uploadPhotoPair>>;
      try {
        extensions = await uploadPhotoPair("items", photo, userId, id);
      } catch {
        setError("사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const result = await createItem({ id, inventoryId: targetId, ...fields, ...extensions });
      if (!result?.error) return;
      setError(result.error);
      // 찍는 사이 다른 기기에서 채웠다 — 고를 곳으로 바로 데려간다. 사진 · 글자는 그대로 (올린 사진은 다음 시도에서 새 id 로 다시 올린다)
      if (result.reason === "full") {
        setFullIds((ids) => [...ids, targetId]);
        setSheetOpen(true);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col px-5 pb-[max(3.5rem,env(safe-area-inset-bottom))]">
      <div className="mt-8 flex flex-col gap-4">
        {/* 수정 — 맨 위 사진. 누르거나 "사진 바꾸기"로 촬영(폰) · 사진 고르기(컴퓨터) → 사진편집을 다시 거친다.
            칸과 같은 옅은 회색 바탕 · 가운데 정사각형이라 격자에서 어떻게 보일지 그대로다 */}
        {item && (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={photoChange.start}
              aria-label="사진 바꾸기"
              className="relative size-35 overflow-hidden rounded-xl bg-gray-1 active:opacity-80"
            >
              {photo ? (
                <PhotoPreview file={photo.photo} />
              ) : (
                // 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다
                <Image src={item.imageUrl} alt="" fill sizes="140px" unoptimized draggable={false} className="object-cover" />
              )}
            </button>
            <button type="button" onClick={photoChange.start} className={SMALL_OUTLINE_CLASS}>
              사진 바꾸기
            </button>
            {photo && <p className="text-caption text-placeholder-dark">수정하기를 누르면 새 사진으로 바뀌어요.</p>}
            {photoChange.fileInput}
          </div>
        )}

        {/* 넣을 곳 — 맨 위. 카테고리 칩이 인벤토리에 달려 있어서 넣을 곳이 먼저 정해져야 한다 (무늬 인벤토리고르기설계 v01 2-2) */}
        {target && (
          <div className="flex flex-col gap-2">
            <p className="text-label font-bold text-white">넣을 곳</p>
            {choices.length > 1 ? (
              <button
                ref={targetButtonRef}
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                aria-label={`넣을 곳: ${target.name}, ${target.slotCount}칸 중 ${target.usedSlots}칸 사용. 바꾸기`}
                className={`${TARGET_ROW_CLASS} text-left active:opacity-60`}
              >
                <TargetRowContent inventory={target} />
                <Icon name="chevronDown" className="ml-2 shrink-0 text-gray-mid" />
              </button>
            ) : (
              // 하나뿐이면 고를 게 없다 — 어디로 들어가는지만 알린다
              <div className={TARGET_ROW_CLASS}>
                <TargetRowContent inventory={target} />
              </div>
            )}
            {targetFull && (
              <p className="text-caption text-placeholder-dark">
                칸이 가득 찼어요 ·{" "}
                <Link href="/my/plan" className="underline underline-offset-4">
                  프리미엄으로 늘리기
                </Link>
              </p>
            )}
          </div>
        )}

        <DarkInput
          label="아이템 이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={ITEM_NAME_MAX}
          placeholder="아이템 이름을 입력해 주세요.*"
          autoComplete="off"
        />

        <DarkTextarea
          label="설명"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={ITEM_DESCRIPTION_MAX}
          placeholder="아이템을 소개해 주세요.*"
        />

        <div className="flex flex-col gap-2.5">
          {/* 자유 태그 — 화면 이름은 "태그"("카테고리"는 인벤토리의 고정 8개). 칩을 눌러 고르거나, 없는 태그는 직접 쓴다. 직접 쓴 것은 저장할 때 이 인벤토리의 태그에도 더해진다 */}
          <DarkInput
            label="태그"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            maxLength={MAX_CATEGORY_LENGTH}
            placeholder="태그를 추가 하시겠습니까?"
            autoComplete="off"
          />
          {categories.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {categories.map((tag) => {
                const selected = tag === category.trim();
                return (
                  <li key={tag}>
                    <CategoryTag size="sm" label={tag} selected={selected} onClick={() => setCategory(selected ? "" : tag)} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DarkInput
          label="개수"
          layout="inline"
          value={quantity}
          onChange={(event) => changeQuantity(Number(event.target.value.replace(/\D/g, "") || "1"))}
          inputMode="numeric"
          autoComplete="off"
          trailing={
            <div className="flex flex-col gap-1.75 text-gray-mid">
              <button type="button" aria-label="개수 늘리기" onClick={() => changeQuantity(quantity + 1)} className="active:opacity-60">
                <Icon name="stepUp" />
              </button>
              <button type="button" aria-label="개수 줄이기" onClick={() => changeQuantity(quantity - 1)} className="active:opacity-60">
                <Icon name="stepDown" />
              </button>
            </div>
          }
        />

        {/* 날짜를 골라도 되고 "20살 생일"처럼 써도 된다. 달력으로 고르면 26.09.22 꼴로 채워진다.
            안내 글자에 예시("20살 생일")를 쓰면 이미 적힌 값처럼 보여서, 다른 칸들처럼 "입력해 주세요"로 적는다 */}
        <DarkInput
          label="획득날짜"
          layout="inline"
          value={acquiredNote}
          onChange={(event) => setAcquiredNote(event.target.value)}
          maxLength={ACQUIRED_NOTE_MAX}
          placeholder="획득날짜를 입력해 주세요."
          autoComplete="off"
          trailing={<DatePickerButton label="획득날짜를 달력에서 고르기" onPick={(date) => setAcquiredNote(formatShortDate(date))} />}
        />

        {/* 아이폰 달력의 "재설정"은 처음 열었을 때의 날짜로 돌아갈 뿐 비워 주지는 않는다.
            실수로 골랐을 때 "없음"으로 돌아갈 길이 필요해서, 날짜가 있으면 × 를 둔다.
            날짜 칸이 입력칸 전체를 덮고 있어서(cover="field") × 는 그 위(z-10)에 올려야 눌린다 */}
        <DarkInput
          label="유통기한"
          layout="inline"
          value={expiresAt ? formatShortDate(expiresAt) : ""}
          readOnly
          placeholder="날짜를 골라 주세요."
          trailing={
            <>
              {expiresAt && (
                <button
                  type="button"
                  onClick={() => setExpiresAt("")}
                  aria-label="유통기한 없애기"
                  className="relative z-10 -my-2 text-gray-mid active:opacity-60"
                >
                  <Icon name="close24" scale={0.75} />
                </button>
              )}
              <span className="text-caption font-bold text-white">까지</span>
              <DatePickerButton label="유통기한을 달력에서 고르기" value={expiresAt} onPick={setExpiresAt} cover="field" />
            </>
          }
        />

        {/* 아이템 상세(M-14)는 적힌 것만 보여준다. 비워 둬도 된다는 것을 알려준다 */}
        <p className="text-caption text-placeholder-dark">획득날짜와 유통기한은 비워 두면 아이템 상세에 나오지 않아요.</p>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-label font-bold text-white">공개</p>
            <p className="text-caption text-white">다른사람도 볼 수 있어요.</p>
          </div>
          <Switch checked={isPublic} onChange={setIsPublic} label="공개" />
        </div>

        <FormError message={error} />
      </div>

      <Button type="submit" size="pill" disabled={pending || (!item && (!photo || targetFull))} className="mx-auto mt-10">
        {item ? (pending ? "수정 중…" : "수정하기") : pending ? "저장 중…" : "저장하기"}
      </Button>

      {sheetOpen && (
        <InventoryTargetSheet
          inventories={choices}
          selectedId={targetId}
          onPick={(inventory) => {
            // 칩은 새 인벤토리의 태그로 바뀌고, 태그 입력칸의 글자는 그대로 둔다 — 저장하면 새 인벤토리 태그에 더해진다 (설계서 2-4)
            setTargetId(inventory.id);
            setSheetOpen(false);
            targetButtonRef.current?.focus();
          }}
          onClose={() => {
            setSheetOpen(false);
            targetButtonRef.current?.focus();
          }}
        />
      )}
    </form>
  );
}

// 넣을 곳 줄의 틀 — 입력칸(DarkInput)과 같은 높이 · 바탕 · 여백
const TARGET_ROW_CLASS = "flex h-12.5 w-full items-center rounded-md bg-field-dark pl-4 pr-3";

// 넣을 곳 줄 안 — 사진 32 · 이름 · 12/25 (이번 아이템을 더하기 전). 담긴 곳은 적지 않는다(판에서 본다)
function TargetRowContent({ inventory }: { inventory: InventoryChoice }) {
  return (
    <>
      <span className="relative size-8 shrink-0 overflow-hidden rounded-sm bg-gray-mid">
        {inventory.imageUrl && (
          // 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다
          <Image src={inventory.imageUrl} alt="" fill sizes="32px" unoptimized draggable={false} className="object-cover" />
        )}
      </span>
      <span className="ml-3 min-w-0 flex-1 truncate text-body font-bold text-white">{inventory.name}</span>
      <span className="num ml-3 shrink-0 text-caption text-gray-mid">
        {inventory.usedSlots}/{inventory.slotCount}
      </span>
    </>
  );
}

type DatePickerButtonProps = {
  label: string;
  // 지금 골라져 있는 날짜 ("2026-09-22"). 달력이 그 날에서 열린다
  value?: string;
  // 고르면 "2026-09-22" 꼴로 알려준다. 지우면 빈 글자
  onPick: (date: string) => void;
  // 어디를 눌러야 달력이 열리는지. icon = 달력 아이콘만, field = 입력칸 전체 (날짜만 받는 칸)
  cover?: "icon" | "field";
};

// 달력 아이콘. 누르면 휴대폰 · 브라우저가 가진 기본 달력이 열린다.
// 아이폰은 손가락이 날짜 칸을 **직접** 눌러야만 달력을 띄운다 — 다른 버튼이 코드로 대신 열어 줄 수 없다.
// 그래서 투명한 날짜 칸을 아이콘(또는 입력칸 전체) 위에 올려 두고, 손가락이 그것을 누르게 한다
function DatePickerButton({ label, value = "", onPick, cover = "icon" }: DatePickerButtonProps) {
  return (
    // field 일 때는 자리를 잡지 않는다(relative 가 아니다) — 그러면 날짜 칸이 바깥의 입력칸 전체를 덮는다
    <span className={`flex shrink-0 text-gray-mid ${cover === "icon" ? "relative" : ""}`}>
      <Icon name="calendar" />
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(event) => onPick(event.target.value)}
        // 데스크톱 브라우저는 날짜 칸을 눌러도 달력이 바로 열리지 않아서 직접 열어 준다. 아이폰에서는 필요 없고, 막혀 있으면 조용히 넘어간다
        onClick={(event) => {
          try {
            event.currentTarget.showPicker();
          } catch {}
        }}
        // 아이콘은 작아서(26 × 22) 누르는 자리를 사방으로 넓힌다
        className={`absolute cursor-pointer opacity-0 ${cover === "icon" ? "-inset-3" : "inset-0 size-full"}`}
      />
    </span>
  );
}
