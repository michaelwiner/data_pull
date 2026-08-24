import JoinGroupForm from "@/components/JoinGroupForm";
import { requireProfile } from "@/lib/session";

/**
 * Landing spot for a shared invite link. The group's name cannot be shown here:
 * RLS deliberately hides groups from people who are not members yet, so the
 * code itself is all we can display before joining.
 */
export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  await requireProfile(`/join/${code}`);

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <p className="text-4xl">👋</p>
      <h1 className="mt-3 text-2xl font-bold">הוזמנתם לקבוצה</h1>
      <p className="mt-2 text-sm text-ink-muted">
        אחרי שתצטרפו תראו את כל ההטבות של חברי הקבוצה, והם יראו את שלכם.
      </p>

      <JoinGroupForm code={decodeURIComponent(code)} />
    </main>
  );
}
