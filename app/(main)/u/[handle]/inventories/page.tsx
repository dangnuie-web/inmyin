import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InventoryRow } from "@/components/inventory/InventoryRow";
import { BackHeader } from "@/components/ui/BackHeader";
import { requireProfile } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { otherInventoryPath } from "@/lib/profile/paths";
import { getPublicProfile, getVisibleInventories } from "@/lib/profile/public-queries";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

// H-07 · 타유저의 인벤토리 목록. 내 목록(M-03)과 같은 줄이지만 밀기 · + 줄 · TOTAL 이 없다. 비공개 인벤토리는 DB 규칙이 뺀다
export default async function OtherInventoriesPage(props: PageProps<"/u/[handle]/inventories">) {
  const profile = await requireProfile();
  const { handle } = await props.params;
  if (!HANDLE_PATTERN.test(handle)) notFound();
  if (handle === profile.handle) redirect("/my/inventories");

  const person = await getPublicProfile(handle);
  if (!person) notFound();
  const inventories = await getVisibleInventories(person.id);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <BackHeader title="INVENTORY" />
      {inventories.length === 0 ? (
        <p className="mt-16 break-keep px-5 text-center text-label text-ink-muted">공개된 인벤토리가 아직 없어요.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {inventories.map((inventory) => (
            <li key={inventory.id}>
              <InventoryRow inventory={inventory} href={otherInventoryPath(handle, inventory.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
