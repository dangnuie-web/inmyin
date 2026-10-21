"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import { updateInventory } from "@/app/(flow)/my/inventories/[id]/actions";
import { createInventory } from "@/app/(flow)/my/inventories/new/actions";
import { usePhotoChange } from "@/components/item/usePhotoChange";
import { SMALL_OUTLINE_CLASS } from "@/components/profile/ProfileParts";
import { Button } from "@/components/ui/Button";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { DarkDropdown, DarkDropdownOption, DarkInput, DarkSelect } from "@/components/ui/DarkInput";
import { FormError } from "@/components/ui/FormError";
import { Icon } from "@/components/ui/Icon";
import { PhotoPreview } from "@/components/ui/PhotoPreview";
import { Switch } from "@/components/ui/Switch";
import { FIXED_CATEGORIES, isFixedCategory, MAX_CATEGORY_LENGTH, RECOMMENDED_INVENTORIES, type FixedCategory } from "@/lib/categories";
import {
  clearPhotoChange,
  getPendingPhoto,
  peekEditedPhoto,
  peekPhotoChangeDraft,
  pickedPhoto,
  savePhotoChangeDraft,
  setPendingPhoto,
  type PendingPhoto,
} from "@/lib/image/pending-photo";
import { uploadPhotoPair } from "@/lib/image/upload";
import { inventoryPhotoCameraPath, inventoryPhotoEditPath } from "@/lib/inventory/paths";
import { categoryError, INVENTORY_NAME_MAX } from "@/lib/inventory/rules";

type OpenDropdown = "name" | "fixed" | "category" | null;

type InventoryFormProps = {
  userId: string;
  // 수정할 때만 준다. 그 값으로 채워서 연다. 사진을 누르거나 "사진 바꾸기"로 촬영 → 사진편집을 다시 거쳐 돌아온다
  inventory?: { id: string; name: string; category: string | null; categories: string[]; imageUrl: string; isPublic: boolean };
  // 수정 — 저장 뒤 돌아갈 곳(프로필 안내 줄 "고르기"에서 왔으면 그 인벤토리). 없으면 인벤토리 관리. 사진 바꾸기에도 실어 보낸다
  returnTo?: string | null;
};

// 사진 바꾸러 떠날 때 맡겨 두는 수정 화면의 값 (lib/image/pending-photo.ts)
type InventoryDraft = {
  name: string;
  category: FixedCategory | null;
  tags: string[];
  isPublic: boolean;
  // 카테고리 입력칸에 쓰다 만 글자
  draft: string;
  // 이미 한 번 바꿔 둔 새 사진. 또 바꾸러 갔다가 닫고 오면 이것으로 돌아온다
  photo: PendingPhoto | null;
};

