"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateItem } from "@/app/(flow)/items/[itemId]/actions";
import { createItem } from "@/app/(flow)/my/inventories/[id]/items/new/actions";
import { Button } from "@/components/ui/Button";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { DarkInput, DarkTextarea } from "@/components/ui/DarkInput";
import { FormError } from "@/components/ui/FormError";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import { MAX_CATEGORY_LENGTH } from "@/lib/categories";
import { getPendingPhoto, setPendingPhoto } from "@/lib/image/pending-photo";
import { uploadPhotoPair } from "@/lib/image/upload";
import { inventoryPath } from "@/lib/inventory/paths";
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
  inventoryId: string;
  // 이 인벤토리에 달린 태그. 칩으로 보여주고 하나를 고른다
  categories: string[];
  // 수정할 때만 준다. 그 값으로 채워서 열고, 사진은 받지 않는다 — 글자 정보만 고친다
  item?: ItemDetail;
};

// M-08 · 아이템 정보 입력. 사진은 앞 단계에서 이미 골랐고, 여기서는 글자 정보만 받는다.
// 아이템 수정도 같은 폼이다.
export function ItemForm({ userId, inventoryId, categories, item }: ItemFormProps) {
  const router = useRouter();
  const [photo] = useState(getPendingPhoto);
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [acquiredNote, setAcquiredNote] = useState(item?.acquiredNote ?? "");
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt ?? "");
  const [isPublic, setIsPublic] = useState(item?.isPublic ?? true);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // 사진 없이는 등록할 수 없다. 새로고침으로 사진을 잃었으면 인벤토리로 돌아가 + 부터 다시 한다
  useEffect(() => {
    if (!item && !photo) router.replace(inventoryPath(inventoryId));
  }, [item, photo, router, inventoryId]);

  // 화면을 떠나면 보관함을 비운다. 사진은 이미 위의 photo 가 들고 있다
  useEffect(() => () => setPendingPhoto(null), []);

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
        const result = await updateItem(item.id, fields);
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

      const result = await createItem({ id, inventoryId, ...fields, ...extensions });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col px-6 pb-[max(3.5rem,env(safe-area-inset-bottom))]">
      <div className="mt-8 flex flex-col gap-4">
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
          {/* 칩을 눌러 고르거나, 없는 카테고리는 직접 쓴다. 직접 쓴 것은 저장할 때 이 인벤토리의 태그에도 더해진다 */}
          <DarkInput
            label="카테고리"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            maxLength={MAX_CATEGORY_LENGTH}
            placeholder="카테고리를 추가 하시겠습니까?"
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

        <DarkInput
          label="유통기한"
          layout="inline"
          value={expiresAt ? formatShortDate(expiresAt) : ""}
          readOnly
          placeholder="날짜를 골라 주세요."
          trailing={
            <>
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

      <Button type="submit" size="pill" disabled={pending || (!item && !photo)} className="mx-auto mt-10">
        {item ? (pending ? "수정 중…" : "수정하기") : pending ? "저장 중…" : "저장하기"}
      </Button>
    </form>
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
