/** How a benefit can (or cannot) be passed from the member who holds it to a friend. */
export type Shareability =
  /** The holder buys and hands over the ticket/voucher. Works remotely. */
  | "transferable"
  /** The holder's card at the register, or the holder physically present. */
  | "presence_required"
  /** Tied to the person. Grants, tax credits. Cannot be shared at all. */
  | "personal_only";

export type OfferCategory =
  | "culture"
  | "food"
  | "travel"
  | "fashion"
  | "electronics"
  | "finance"
  | "health"
  | "other";

export type ProgramCategory =
  | "bank"
  | "credit"
  | "consumer"
  | "lottery"
  | "government";

export interface Program {
  id: string;
  slug: string;
  name_he: string;
  category: ProgramCategory;
  emoji: string;
  color: string;
  join_url: string | null;
  terms_url: string | null;
  notes_he: string | null;
}

export interface Profile {
  id: string;
  display_name: string;
  phone_e164: string | null;
  avatar_url: string | null;
}

export interface Offer {
  id: string;
  program_id: string;
  group_id: string | null;
  title_he: string;
  merchant: string;
  category: OfferCategory;
  discount_text: string;
  discount_pct: number | null;
  description_he: string | null;
  shareability: Shareability;
  /** Redeeming this consumes one of the holder's capped monthly entitlements. */
  costs_quota: boolean;
  valid_from: string | null;
  valid_until: string | null;
  source_url: string | null;
  image_url: string | null;
  created_by: string | null;
  verified_at: string | null;
  status: "active" | "expired" | "hidden";
}

/** An offer joined with its program and the group members who hold that program. */
export interface OfferWithHolders extends Offer {
  program: Program;
  holders: Profile[];
}

export const SHAREABILITY_LABEL_HE: Record<Shareability, string> = {
  transferable: "ניתן להעברה",
  presence_required: "דורש נוכחות",
  personal_only: "אישי בלבד",
};

export const CATEGORY_LABEL_HE: Record<OfferCategory, string> = {
  culture: "תרבות ובידור",
  food: "מזון ומסעדות",
  travel: "טיסות ונופש",
  fashion: "אופנה",
  electronics: "חשמל וטכנולוגיה",
  finance: "פיננסים וביטוח",
  health: "בריאות וטיפוח",
  other: "אחר",
};

export const PROGRAM_CATEGORY_LABEL_HE: Record<ProgramCategory, string> = {
  bank: "בנק",
  credit: "כרטיס אשראי",
  consumer: "מועדון צרכנות",
  lottery: "הגרלות",
  government: "מדינה",
};
