"use client";

import Link from "next/link";
import { useState } from "react";

export default function GroupHeader({
  groupId,
  groupName,
  inviteCode,
  memberCount,
  siteUrl,
  showInviteBanner,
}: {
  groupId: string;
  groupName: string;
  inviteCode: string;
  memberCount: number;
  siteUrl: string;
  showInviteBanner: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const origin = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const inviteUrl = `${origin}/join/${inviteCode}`;

  async function share() {
    const text = `הצטרפו לקבוצת ההטבות "${groupName}" ב"הטבות ביחד":\n${inviteUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: groupName, text, url: inviteUrl });
        return;
      } catch {
        // The user dismissed the share sheet; fall through to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure origin, or permission denied). The code
      // is printed below, so there is still a way to pass it on.
      setCopied(false);
    }
  }

  return (
    <header>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{groupName}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            <bdi>{memberCount}</bdi> חברים בקבוצה
          </p>
        </div>
        <button type="button" onClick={share} className="btn-ghost shrink-0">
          {copied ? "✓ הועתק" : "🔗 הזמינו"}
        </button>
      </div>

      {showInviteBanner && (
        <div className="card mt-4 border-brand-500 bg-brand-50 p-4">
          <p className="font-semibold text-brand-700">הקבוצה מוכנה 🎉</p>
          <p className="mt-1 text-sm text-ink-muted">
            שלחו לחברים את הקוד הזה כדי שיצטרפו:
          </p>
          <p className="mt-2 select-all rounded-lg bg-surface px-3 py-2 text-center font-mono text-lg tracking-[0.2em]">
            <bdi>{inviteCode}</bdi>
          </p>
          <Link
            href={`/g/${groupId}/members`}
            className="mt-3 inline-block text-sm font-semibold text-brand-700 underline"
          >
            מי כבר בפנים?
          </Link>
        </div>
      )}
    </header>
  );
}
