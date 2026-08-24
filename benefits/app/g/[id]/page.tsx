import Link from "next/link";
import { notFound } from "next/navigation";
import GroupHeader from "@/components/GroupHeader";
import OfferFeed from "@/components/OfferFeed";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { OfferWithHolders, Program } from "@/lib/types";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ welcome?: string; offer?: string }>;
}) {
  const { id } = await params;
  const { welcome, offer } = await searchParams;
  const { profile } = await requireProfile(`/g/${id}`);

  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .eq("id", id)
    .maybeSingle();

  // RLS returns nothing rather than an error when the caller is not a member,
  // so an empty result here means "not yours", not "does not exist".
  if (!group) notFound();

  const [{ data: offers, error: offersError }, { data: programs }, { count: memberCount }] =
    await Promise.all([
      supabase.rpc("group_offers", { p_group_id: id }),
      supabase
        .from("programs")
        .select("id, slug, name_he, category, emoji, color, join_url, terms_url, notes_he")
        .order("sort_order"),
      supabase
        .from("group_members")
        .select("user_id", { count: "exact", head: true })
        .eq("group_id", id),
    ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-5">
      <GroupHeader
        groupId={group.id}
        groupName={group.name}
        inviteCode={group.invite_code}
        memberCount={memberCount ?? 0}
        siteUrl={siteUrl}
        showInviteBanner={welcome === "1"}
      />

      {offersError ? (
        <p className="card mt-6 p-5 text-sm text-red-600">
          לא הצלחנו לטעון את ההטבות. רעננו את הדף.
        </p>
      ) : (
        <OfferFeed
          offers={(offers ?? []) as OfferWithHolders[]}
          programs={(programs ?? []) as Program[]}
          currentUserId={profile.id}
          askerName={profile.display_name}
          groupId={group.id}
          siteUrl={siteUrl}
          highlightOfferId={offer ?? null}
        />
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
        <Link href={`/g/${group.id}/offers/new`} className="btn-ghost">
          ➕ הוסיפו הטבה
        </Link>
        <Link href={`/g/${group.id}/members`} className="btn-ghost">
          👥 מי חבר במה
        </Link>
      </div>
    </main>
  );
}
