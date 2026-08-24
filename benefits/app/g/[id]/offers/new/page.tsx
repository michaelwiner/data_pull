import Link from "next/link";
import { notFound } from "next/navigation";
import NewOfferForm from "@/components/NewOfferForm";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Program } from "@/lib/types";

export default async function NewOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProfile(`/g/${id}/offers/new`);
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound();

  const { data: programs } = await supabase
    .from("programs")
    .select("id, slug, name_he, category, emoji, color, join_url, terms_url, notes_he")
    .order("sort_order");

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link href={`/g/${id}`} className="text-sm text-brand-600 underline">
        → חזרה להטבות
      </Link>

      <h1 className="mt-3 text-2xl font-bold">הוסיפו הטבה</h1>
      <p className="mt-2 text-sm text-ink-muted">
        ראיתם הטבה באפליקציה של המועדון? הוסיפו אותה ל{group.name} כדי שכולם ידעו.
      </p>

      <NewOfferForm groupId={group.id} programs={(programs ?? []) as Program[]} />
    </main>
  );
}
