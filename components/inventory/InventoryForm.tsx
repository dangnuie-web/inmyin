"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { createInventory } from "@/app/(flow)/my/inventories/new/actions";
import { Button } from "@/components/ui/Button";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { DarkDropdown, DarkDropdownOption, DarkInput } from "@/components/ui/DarkInput";
import { FormError } from "@/components/ui/FormError";
import { Icon } from "@/components/ui/Icon";
import { MAX_CATEGORY_LENGTH, RECOMMENDED_INVENTORIES } from "@/lib/categories";
import { getPendingPhoto, pickedPhoto, setPendingPhoto } from "@/lib/image/pending-photo";
import { uploadPhotoPair } from "@/lib/image/upload";
import { categoryError, INVENTORY_NAME_MAX } from "@/lib/inventory/rules";

type OpenDropdown = "name" | "category" | null;

// 인벤토리 정보 입력. 사진 · 이름 · 카테고리 태그를 받아 저장한다.
export function InventoryForm({ userId }: { userId: string }) {
  // 목록에서 고르거나 촬영 화면에서 찍은 사진을 이어받는다. 사진은 필수다 — 새로고침해서 비어 있으면 여기서 다시 골라야 저장된다
  const [photo, setPhoto] = useState(getPendingPhoto);
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  // 마지막으로 고른 추천의 기본 태그. 지운 태그를 드롭다운에서 다시 달 수 있게 기억해 둔다
  const [recommendedTags, setRecommendedTags] = useState<readonly string[]>([]);
  const [open, setOpen] = useState<OpenDropdown>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const photoRef = useRef<HTMLInputElement>(null);

  // 화면을 떠나면 보관함을 비운다. 사진은 이미 위의 photo 가 들고 있다
  useEffect(() => () => setPendingPhoto(null), []);

  const tagOptions = recommendedTags.filter((tag) => !tags.includes(tag));

  // 추천은 글자를 채워주는 지름길일 뿐이다. 고른 뒤에는 이름도 태그도 자유롭게 고친다
  function pickRecommendation(recommendation: (typeof RECOMMENDED_INVENTORIES)[number]) {
    setName(recommendation.name);
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
    if (!photo) {
      setError("사진을 추가해 주세요.");
      return;
    }
    if (!name.trim()) {
      setError("인벤토리 이름을 입력해 주세요.");
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
      const id = crypto.randomUUID();
      let imageExtension: string;
      try {
        imageExtension = await uploadPhotoPair("inventories", photo, userId, id);
      } catch {
        setError("사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      // 성공하면 서버가 목록으로 보낸다. 돌아온 값이 있으면 오류다
      const result = await createInventory({ id, name, categories, imageExtension });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col px-6 pb-[max(3.5rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={() => photoRef.current?.click()}
        aria-label={photo ? "사진 바꾸기" : "사진 추가"}
        className="relative mt-10.5 flex aspect-357/341 w-full items-center justify-center overflow-hidden rounded-xl bg-field-dark text-placeholder-dark"
      >
        {photo ? (
          <PhotoPreview file={photo.photo} />
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

        <DarkInput
          label="카테고리"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onDraftKeyDown}
          maxLength={MAX_CATEGORY_LENGTH}
          placeholder="카테고리를 추가 하시겠습니까?"
          autoComplete="off"
          enterKeyHint="done"
          trailing={
            draft.trim() ? (
              <button type="button" onClick={() => addTag(draft)} className="px-1 text-label font-semibold text-white">
                추가
              </button>
            ) : (
              <DropdownToggle
                label="추천 카테고리"
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
          <ul className="flex flex-wrap gap-2.5">
            {tags.map((tag) => (
              <li key={tag}>
                <CategoryTag label={tag} onRemove={() => setTags(tags.filter((other) => other !== tag))} />
              </li>
            ))}
          </ul>
        )}

        <FormError message={error} />
      </div>

      <Button type="submit" size="pill" disabled={pending} className="mx-auto mt-auto">
        {pending ? "저장 중…" : "저장하기"}
      </Button>
    </form>
  );
}

// 방금 고른 파일을 브라우저 안에서 바로 보여준다.
// 파일에 임시 주소를 붙여 img 에 꽂고, 다 쓰면 주소를 돌려준다 — 안 돌려주면 메모리가 샌다
function PhotoPreview({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (imageRef.current) imageRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // 서버를 거치지 않는 임시 주소라 Next 의 Image 를 쓸 수 없다
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={imageRef} alt="" className="absolute inset-0 size-full object-cover" />;
}

function DropdownToggle({ label, isOpen, onClick }: { label: string; isOpen: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-expanded={isOpen} className="shrink-0 active:opacity-60">
      <Icon name="dropdown" className={isOpen ? "rotate-180" : ""} />
    </button>
  );
}
