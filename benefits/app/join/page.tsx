import JoinGroupForm from "@/components/JoinGroupForm";
import { requireProfile } from "@/lib/session";

export default async function JoinPage() {
  await requireProfile("/join");

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-2xl font-bold">הצטרפו לקבוצה</h1>
      <p className="mt-2 text-sm text-ink-muted">
        הזינו את קוד ההזמנה שקיבלתם מחבר בקבוצה.
      </p>

      <JoinGroupForm />
    </main>
  );
}
