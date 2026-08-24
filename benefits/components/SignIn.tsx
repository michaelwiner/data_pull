"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Google OAuth plus an email magic link. Phone OTP would fit Israeli users
 * better, but Supabase needs a paid SMS provider for it - so the phone is
 * collected during onboarding for WhatsApp, not used for login.
 */
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const redirectTo = `${
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "")
  }/auth/callback`;

  async function signInWithGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setError("ההתחברות נכשלה. נסו שוב.");
      setStatus("error");
    }
  }

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setError("לא הצלחנו לשלוח את הקישור. בדקו את כתובת המייל.");
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="card p-5 text-center">
        <p className="text-2xl">📬</p>
        <p className="mt-2 font-semibold">שלחנו לכם קישור כניסה</p>
        <p className="mt-1 text-sm text-ink-muted">
          פתחו את המייל שנשלח אל <bdi className="font-medium">{email}</bdi> ולחצו על הקישור.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={signInWithGoogle} className="btn-ghost w-full">
        המשך עם Google
      </button>

      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-line" />
        או
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <div>
          <label className="label" htmlFor="email">
            כתובת מייל
          </label>
          <input
            id="email"
            type="email"
            required
            dir="ltr"
            className="field text-start"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={status === "sending"}>
          {status === "sending" ? "שולח…" : "שלחו לי קישור כניסה"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
