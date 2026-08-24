"use client";

import { askLabel, buildAskMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import type { OfferWithHolders, Profile } from "@/lib/types";

export default function AskButton({
  offer,
  holder,
  askerName,
  groupId,
  siteUrl,
}: {
  offer: OfferWithHolders;
  holder: Profile;
  askerName: string;
  groupId: string;
  siteUrl: string;
}) {
  const origin = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const offerUrl = origin ? `${origin}/g/${groupId}?offer=${offer.id}` : undefined;

  const message = buildAskMessage(offer, askerName, offerUrl);
  const href = buildWhatsAppLink(holder.phone_e164, message);

  // No usable number on file: say so plainly rather than render a link that
  // opens WhatsApp on nothing.
  if (!href) {
    return (
      <span className="btn-ghost cursor-not-allowed opacity-60" aria-disabled>
        ל{holder.display_name} אין טלפון בפרופיל
      </span>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
      <span aria-hidden>💬</span>
      {askLabel(offer.shareability, holder.display_name)}
    </a>
  );
}
