/** ISO 8601 with offset, e.g. "2026-12-10T18:00:00+01:00" */
export type ISODateString = string;

/** ISO 4217 code */
export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR";

/** Money in the smallest unit (kobo, cents). Never floats. */
export type Money = { amountMinor: number; currency: CurrencyCode };

// One list drives both the runtime values and the type
export const SOURCE_CHANNELS = [
  "email", "linkedin", "x", "whatsapp", "partner", "walk_in", "unknown",
] as const;
export type SourceChannel = (typeof SOURCE_CHANNELS)[number];

export const EVENT_TYPES = [
  "demo_day", "networking", "training", "showcase", "summit", "forum", "other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type EventFormat = "in_person" | "online" | "hybrid";

export type MemberRole = "programme_manager" | "community_manager" | "marketing_lead" | "other";

// ─── Stored records (what the database holds) ────────────────────────

export type Account = {
  id: string;
  email: string | null;      // null = anonymous guest
  displayName: string | null;
  createdAt: ISODateString;
};

export type Workspace = {
  id: string;
  ownerId: Account["id"];
  name: string;              // "Acme Tech Hub"
  slug: string;              // "acme-tech-hub"
  ownerRole: MemberRole;
  timezone: string;          // IANA, e.g. "Africa/Lagos"
  defaultCurrency: CurrencyCode;
  hasSampleData: boolean;
  createdAt: ISODateString;
};

export type EventSeries = {
  id: string;
  workspaceId: Workspace["id"];
  name: string;              // "Quarterly Demo Days"
  eventType: EventType;
};

/** Free events cannot carry a price: the union makes that impossible to write */
export type Ticketing =
  | { kind: "free" }
  | { kind: "paid"; price: Money };

/** Stored lifecycle. "Upcoming", "live" and "finished" are derived from dates. */
export type EventState = "draft" | "published" | "cancelled";

export type Event = {
  id: string;
  workspaceId: Workspace["id"];
  seriesId: EventSeries["id"] | null;
  name: string;
  shortName: string | null;  // breadcrumb label
  type: EventType;
  format: EventFormat;
  startsAt: ISODateString;
  endsAt: ISODateString | null;
  timezone: string;
  venue: string | null;      // required in the form when format !== "online"
  onlineUrl: string | null;
  capacity: number | null;
  attendanceTarget: number;
  ticketing: Ticketing;
  description: string;
  state: EventState;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type Registration = {
  id: string;
  eventId: Event["id"];
  code: string;              // "REG-104", unique per event
  name: string;
  email: string;             // unique per event
  source: SourceChannel;
  amountPaid: Money | null;  // null for free events
  registeredAt: ISODateString;
  checkedInAt: ISODateString | null;   // one field = one check-in, so no duplicates
  checkedInBy: string | null;          // device or staff label, e.g. "Door 1"
};

export type PromoBrief = {
  eventId: Event["id"];
  audience: string;
  purpose: string;
  tone: "warm" | "professional" | "playful";
  callToAction: string;
};

export type PromoDraft = {
  id: string;
  eventId: Event["id"];
  channel: Exclude<SourceChannel, "partner" | "walk_in" | "unknown">;
  version: number;
  subject: string | null;    // email only
  body: string;
  trackedUrl: string;        // ".../r/winter-demo-day?src=email"
  createdAt: ISODateString;
};

// ─── Derived views (computed, never stored) ───────────────────────────

export type EventStatus = "draft" | "cancelled" | "upcoming" | "live" | "finished";

export type ChannelMetrics = {
  channel: SourceChannel;
  registered: number;
  attended: number;
  turnoutRate: number | null;   // 0..1, null when registered is 0
};

export type EventMetrics = {
  registered: number;
  attended: number;
  turnoutRate: number | null;   // 0..1
  vsTarget: number;             // 0.095 means +9.5%
  byChannel: ChannelMetrics[];
  topChannel: SourceChannel | null;
  unknownShare: number | null;  // share of attendees with source "unknown"
  revenue: Money | null;        // null for free events
};

/** Exactly what AppHeader needs, nothing more */
export type WorkspaceSummary = {
  id: Workspace["id"];
  name: string;
  isGuest: boolean;             // from Account.email === null
  hasSampleData: boolean;
  eventsWithAttendance: number; // Compare unlocks at 2
};