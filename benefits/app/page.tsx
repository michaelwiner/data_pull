import { redirect } from "next/navigation";
import SignIn from "@/components/SignIn";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone_e164")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.phone_e164) redirect("/onboarding");

    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    redirect(membership ? `/g/${membership.group_id}` : "/groups/new");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <p className="text-4xl">🎁</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight">הטבות ביחד</h1>
        <p className="mt-3 text-ink-muted">
          לכל אחד מהחברים שלכם יש מועדונים אחרים — לאומי, HOT, פיס פלוס, מילואים,
          אמריקן אקספרס. ביחד יש לכם הרבה יותר ממה שנדמה.
        </p>
      </div>

      <ul className="mb-8 space-y-3 text-sm">
        {[
          ["👥", "כל אחד מסמן באילו מועדונים הוא חבר"],
          ["🔎", "רואים את כל ההטבות של הקבוצה במקום אחד"],
          ["💬", "לוחצים — ונפתחת הודעת ווטסאפ למי שיש לו את ההטבה"],
        ].map(([emoji, text]) => (
          <li key={text} className="flex items-start gap-3">
            <span className="text-lg leading-none">{emoji}</span>
            <span className="text-ink-muted">{text}</span>
          </li>
        ))}
      </ul>

      <SignIn />

      <p className="mt-6 text-xs leading-relaxed text-ink-faint">
        חלק מהמועדונים מגבילים את ההטבות לחבר עצמו. באפליקציה מסומן מה ניתן
        להעברה ומה אישי בלבד — כדאי לבדוק את תקנון המועדון לפני שמשתפים.
      </p>
    </main>
  );
}
