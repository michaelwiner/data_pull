import { describe, expect, it } from "vitest";
import {
  askLabel,
  buildAskMessage,
  buildWhatsAppLink,
  isAskable,
  normalizeIsraeliPhone,
  toWaMeNumber,
} from "../lib/whatsapp";
import type { OfferWithHolders } from "../lib/types";

describe("normalizeIsraeliPhone", () => {
  it("normalizes the shapes people actually type", () => {
    const expected = "+972501234567";
    for (const input of [
      "0501234567",
      "050-123-4567",
      "050 123 4567",
      "  050-1234567  ",
      "+972501234567",
      "+972 50 123 4567",
      "972501234567",
      "972-50-1234567",
      "501234567",
      "(050) 123-4567",
    ]) {
      expect(normalizeIsraeliPhone(input), input).toBe(expected);
    }
  });

  it("tolerates a trunk zero left in after the country code", () => {
    expect(normalizeIsraeliPhone("9720501234567")).toBe("+972501234567");
  });

  it("accepts 8-digit landline national numbers", () => {
    expect(normalizeIsraeliPhone("03-1234567")).toBe("+97231234567");
    expect(normalizeIsraeliPhone("086339999")).toBe("+97286339999");
  });

  it("rejects input that cannot be a usable Israeli number", () => {
    for (const input of [
      null,
      undefined,
      "",
      "   ",
      "not a phone",
      "050123",          // too short
      "05012345678901",  // too long
      "+1 415 555 0123", // explicit non-Israeli country code
    ]) {
      expect(normalizeIsraeliPhone(input as string | null), String(input)).toBeNull();
    }
  });
});

describe("toWaMeNumber", () => {
  it("strips the leading plus, which wa.me does not accept", () => {
    expect(toWaMeNumber("050-123-4567")).toBe("972501234567");
  });

  it("returns null rather than a dead link target", () => {
    expect(toWaMeNumber("nonsense")).toBeNull();
  });
});

describe("shareability behaviour", () => {
  it("hides the ask entirely for personal-only benefits", () => {
    expect(isAskable("personal_only")).toBe(false);
    expect(isAskable("transferable")).toBe(true);
    expect(isAskable("presence_required")).toBe(true);
  });

  it("uses different Hebrew wording per shareability", () => {
    expect(askLabel("transferable", "מיכאל")).toBe("בקשו ממיכאל");
    expect(askLabel("presence_required", "מיכאל")).toBe("תאמו עם מיכאל");
  });
});

const offer: OfferWithHolders = {
  id: "o1",
  program_id: "p1",
  group_id: null,
  title_he: "כרטיסים למופע",
  merchant: "היכל התרבות",
  category: "culture",
  discount_text: "50% הנחה",
  discount_pct: 50,
  description_he: null,
  shareability: "transferable",
  costs_quota: false,
  valid_from: null,
  valid_until: "2026-12-31",
  source_url: null,
  image_url: null,
  created_by: null,
  verified_at: null,
  status: "active",
  program: {
    id: "p1",
    slug: "pais-plus",
    name_he: "פיס פלוס",
    category: "lottery",
    emoji: "🎟️",
    color: "#0aa06e",
    join_url: null,
    terms_url: null,
    notes_he: null,
  },
  holders: [],
};

describe("buildAskMessage", () => {
  it("names the offer, club, discount and expiry", () => {
    const message = buildAskMessage(offer, "דנה");
    expect(message).toContain("דנה");
    expect(message).toContain("פיס פלוס");
    expect(message).toContain("כרטיסים למופע");
    expect(message).toContain("50% הנחה");
    expect(message).toContain("31 בדצמבר");
  });

  it("asks to have it forwarded when transferable", () => {
    expect(buildAskMessage(offer, "דנה")).toContain("תזמין דרך החשבון שלך");
  });

  it("asks to coordinate when the holder must be present", () => {
    const inStore = { ...offer, shareability: "presence_required" as const };
    expect(buildAskMessage(inStore, "דנה")).toContain("נתאם לקנות ביחד");
  });

  it("omits the expiry line when the offer has no end date", () => {
    const undated = { ...offer, valid_until: null };
    expect(buildAskMessage(undated, "דנה")).not.toContain("בתוקף עד");
  });

  it("says so up front when the favour spends a monthly entitlement", () => {
    expect(buildAskMessage(offer, "דנה")).not.toContain("זכאות חודשית");
    const quota = { ...offer, costs_quota: true };
    expect(buildAskMessage(quota, "דנה")).toContain("מנצל לך זכאות חודשית");
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a wa.me link with the message url-encoded", () => {
    const link = buildWhatsAppLink("050-123-4567", "שלום עולם");
    expect(link).toBe(`https://wa.me/972501234567?text=${encodeURIComponent("שלום עולם")}`);
  });

  it("encodes newlines so multi-line Hebrew survives the round trip", () => {
    const link = buildWhatsAppLink("0501234567", "שורה\nשנייה")!;
    expect(link).toContain("%0A");
    const text = new URL(link).searchParams.get("text");
    expect(text).toBe("שורה\nשנייה");
  });

  it("returns null when the holder has no usable phone on file", () => {
    expect(buildWhatsAppLink(null, "hi")).toBeNull();
    expect(buildWhatsAppLink("", "hi")).toBeNull();
  });
});
