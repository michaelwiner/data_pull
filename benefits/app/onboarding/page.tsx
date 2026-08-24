import { redirect } from "next/navigation";
import OnboardingForm from "@/components/OnboardingForm";
import { createClient } from "@/lib/supabase/server";
import type { Program } from "@/lib/types";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: programs }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, phone_e164, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("programs")
      .select("id, slug, name_he, category, emoji, color, join_url, terms_url, notes_he")
      .order("sort_order"),
    supabase.from("memberships").select("program_id").eq("user_id", user.id),
  ]);

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-2xl font-bold">קצת עליכם</h1>
      <p className="mt-2 text-sm text-ink-muted">
        השם והטלפון משמשים רק כדי שחברי הקבוצה שלכם יוכלו לפנות אליכם בווטסאפ.
      </p>

      <OnboardingForm
        programs={(programs ?? []) as Program[]}
        initialName={profile?.display_name ?? ""}
        initialPhone={profile?.phone_e164 ?? ""}
        initialProgramIds={(memberships ?? []).map((m) => m.program_id as string)}
        next={next ?? ""}
      />
    </main>
  );
}
