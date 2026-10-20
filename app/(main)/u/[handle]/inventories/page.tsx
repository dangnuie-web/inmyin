import { redirect } from "next/navigation";
import { profilePath } from "@/lib/profile/paths";

// 옛 H-07(타유저의 인벤토리 목록) 주소. 목록 대신 프로필 첫 화면이 띠 + 격자로 인벤토리를 보여준다 (무늬 빈화면프로필설계 v01) —
// 예전에 공유한 링크가 그리로 가게 남겨 둔다
export default async function OtherInventoriesPage(props: PageProps<"/u/[handle]/inventories">) {
  const { handle } = await props.params;
  redirect(profilePath(handle));
}