// 인벤토리 정보 입력. 사진 · 이름 · 카테고리(고정 8개 중 하나, 홈 · 발견 칩) · 태그(자유)를 받아 저장한다. 인벤토리 수정도 같은 폼이다.
export function InventoryForm({ userId, inventory, returnTo = null }: InventoryFormProps) {
  const draftKey = inventory ? `inventory:${inventory.id}` : "";
  // 수정 — 사진 바꾸기에서 돌아왔으면 떠나기 전 값. 새로 열었으면 null
  const [restored] = useState(() => (inventory ? peekPhotoChangeDraft<InventoryDraft>(draftKey) : null));
  // 새로 만들 때 — 목록에서 고르거나 촬영 화면에서 찍은 사진을 이어받는다. 사진은 필수다 — 새로고침해서 비어 있으면 여기서 다시 골라야 저장된다.
  // 수정할 때 — 바꿀 새 사진 (null 이면 지금 사진 그대로). 사진편집에서 저장하기로 왔으면 그 사진, 닫고 왔으면 떠나기 전 그대로
  const [photo, setPhoto] = useState(() =>
    inventory ? (restored ? (peekEditedPhoto() ?? restored.photo) : null) : getPendingPhoto(),
  );
  const [name, setName] = useState(restored?.name ?? inventory?.name ?? "");
  // 고정 카테고리. 만들 때는 꼭 고른다. 기존 인벤토리는 비어 있을 수 있다 — 수정에서 고르게 안내한다
  const [category, setCategory] = useState<FixedCategory | null>(() => {
    const value = restored ? restored.category : inventory?.category;
    return isFixedCategory(value) ? value : null;
  });
  const [tags, setTags] = useState<string[]>(restored?.tags ?? inventory?.categories ?? []);
  const [isPublic, setIsPublic] = useState(restored?.isPublic ?? inventory?.isPublic ?? true);
  const [draft, setDraft] = useState(restored?.draft ?? "");
  // 마지막으로 고른 추천의 기본 태그. 지운 태그를 드롭다운에서 다시 달 수 있게 기억해 둔다
  const [recommendedTags, setRecommendedTags] = useState<readonly string[]>([]);
  const [open, setOpen] = useState<OpenDropdown>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const photoRef = useRef<HTMLInputElement>(null);

  // 새로 만들 때 — 화면을 떠나면 보관함을 비운다. 사진은 이미 위의 photo 가 들고 있다.
  // 수정할 때 — 열리자마자 맡긴 값 · 보관함을 비운다(위에서 다 읽었다). 떠날 때는 비우지 않는다 — 컴퓨터에서 사진을 고르면
  // 보관함에 넣고 바로 사진편집으로 가는데, 그 뒤에 이 화면이 닫힌다
  const editing = Boolean(inventory);
  useEffect(() => {
    if (editing) return clearPhotoChange();
    return () => setPendingPhoto(null);
  }, [editing]);

  const photoChange = usePhotoChange({
    cameraHref: inventory ? inventoryPhotoCameraPath(inventory.id, returnTo) : "",
    editHref: inventory ? inventoryPhotoEditPath(inventory.id, returnTo) : "",
    beforeLeave: () => savePhotoChangeDraft(draftKey, { name, category, tags, isPublic, draft, photo } satisfies InventoryDraft),
  });

  const tagOptions = recommendedTags.filter((tag) => !tags.includes(tag));

  // 추천은 이름 · 카테고리 · 태그를 채워주는 지름길일 뿐이다. 고른 뒤에는 모두 자유롭게 고친다
  function pickRecommendation(recommendation: (typeof RECOMMENDED_INVENTORIES)[number]) {
    setName(recommendation.name);
    setCategory(recommendation.category);
    setTags([...recommendation.categories]);
    setRecommendedTags(recommendation.categories);
    setOpen(null);
    setError(undefined);
  }

  // 태그를 더한다. 못 더하면 이유를 보여주고 false
  function addTag(value: string, current = tags) {
    const tag = value.trim();
    const message = categoryError(tag, current);
    if (message) {
      setError(message);
      return false;
    }
    setTags([...current, tag]);
    setDraft("");
    setError(undefined);
    return true;
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    // 엔터가 폼 저장으로 넘어가지 않게 막는다
    event.preventDefault();
    // 한글은 글자를 조합하는 중에도 엔터가 한 번 더 들어온다. 그건 무시한다
    if (event.nativeEvent.isComposing) return;
    if (draft.trim()) addTag(draft);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inventory && !photo) {
      setError("사진을 추가해 주세요.");
      return;
    }
    if (!name.trim()) {
      setError("인벤토리 이름을 입력해 주세요.");
      return;
    }
    // 만들 때만 꼭 고른다. 기존 인벤토리(비어 있음)는 수정에서 안 골라도 저장된다 — 이름만 고치러 온 걸 막지 않는다
    if (!inventory && !category) {
      setError("카테고리를 골라 주세요.");
      setOpen("fixed");
      return;
    }
    // 입력칸에 쓰다 만 태그가 있으면 같이 저장한다 — 추가를 안 누르고 저장하는 일이 흔하다
    let categories = tags;
    if (draft.trim()) {
      if (!addTag(draft)) return;
      categories = [...tags, draft.trim()];
    }

    setError(undefined);
    startTransition(async () => {
      // 성공하면 서버가 보낸다 — 새 인벤토리는 그 인벤토리의 프로필 격자로, 수정은 온 곳(returnTo) 또는 인벤토리 관리로. 돌아온 값이 있으면 오류다
      if (inventory) {
        // 사진을 바꿨으면 새 이름으로 먼저 올린다. 옛 사진은 지우지 않는다(저장소에 지우는 권한이 없다)
        let newPhoto: Parameters<typeof updateInventory>[2];
        if (photo) {
          const photoId = crypto.randomUUID();
          try {
            newPhoto = { photoId, ...(await uploadPhotoPair("inventories", photo, userId, photoId)) };
          } catch {
            setError("사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
            return;
          }
        }
        const result = await updateInventory(inventory.id, { name, category, categories, isPublic }, newPhoto, returnTo);
        if (result?.error) setError(result.error);
        return;
      }

      if (!photo) return;
      const id = crypto.randomUUID();
      let extensions: Awaited<ReturnType<typeof uploadPhotoPair>>;
      try {
        extensions = await uploadPhotoPair("inventories", photo, userId, id);
      } catch {
        setError("사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const result = await createInventory({ id, name, category, categories, isPublic, ...extensions });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col px-5 pb-[max(3.5rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        // 수정할 때는 촬영(폰) · 사진 고르기(컴퓨터) → 사진편집을 다시 거친다. 만들 때는 여기서 바로 고른다(새로고침으로 사진을 잃었을 때)
        onClick={() => (inventory ? photoChange.start() : photoRef.current?.click())}
        aria-label={photo || inventory ? "사진 바꾸기" : "사진 추가"}
        className="relative mt-10.5 flex aspect-357/341 w-full items-center justify-center overflow-hidden rounded-xl bg-field-dark text-placeholder-dark active:opacity-80"
      >
        {photo ? (
          <PhotoPreview file={photo.photo} />
        ) : inventory ? (
          // 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다
          <Image src={inventory.imageUrl} alt="" fill sizes="(min-width: 448px) 400px, 90vw" unoptimized className="object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-3 text-caption">
            <Icon name="plus" />
            사진 추가
          </span>
        )}
      </button>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setPhoto(pickedPhoto(file));
        }}
      />
      {inventory && (
        <div className="mt-3 flex flex-col items-center gap-3">
          <button type="button" onClick={photoChange.start} className={SMALL_OUTLINE_CLASS}>
            사진 바꾸기
          </button>
          {photo && <p className="text-caption text-placeholder-dark">수정하기를 누르면 새 사진으로 바뀌어요.</p>}
          {photoChange.fileInput}
        </div>
      )}

      <div className="mt-10 flex flex-col gap-4">
        <DarkInput
          label="인벤토리 이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={INVENTORY_NAME_MAX}
          placeholder="인벤토리 이름을 입력해 주세요.*"
          autoComplete="off"
          trailing={
            <DropdownToggle label="추천 이름" isOpen={open === "name"} onClick={() => setOpen(open === "name" ? null : "name")} />
          }
          dropdown={
            open === "name" && (
              <DarkDropdown>
                {RECOMMENDED_INVENTORIES.map((recommendation) => (
                  <DarkDropdownOption key={recommendation.name} onSelect={() => pickRecommendation(recommendation)}>
                    {recommendation.name}
                  </DarkDropdownOption>
                ))}
              </DarkDropdown>
            )
          }
        />

        {/* 고정 카테고리 — 글자를 쓰는 칸이 아니라 고르는 칸. 같은 틀(DarkSelect) · 같은 목록(DarkDropdown) */}
        <DarkSelect
          label="카테고리"
          value={category}
          placeholder={inventory ? "홈 · 발견에서 찾을 수 있게 골라 주세요." : "카테고리를 골라 주세요.*"}
          isOpen={open === "fixed"}
          onToggle={() => setOpen(open === "fixed" ? null : "fixed")}
          dropdown={
            <DarkDropdown>
              {FIXED_CATEGORIES.map((option) => (
                <DarkDropdownOption
                  key={option}
                  selected={option === category}
                  onSelect={() => {
                    setCategory(option);
                    setOpen(null);
                    setError(undefined);
                  }}
                >
                  {option}
                </DarkDropdownOption>
              ))}
            </DarkDropdown>
          }
        />

        <DarkInput
          label="태그"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onDraftKeyDown}
          maxLength={MAX_CATEGORY_LENGTH}
          placeholder="태그를 추가 하시겠습니까?"
          autoComplete="off"
          enterKeyHint="done"
          trailing={
            draft.trim() ? (
              <button type="button" onClick={() => addTag(draft)} className="px-1 text-label font-semibold text-white">
                추가
              </button>
            ) : (
              <DropdownToggle
                label="추천 태그"
                isOpen={open === "category"}
                onClick={() => setOpen(open === "category" ? null : "category")}
              />
            )
          }
          dropdown={
            open === "category" && (
              <DarkDropdown>
                {tagOptions.length > 0 ? (
                  tagOptions.map((tag) => (
                    <DarkDropdownOption key={tag} onSelect={() => addTag(tag)}>
                      {tag}
                    </DarkDropdownOption>
                  ))
                ) : (
                  <li className="px-4 py-2 text-placeholder-dark">입력칸에 직접 써서 추가해 주세요.</li>
                )}
              </DarkDropdown>
            )
          }
        />

        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag}>
                <CategoryTag size="sm" label={tag} onRemove={() => setTags(tags.filter((other) => other !== tag))} />
              </li>
            ))}
          </ul>
        )}

        {/* 아이템의 공개 토글(M-08)과 같은 모양. 끄면 안의 아이템까지 남에게 통째로 숨는다 */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-label font-bold text-white">공개</p>
            <p className="text-caption text-white">끄면 안에 든 것까지 남에게 안 보여요.</p>
          </div>
          <Switch checked={isPublic} onChange={setIsPublic} label="공개" />
        </div>

        <FormError message={error} />
      </div>

      {/* 남는 공간만큼 아래로 내리되, 태그가 늘어 화면이 꽉 차도 위와 붙지 않게 최소 간격을 둔다 */}
      <div className="mt-auto flex justify-center pt-10">
        <Button type="submit" size="pill" disabled={pending}>
          {inventory ? (pending ? "수정 중…" : "수정하기") : pending ? "저장 중…" : "저장하기"}
        </Button>
      </div>
    </form>
  );
}

function DropdownToggle({ label, isOpen, onClick }: { label: string; isOpen: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-expanded={isOpen} className="shrink-0 active:opacity-60">
      <Icon name="dropdown" className={isOpen ? "rotate-180" : ""} />
    </button>
  );
}
