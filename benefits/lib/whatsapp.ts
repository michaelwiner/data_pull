import type { OfferWithHolders, Shareability } from "./types";

/**
 * Normalize an Israeli phone number to E.164 (+9725XXXXXXXX).
 *
 * Accepts the shapes people actually type: "050-123-4567", "050 1234567",
 * "+972 50 123 4567", "97250-1234567". Returns null when the input cannot be
 * read as a valid Israeli mobile or landline number, so callers can fall back
 * to hiding the ask button rather than producing a dead wa.me link.
 */
export function normalizeIsraeliPhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // Keep digits, and a leading + if present, discarding spaces, dashes, parens.
  const trimmed = input.trim();
  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  let national: string;

  if (digits.startsWith("972")) {
    // +972501234567 / 972501234567 -> national part after the country code.
    national = digits.slice(3);
    // Tolerate "97205..." where the trunk 0 was left in by mistake.
    if (national.startsWith("0")) national = national.slice(1);
  } else if (digits.startsWith("0")) {
    // 0501234567 -> 501234567
    national = digits.slice(1);
  } else if (hadPlus) {
    // An explicit +<country> that is not Israel. Out of scope.
    return null;
  } else {
    // Bare national number already missing the trunk 0, e.g. 501234567.
    national = digits;
  }

  // Israeli national numbers are 8 or 9 digits after the trunk 0, and never
  // start with 0 at this point.
  if (!/^[1-9]\d{7,8}$/.test(national)) return null;

  return `+972${national}`;
}

/**
 * wa.me requires the number in international format WITHOUT the leading plus.
 * Returns null for numbers that failed normalization.
 */
export function toWaMeNumber(phone: string | null | undefined): string | null {
  const e164 = normalizeIsraeliPhone(phone);
  return e164 ? e164.replace(/^\+/, "") : null;
}

/** Whether this kind of benefit can be requested from another person at all. */
export function isAskable(shareability: Shareability): boolean {
  return shareability !== "personal_only";
}

/** Hebrew call-to-action shown on the offer card, per shareability. */
export function askLabel(shareability: Shareability, holderName: string): string {
  switch (shareability) {
    case "transferable":
      return `בקשו מ${holderName}`;
    case "presence_required":
      return `תאמו עם ${holderName}`;
    case "personal_only":
      return "אישי בלבד";
  }
}

function formatValidUntil(validUntil: string | null): string {
  if (!validUntil) return "";
  const date = new Date(validUntil);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
  }).format(date);
}

/**
 * The Hebrew message pre-filled into WhatsApp. Deliberately short: it names the
 * offer, the club it comes from, and what is actually being asked, which differs
 * between an offer the holder can buy and forward and one that needs them present.
 */
export function buildAskMessage(
  offer: OfferWithHolders,
  askerName: string,
  offerUrl?: string,
): string {
  const lines: string[] = [];
  const until = formatValidUntil(offer.valid_until);

  lines.push(`היי! ${askerName} כאן 👋`);
  lines.push("");
  lines.push(`ראיתי ב"הטבות ביחד" שיש לך ${offer.program.name_he}, ויש דרכו הטבה:`);
  lines.push(`${offer.title_he} — ${offer.merchant}`);
  lines.push(`ההטבה: ${offer.discount_text}`);
  if (until) lines.push(`בתוקף עד ${until}`);
  lines.push("");

  if (offer.shareability === "transferable") {
    lines.push("אפשר שתזמין דרך החשבון שלך ואעביר לך את הכסף?");
  } else {
    lines.push("אפשר שנתאם לקנות ביחד, או שתקנה ואחזיר לך?");
  }

  if (offerUrl) {
    lines.push("");
    lines.push(offerUrl);
  }

  return lines.join("\n");
}

/**
 * Build the full wa.me deep link. Returns null when the holder has no usable
 * phone number on file, so the UI can degrade to "no phone on file" instead of
 * rendering a link that opens WhatsApp on nothing.
 */
export function buildWhatsAppLink(
  phone: string | null | undefined,
  message: string,
): string | null {
  const number = toWaMeNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
