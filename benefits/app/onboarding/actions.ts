"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeIsraeliPhone } from "@/lib/whatsapp";

export interface OnboardingState {
  error?: string;
}

export async function saveOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const displayName = String(formData.get("display_name") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "");
  const programIds = formData.getAll("program_id").map(String);
  const next = String(formData.get("next") ?? "");

  if (displayName.length < 2) {
    return { error: "צריך שם שהחברים שלכם יזהו." };
  }

  const phone = normalizeIsraeliPhone(rawPhone);
  if (!phone) {
    return { error: "מספר הטלפון לא נראה תקין. לדוגמה: 050-1234567" };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName, phone_e164: phone })
    .eq("id", user.id);

  if (profileError) {
    return { error: "לא הצלחנו לשמור את הפרטים. נסו שוב." };
  }

  // Replace the membership set wholesale: the form always submits the full
  // selection, so anything absent was deliberately unchecked.
  const { error: deleteError } = await supabase
    .from("memberships")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) {
    return { error: "לא הצלחנו לעדכן את המועדונים. נסו שוב." };
  }

  if (programIds.length > 0) {
    const { error: insertError } = await supabase.from("memberships").insert(
      programIds.map((programId) => ({ user_id: user.id, program_id: programId })),
    );
    if (insertError) {
      return { error: "לא הצלחנו לעדכן את המועדונים. נסו שוב." };
    }
  }

  revalidatePath("/", "layout");

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : null;
  redirect(safeNext ?? "/");
}
