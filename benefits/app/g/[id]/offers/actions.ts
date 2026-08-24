"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OfferCategory, Shareability } from "@/lib/types";

export interface OfferFormState {
  error?: string;
}

const CATEGORIES: OfferCategory[] = [
  "culture", "food", "travel", "fashion", "electronics", "finance", "health", "other",
];
const SHAREABILITIES: Shareability[] = [
  "transferable", "presence_required", "personal_only",
];

export async function createOffer(
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const groupId = String(formData.get("group_id") ?? "");
  const programId = String(formData.get("program_id") ?? "");
  const title = String(formData.get("title_he") ?? "").trim();
  const merchant = String(formData.get("merchant") ?? "").trim();
  const discountText = String(formData.get("discount_text") ?? "").trim();
  const description = String(formData.get("description_he") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const shareability = String(formData.get("shareability") ?? "");
  const validUntil = String(formData.get("valid_until") ?? "").trim();
  const sourceUrl = String(formData.get("source_url") ?? "").trim();

  if (!programId) return { error: "בחרו מאיזה מועדון ההטבה." };
  if (title.length < 3) return { error: "צריך תיאור קצר של ההטבה." };
  if (merchant.length < 2) return { error: "צריך שם של בית העסק." };
  if (discountText.length < 1) return { error: "כתבו מה בדיוק ההנחה." };
  if (!SHAREABILITIES.includes(shareability as Shareability)) {
    return { error: "בחרו האם אפשר להעביר את ההטבה." };
  }
  if (!CATEGORIES.includes(category as OfferCategory)) {
    return { error: "קטגוריה לא תקינה." };
  }
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    return { error: "הקישור צריך להתחיל ב-http או https." };
  }

  // group_id and created_by are both required by the RLS insert policy: a
  // member may only write into a group they belong to, and only as themselves.
  const { error } = await supabase.from("offers").insert({
    program_id: programId,
    group_id: groupId,
    title_he: title,
    merchant,
    category,
    discount_text: discountText,
    description_he: description || null,
    shareability,
    valid_until: validUntil || null,
    source_url: sourceUrl || null,
    created_by: user.id,
    verified_at: new Date().toISOString(),
  });

  if (error) {
    return { error: "לא הצלחנו לשמור את ההטבה. בדקו את הפרטים ונסו שוב." };
  }

  revalidatePath(`/g/${groupId}`);
  redirect(`/g/${groupId}`);
}
