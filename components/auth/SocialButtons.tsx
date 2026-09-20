import Image from "next/image";
import { signInWithProvider } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";

const PROVIDERS = [
  { id: "google", label: "Google로 로그인", variant: "outline" },
  { id: "kakao", label: "Kakao로 로그인", variant: "kakao" },
] as const;

// 구글·카카오 로그인 버튼. 어느 버튼을 눌렀는지는 name="provider" 값으로 서버에 전달된다.
export function SocialButtons() {
  return (
    <form action={signInWithProvider} className="flex flex-col gap-7">
      {PROVIDERS.map((provider) => (
        <Button
          key={provider.id}
          type="submit"
          name="provider"
          value={provider.id}
          variant={provider.variant}
          className="relative"
        >
          {/* 로고는 왼쪽 끝에 고정하고 글자는 버튼 가운데에 둔다 */}
          <Image
            src={`/icons/${provider.id}.svg`}
            alt=""
            width={24}
            height={24}
            className="absolute left-4"
          />
          <span className="text-ink-muted">{provider.label}</span>
        </Button>
      ))}
    </form>
  );
}
