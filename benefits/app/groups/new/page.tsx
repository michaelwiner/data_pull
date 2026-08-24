import Link from "next/link";
import CreateGroupForm from "@/components/CreateGroupForm";
import { requireProfile } from "@/lib/session";

export default async function NewGroupPage() {
  await requireProfile();

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-2xl font-bold">פתחו קבוצה</h1>
      <p className="mt-2 text-sm text-ink-muted">
        קבוצה היא החברים שאיתם אתם חולקים הטבות. אחרי שתפתחו, תקבלו קישור
        להזמין אותם.
      </p>

      <CreateGroupForm />

      <p className="mt-8 text-center text-sm text-ink-muted">
        קיבלתם קישור הזמנה?{" "}
        <Link href="/join" className="font-semibold text-brand-600 underline">
          הצטרפו לקבוצה קיימת
        </Link>
      </p>
    </main>
  );
}
