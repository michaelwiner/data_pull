import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/format";
import type { Program } from "@/lib/types";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireProfile(`/g/${id}/members`);
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound();

  // RLS scopes both of these to the group: profiles are visible because of the
  // shared group, and memberships along with them.
  const [{ data: members }, { data: programs }] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, role, profiles!inner(id, display_name, avatar_url)")
      .eq("group_id", id),
    supabase
      .from("programs")
      .select("id, slug, name_he, category, emoji, color, join_url, terms_url, notes_he")
      .order("sort_order"),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  const { data: memberships } = await supabase
    .from("memberships")
    .select("user_id, program_id")
    .in("user_id", memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"]);

  const held = new Set((memberships ?? []).map((m) => `${m.user_id}:${m.program_id}`));

  const people = (members ?? []).map((m) => {
    const linked = m.profiles as unknown as { id: string; display_name: string };
    return { id: linked.id, name: linked.display_name };
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5">
      <Link href={`/g/${id}`} className="text-sm text-brand-600 underline">
        → חזרה להטבות
      </Link>

      <h1 className="mt-3 text-2xl font-bold">מי חבר במה</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {group.name} · <bdi>{people.length}</bdi> חברים
      </p>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="p-3 text-start font-semibold">מועדון</th>
              {people.map((person) => (
                <th key={person.id} className="p-3 text-center font-semibold">
                  <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-brand-100 text-[11px] text-brand-700">
                    {initials(person.name)}
                  </span>
                  <span className="mt-1 block max-w-[5rem] truncate text-xs font-normal text-ink-muted">
                    {person.name}
                    {person.id === profile.id && " (אתם)"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(programs ?? []).map((program: Program) => {
              const holders = people.filter((p) => held.has(`${p.id}:${program.id}`));
              return (
                <tr key={program.id} className="border-b border-line last:border-0">
                  <td className="p-3">
                    <span className="flex items-center gap-2">
                      <span aria-hidden>{program.emoji}</span>
                      <span className={holders.length === 0 ? "text-ink-faint" : "font-medium"}>
                        {program.name_he}
                      </span>
                    </span>
                  </td>
                  {people.map((person) => (
                    <td key={person.id} className="p-3 text-center">
                      {held.has(`${person.id}:${program.id}`) ? (
                        <span className="text-emerald-600" title="חבר">
                          ✓
                        </span>
                      ) : (
                        <span className="text-ink-faint" aria-label="לא חבר">
                          ·
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        שורה בלי אף סימון היא הזדמנות — אם אחד מכם יצטרף, כל הקבוצה תרוויח.
      </p>

      <Link href="/onboarding" className="btn-ghost mt-5 w-full">
        עדכנו את המועדונים שלכם
      </Link>
    </main>
  );
}
