import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

export interface SessionContext {
  userId: string;
  profile: Profile;
}

/**
 * Resolves the signed-in user and their profile, sending them where they need
 * to go if either is missing. A profile without a phone number cannot be asked
 * for anything over WhatsApp, so onboarding is not optional.
 */
export async function requireProfile(returnTo?: string): Promise<SessionContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(returnTo ? `/?next=${encodeURIComponent(returnTo)}` : "/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, phone_e164, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.phone_e164) {
    redirect(returnTo ? `/onboarding?next=${encodeURIComponent(returnTo)}` : "/onboarding");
  }

  return { userId: user.id, profile: profile as Profile };
}

export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
