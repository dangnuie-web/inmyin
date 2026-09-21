"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
};

// M-08 · 아이템 정보 입력. 사진은 앞 단계에서 이미 골랐고, 여기서는 글자 정보만 받는다.
export function ItemForm({ userId, inventoryId, categories }: ItemFormProps) {
  const router = useRouter();
  const [photo] = useState(getPendingPhoto);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [acquiredNote, setAcquiredNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // 사진 없이는 등록할 수 없다. 새로고침으로 사진을 잃었으면 인벤토리로 돌아가 + 부터 다시 한다
  useEffect(() => {
    if (!photo) router.replace(inventoryPath(inventoryId));
  }, [photo, router, inventoryId]);

  // 화면을 떠나면 보관함을 비운다. 사진은 이미 위의 photo 가 들고 있다
  useEffect(() => () => setPendingPhoto(null), []);

  function changeQuantity(next: number) {
    if (Number.isNaN(next)) return;
    setQuantity(Math.min(ITEM_QUANTITY_MAX, Math.max(1, next)));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) return;
    if (!name.trim()) return setError("아이템 이름을 입력해 주세요.");
    if (!description.trim()) return setError("설명을 입력해 주세요.");

    setError(undefined);
    startTransition(async () => {
      const id = crypto.randomUUID();
      let imageExtension: string;
      try {
        imageExtension = await uploadPhotoPair("items", photo, userId, id);
      } catch {
        setError("사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      // 성공하면 서버가 인벤토리로 보낸다. 돌아온 값이 있으면 오류다
      const result = await createItem({
        id,
        inventoryId,
        name,
        description,
        category: category.trim() || null,
        quantity,
        acquiredNote,
        expiresAt,
        isPublic,
        imageExtension,
      });
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

        {/* 날짜를 골라도 되고 "20살 생일"처럼 써도 된다. 달력으로 고르면 26.09.22 꼴로 채워진다 */}
        <DarkInput
          label="획득날짜"
          layout="inline"
          value={acquiredNote}
          onChange={(event) => setAcquiredNote(event.target.value)}
          maxLength={ACQUIRED_NOTE_MAX}
          placeholder="20살 생일"
          autoComplete="off"
          trailing={<DatePickerButton label="획득날짜를 달력에서 고르기" onPick={(date) => setAcquiredNote(formatShortDate(date))} />}
        />

        <DarkInput
          label="유통기한"
          layout="inline"
          value={expiresAt ? formatShortDate(expiresAt) : ""}
          readOnly
          placeholder="없음"
          trailing={
            <>
              <span className="text-caption font-bold text-white">까지</span>
              <DatePickerButton label="유통기한을 달력에서 고르기" value={expiresAt} onPick={setExpiresAt} />
            </>
          }
        />

        <div className="mt-2 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-label font-bold text-white">공개</p>
            <p className="text-caption text-white">다른사람도 볼 수 있어요.</p>
          </div>
          <Switch checked={isPublic} onChange={setIsPublic} label="공개" />
        </div>

        <FormError message={error} />
      </div>

      <Button type="submit" size="pill" disabled={pending || !photo} className="mx-auto mt-10">
        {pending ? "저장 중…" : "저장하기"}
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
};

// 달력 아이콘. 누르면 휴대폰 · 브라우저가 가진 기본 달력이 열린다
function DatePickerButton({ label, value = "", onPick }: DatePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <span className="relative flex shrink-0">
      <button
        type="button"
        aria-label={label}
        // showPicker 가 없는 오래된 브라우저에서는 입력칸을 직접 눌러 준다
        onClick={() => (inputRef.current?.showPicker ? inputRef.current.showPicker() : inputRef.current?.click())}
        className="text-gray-mid active:opacity-60"
      >
        <Icon name="calendar" />
      </button>
      {/* 달력을 띄우려면 화면에 그려져 있어야 해서, 숨기지 않고 투명하게 아이콘 밑에 깔아 둔다 */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onPick(event.target.value)}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full opacity-0"
      />
    </span>
  );
}
