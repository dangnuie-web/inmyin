import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { toGridColumns } from "@/components/inventory/Slot";
import { ItemCollection } from "@/components/item/ItemCollection";
import { BackHeader } from "@/components/ui/BackHeader";
import { requireProfile } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { getPublicProfile, getVisibleItemCollection } from "@/lib/profile/public-queries";

export const metadata: Metadata = { title: "아이템 · INMYIN" };

// 타유저의 아이템 모아보기. 내 것(M-13)과 같은 화면이고, 보이는 아이템만 온다. 아래 숫자는 보이는 아이템 수
export default async function OtherItemsPage(props: PageProps<"/u/[handle]/items">) {
  const profile = await requireProfile();
  const { handle } = await props.params;
  if (!HANDLE_PATTERN.test(handle)) notFound();
  if (handle === profile.handle) redirect("/my/items");

  const person = await getPublicProfile(handle);
  if (!person) notFound();
  const items = await getVisibleItemCollection(person.id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <BackHeader title="아이템" />
      <ItemCollection items={items} capacity={null} columns={toGridColumns(profile.grid_columns)} emptyText="공개된 아이템이 아직 없어요." />
    </main>
  );
}
