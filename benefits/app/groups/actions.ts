"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface GroupFormState {
  error?: string;
}

export async function createGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2) return { error: "תנו לקבוצה שם." };

  // Membership is only ever granted through this function - group_members has
  // no insert policy of its own.
  const { data, error } = await supabase.rpc("create_group", { p_name: name });

  if (error || !data) return { error: "לא הצלחנו ליצור את הקבוצה. נסו שוב." };

  revalidatePath("/", "layout");
  redirect(`/g/${data.id}?welcome=1`);
}

export async function joinGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const supabase = await createClient();
  const code = String(formData.get("code") ?? "").trim();

  if (!code) return { error: "חסר קוד הזמנה." };

  const { data, error } = await supabase.rpc("join_group_by_code", { p_code: code });

  if (error || !data) return { error: "קוד ההזמנה לא תקין או שפג תוקפו." };

  revalidatePath("/", "layout");
  redirect(`/g/${data.id}`);
}
