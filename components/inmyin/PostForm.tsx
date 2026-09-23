"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { FormError } from "@/components/ui/FormError";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { POST_DESCRIPTION_MAX, POST_TITLE_MAX } from "@/lib/inmyin/rules";

// 이미지 위에 띄우는 아이템 라벨. 자리는 캔버스에 대한 비율(0~1)
export type PostLabel = { itemId: string; name: string; x: number; y: number; w: number; h: number };

type PostFormProps = {
  imageUrl: string;
  labels: PostLabel[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
};

// M-11 · INMYIN 포스팅. 제목(필수) · 이미지(아이템 이름 라벨) · 내용 · 등록하기.
// 피그마: 옅은 회색 바탕, 제목 줄과 내용 줄 사이에 흰 카드
export function PostForm({ imageUrl, labels, pending, error, onClose, onSubmit }: PostFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(title, description);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col bg-surface pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <HeaderMini icon="close" onClick={onClose} title="INMYIN" className="border-b border-border" />
      <form onSubmit={submit} className="flex flex-1 flex-col">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={POST_TITLE_MAX}
          placeholder="제목을 입력하세요*"
          aria-label="제목"
          required
          className="h-13 border-b border-border bg-transparent px-8 text-title font-semibold outline-none placeholder:text-gray-mid"
        />

        <div className="px-7 py-7">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gray-3 bg-white">
            <Image src={imageUrl} alt="" fill sizes="(min-width: 448px) 380px, 90vw" unoptimized className="object-contain" />
            {/* 아이템 이름 라벨 — 그 아이템의 가운데. 게시물을 보는 사람은 이 자리를 눌러 아이템으로 간다 (H-04) */}
            {labels.map((label) => (
              <span
                key={label.itemId}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-sm bg-ink/30 px-2 py-1 text-caption font-semibold text-white"
                style={{ left: `${(label.x + label.w / 2) * 100}%`, top: `${(label.y + label.h / 2) * 100}%` }}
              >
                {label.name}
              </span>
            ))}
          </div>
        </div>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={POST_DESCRIPTION_MAX}
          placeholder="간단한 내용을 입력하세요."
          aria-label="내용"
          rows={3}
          className="border-t border-border bg-transparent px-9 py-5 text-label font-semibold outline-none placeholder:text-gray-mid"
        />

        <div className="mt-auto flex flex-col items-center gap-3 px-5 pt-6">
          <FormError message={error ?? undefined} />
          <button type="submit" disabled={pending || !title.trim()} className="h-11.5 rounded-full bg-ink px-9 text-title font-bold text-white active:opacity-80 disabled:opacity-40">
            {pending ? "올리는 중…" : "등록하기"}
          </button>
        </div>
      </form>
    </main>
  );
}
