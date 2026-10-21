"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import { updateProfile, type AvatarChange } from "@/app/(flow)/my/edit/actions";
import { PersonMark } from "@/components/profile/Avatar";
import { Button } from "@/components/ui/Button";
import { DarkMenu } from "@/components/ui/DarkMenu";
import { DarkInput } from "@/components/ui/DarkInput";
import { FormError } from "@/components/ui/FormError";
import { PhotoPreview } from "@/components/ui/PhotoPreview";
import { HANDLE_PATTERN, NICKNAME_MAX } from "@/lib/auth/rules";
import { uploadAvatar } from "@/lib/image/upload";

type ProfileFormProps = {
  userId: string;
  nickname: string;
  handle: string;
  avatarUrl: string | null;
};

// 프로필 관리. 프로필 사진 · 닉네임 · 아이디를 고친다. 다른 정보 입력 화면(M-08)과 같은 모양이다.
export function ProfileForm({ userId, avatarUrl, ...initial }: ProfileFormProps) {
  const [nickname, setNickname] = useState(initial.nickname);
  const [handle, setHandle] = useState(initial.handle);
  // 새로 고른 프로필 사진. 고르지 않았으면 지금 사진을 그대로 둔다
  const [photo, setPhoto] = useState<File | null>(null);
  // "기본 그림으로"를 골랐는지 — 수정하기를 눌러야 저장된다
  const [cleared, setCleared] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // 지금 보이는 사진이 있는지. 있으면 누를 때 "사진 바꾸기 · 기본 그림으로" 메뉴, 없으면 바로 사진 고르기
  const hasPhoto = photo !== null || (avatarUrl !== null && !cleared);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const photoRef = useRef<HTMLInputElement>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nickname.trim()) return setError("닉네임을 입력해 주세요.");
    if (!HANDLE_PATTERN.test(handle)) return setError("아이디는 영소문자·숫자·밑줄(_)로 3~30자여야 합니다.");

    setError(undefined);
    startTransition(async () => {
      let avatar: AvatarChange = cleared ? { kind: "clear" } : { kind: "keep" };
      if (photo) {
        try {
          avatar = { kind: "file", name: await uploadAvatar(photo, userId) };
        } catch {
          setError("사진을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
      }
      // 성공하면 서버가 내 프로필로 보낸다. 돌아온 값이 있으면 오류다
      const result = await updateProfile({ nickname, handle, avatar });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col px-5 pb-[max(3.5rem,env(safe-area-inset-bottom))]">
      <div className="relative mx-auto mt-10">
        <button
          type="button"
          onClick={() => (hasPhoto ? setMenuOpen(true) : photoRef.current?.click())}
          aria-haspopup={hasPhoto ? "menu" : undefined}
          aria-expanded={hasPhoto ? menuOpen : undefined}
          className="flex flex-col items-center gap-3 active:opacity-80"
        >
          <span className="relative flex size-30 items-center justify-center overflow-hidden rounded-full bg-field-dark text-placeholder-dark">
            {photo ? (
              <PhotoPreview file={photo} />
            ) : avatarUrl && !cleared ? (
              <Image src={avatarUrl} alt="" fill sizes="120px" unoptimized className="object-cover" />
            ) : (
              <PersonMark size={120} />
            )}
          </span>
          <span className="text-caption text-placeholder-dark">{hasPhoto ? "사진 바꾸기" : "사진 추가"}</span>
        </button>
        {/* 사진이 있을 때만 — 다른 화면의 + 메뉴와 같은 검은 메뉴. 글자 줄 바로 아래 가운데 */}
        {menuOpen && (
          <DarkMenu
            className="left-1/2 top-full mt-2 -translate-x-1/2"
            onClose={() => setMenuOpen(false)}
            items={[
              { label: "사진 바꾸기", onSelect: () => photoRef.current?.click() },
              {
                label: "기본 그림으로",
                onSelect: () => {
                  setPhoto(null);
                  setCleared(true);
                },
              },
            ]}
          />
        )}
      </div>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            setPhoto(file);
            setCleared(false);
          }
          // 같은 파일을 다시 골라도 바뀌게
          event.target.value = "";
        }}
      />

      <div className="mt-10 flex flex-col gap-4">
        <DarkInput
          label="닉네임"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={NICKNAME_MAX}
          placeholder="닉네임을 입력해 주세요.*"
          autoComplete="off"
        />
        <div className="flex flex-col gap-2">
          <DarkInput
            label="아이디"
            value={handle}
            // 아이디는 소문자만 쓴다. 대문자로 쳐도 바로 소문자로 바꿔 준다
            onChange={(event) => setHandle(event.target.value.toLowerCase())}
            maxLength={30}
            placeholder="아이디를 입력해 주세요.*"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <p className="text-caption text-placeholder-dark">영소문자 · 숫자 · 밑줄(_)로 3~30자. 프로필 주소에 그대로 들어가요.</p>
        </div>
        <FormError message={error} />
      </div>

      {/* 남는 공간만큼 아래로 내리되, 위와 붙지 않게 최소 간격을 둔다 */}
      <div className="mt-auto flex justify-center pt-10">
        <Button type="submit" size="pill" disabled={pending}>
          {pending ? "수정 중…" : "수정하기"}
        </Button>
      </div>
    </form>
  );
}
