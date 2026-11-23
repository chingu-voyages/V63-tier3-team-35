import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Dev-only data layer: simulates the subset of the Prisma Client surface
 * that this app's routes actually call (`organizationSession`, `organization`,
 * `event`), backed by an in-memory store seeded from `seed-db.json`.
 *
 * This module is only ever imported/used when `usingJsonStore` (see
 * lib/db/index.ts) is true — i.e. local development with no DATABASE_URL set.
 * `pnpm build` / a production start always require DATABASE_URL and go
 * through the real @prisma/client instead; this file is never reached there.
 *
 * It is intentionally NOT a general query engine — it supports exactly the
 * where/select/include/orderBy shapes used in this codebase, nothing more.
 */

interface SessionRow {
  id: string;
  tokenHash: string;
  organizationId: string;
  expiresAt: string; // ISO string on disk/in memory, converted to Date on read
  createdAt: string;
}

interface OrganizationRow {
  id: string;
  name: string;
  isGuest: boolean;
  createdAt: string;
  userId: string | null;
}

interface UserRow {
  id: string;
  fullName: string;
  email: string | null;
  city: string | null;
  company: string | null;
}

interface AttendeeRow {
  id: string;
  eventId: string;
  userId: string;
  registrationId: string;
  attendeeRole: string | null;
  promoSourceCode: string | null;
  promoSourceOther: string | null;
  registeredAt: string;
}

interface EventRow {
  id: string;
  organizationId: string;
  name: string;
  eventType: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string;
  description: string;
  expectedAttendance: number;
  targetAttendance: number;
  registrationUrl: string | null;
  ticketPrice: number | null;
  currency: string | null;
  status: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Store {
  organizations: OrganizationRow[];
  organizationSessions: SessionRow[];
  events: EventRow[];
  users: UserRow[];
  attendees: AttendeeRow[];
}

function emptyStore(): Store {
  return {
    organizations: [],
    organizationSessions: [],
    events: [],
    users: [],
    attendees: [],
  };
}

function loadSeed(): Store {
  const seedPath = path.join(process.cwd(), "src/lib/db/seed-db.json");
  if (!fs.existsSync(seedPath)) {
    console.warn(
      `[json-store] seed-db.json not found at ${seedPath}; starting from an empty dataset.`,
    );
    return emptyStore();
  }
  const raw = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  return {
    organizations: raw.organizations ?? [],
    organizationSessions: raw.organizationSessions ?? [],
    events: raw.events ?? [],
    users: raw.users ?? [],
    attendees: raw.attendees ?? [],
  };
}

// Cached on globalThis so the dataset survives Next.js dev-mode hot reloads
// (mirrors the globalForPrisma pattern used for the real client) — the store
// is only ever initialized once per dev server process, at first use.
const globalForJsonDb = globalThis as unknown as { jsonDb?: Store };
function getStore(): Store {
  if (!globalForJsonDb.jsonDb) {
    globalForJsonDb.jsonDb = loadSeed();
    console.info(
      "[json-store] Initialized dev dataset from seed-db.json (no DATABASE_URL set).",
    );
  }
  return globalForJsonDb.jsonDb;
}

class JsonDbError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function matchWhere(
  record: Record<string, any>,
  where: Record<string, any> | undefined,
): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR")
      return (value as any[]).some((sub) => matchWhere(record, sub));
    if (key === "AND")
      return (value as any[]).every((sub) => matchWhere(record, sub));
    return record[key] === value;
  });
}

function pick(record: Record<string, any>, selection?: Record<string, any>) {
  if (!selection) return { ...record };
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(selection)) {
    if (value === true) result[key] = record[key];
  }
  return result;
}

function applyOrderBy<T extends Record<string, any>>(
  records: T[],
  orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[],
): T[] {
  if (!orderBy) return records;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...records].sort((a, b) => {
    for (const spec of specs) {
      const [field, direction] = Object.entries(spec)[0] as [
        string,
        "asc" | "desc",
      ];
      if (a[field] < b[field]) return direction === "asc" ? -1 : 1;
      if (a[field] > b[field]) return direction === "asc" ? 1 : -1;
    }
    return 0;
  });
}

function countAttendees(store: Store, eventId: string) {
  return store.attendees.filter((a) => a.eventId === eventId).length;
}

function hydrateEvent(
  store: Store,
  event: EventRow,
  args: { select?: any; include?: any },
) {
  const spec = args.include ?? args.select;
  const result: Record<string, any> = args.select
    ? pick(event, args.select)
    : { ...event };

  if (spec?._count?.select?.attendees) {
    result._count = { attendees: countAttendees(store, event.id) };
  }
  if (spec?.attendees) {
    // Attendee -> User is a plain userId column, not a Prisma relation (see
    // schema.prisma), so this always returns the raw attendee rows; the
    // caller re-attaches User data itself via db.user.findMany + a manual
    // merge (see attachAttendeeUsers in lib/db/index.ts), exactly as it must
    // for the real Prisma client too.
    result.attendees = store.attendees
      .filter((a) => a.eventId === event.id)
      .map((row) => ({ ...row }));
  }
  return result;
}

function withDefaults(
  data: Record<string, any>,
): Omit<EventRow, "id" | "createdAt" | "updatedAt"> {
  return {
    organizationId: data.organizationId,
    name: data.name,
    eventType: data.eventType ?? "OTHER",
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    timezone: data.timezone ?? "UTC",
    location: data.location,
    description: data.description,
    expectedAttendance: data.expectedAttendance,
    targetAttendance: data.targetAttendance ?? 0,
    registrationUrl: data.registrationUrl ?? null,
    ticketPrice: data.ticketPrice ?? null,
    currency: data.currency ?? null,
    status: data.status ?? "UPCOMING",
    isPublic: data.isPublic ?? false,
  };
}

export function createJsonDbClient() {
  // Declared with `const` and returned by name (rather than as an inline
  // object literal) so `$transaction` below can close over this same
  // client -- that reference only resolves when $transaction is actually
  // *called*, by which point `client` has finished being assigned.
  const client = {
    organizationSession: {
      async findUnique({
        where,
        select,
      }: {
        where: { tokenHash: string };
        select?: any;
      }) {
        const row = getStore().organizationSessions.find(
          (s) => s.tokenHash === where.tokenHash,
        );
        if (!row) return null;
        const hydrated = {
          ...row,
          expiresAt: new Date(row.expiresAt),
          createdAt: new Date(row.createdAt),
        };
        return select ? pick(hydrated, select) : hydrated;
      },
      async delete({ where }: { where: { tokenHash: string } }) {
        const store = getStore();
        const index = store.organizationSessions.findIndex(
          (s) => s.tokenHash === where.tokenHash,
        );
        if (index === -1) throw new JsonDbError("P2025", "Record not found.");
        const [removed] = store.organizationSessions.splice(index, 1);
        return removed;
      },
      async deleteMany({ where }: { where: { tokenHash: string } }) {
        const store = getStore();
        const before = store.organizationSessions.length;
        store.organizationSessions = store.organizationSessions.filter(
          (s) => s.tokenHash !== where.tokenHash,
        );
        return { count: before - store.organizationSessions.length };
      },
    },

    organization: {
      async create({ data, select }: { data: any; select?: any }) {
        const store = getStore();
        const now = new Date().toISOString();
        const organization: OrganizationRow = {
          id: randomUUID(),
          name: data.name,
          isGuest: data.isGuest ?? true,
          createdAt: now,
          userId: null,
        };
        store.organizations.push(organization);

        if (data.sessions?.create) {
          const sessionData = data.sessions.create;
          store.organizationSessions.push({
            id: randomUUID(),
            tokenHash: sessionData.tokenHash,
            organizationId: organization.id,
            expiresAt:
              sessionData.expiresAt instanceof Date
                ? sessionData.expiresAt.toISOString()
                : sessionData.expiresAt,
            createdAt: now,
          });
        }

        const hydrated = {
          ...organization,
          createdAt: new Date(organization.createdAt),
        };
        return select ? pick(hydrated, select) : hydrated;
      },
    },

    user: {
      async create({ data }: { data: any }) {
        const store = getStore();
        const user: UserRow = {
          id: randomUUID(),
          fullName: data.fullName,
          email: data.email ?? null,
          city: data.city ?? null,
          company: data.company ?? null,
        };
        store.users.push(user);
        return { ...user };
      },
      async findMany({ where }: { where?: { id?: { in: string[] } } }) {
        const store = getStore();
        if (!where?.id?.in) return store.users.map((u) => ({ ...u }));
        const ids = new Set(where.id.in);
        return store.users.filter((u) => ids.has(u.id)).map((u) => ({ ...u }));
      },
      async delete({ where }: { where: { id: string } }) {
        const store = getStore();
        const index = store.users.findIndex((u) => u.id === where.id);
        if (index === -1) throw new JsonDbError("P2025", "Record not found.");
        const [removed] = store.users.splice(index, 1);
        return removed;
      },
    },

    // Attendee -> User is a plain userId column with no Prisma relation (see
    // schema.prisma), so there's no FK here for a real database to enforce
    // a cascade with. deleteUser() in lib/db/index.ts is this store's only
    // enforcement of "deleting a user evicts them from every event".
    attendee: {
      async deleteMany({ where }: { where?: any }) {
        const store = getStore();
        const before = store.attendees.length;
        store.attendees = store.attendees.filter((a) => !matchWhere(a, where));
        return { count: before - store.attendees.length };
      },
    },

    // A simplified stand-in for Prisma's interactive transaction: runs the
    // callback against this same client. There's no real isolation or
    // rollback-on-throw here -- for a single-process dev store simulating
    // a handful of sequential awaits, that's an acceptable simplification.
    // Loosely typed on purpose: this is a dev-only implementation detail,
    // cast to the shared DbClient interface where it's assigned in
    // lib/db/index.ts rather than structurally matched against Prisma's
    // own (much more elaborate) transaction overloads here.
    async $transaction(fn: (tx: any) => Promise<any>): Promise<any> {
      return fn(client);
    },

    event: {
      async findMany({
        where,
        orderBy,
        select,
        include,
      }: {
        where?: any;
        orderBy?: any;
        select?: any;
        include?: any;
      }) {
        const store = getStore();
        const matches = store.events.filter((e) => matchWhere(e, where));
        const ordered = applyOrderBy(matches, orderBy);
        return ordered.map((e) => hydrateEvent(store, e, { select, include }));
      },
      async findFirst({
        where,
        select,
        include,
      }: {
        where?: any;
        select?: any;
        include?: any;
      }) {
        const store = getStore();
        const match = store.events.find((e) => matchWhere(e, where));
        return match ? hydrateEvent(store, match, { select, include }) : null;
      },
      async create({
        data,
        select,
        include,
      }: {
        data: any;
        select?: any;
        include?: any;
      }) {
        const store = getStore();
        const now = new Date().toISOString();
        const event: EventRow = {
          id: randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...withDefaults(data),
        };
        store.events.push(event);

        // attendees.create entries arrive as plain { userId, registrationId,
        // ... } — the caller (createEventAttendees in lib/db/index.ts) has
        // already created each User row via db.user.create before this runs,
        // matching how it has to work against the real Prisma client now
        // that Attendee.userId carries no Prisma relation.
        const attendeesToCreate = data.attendees?.create ?? [];
        for (const attendee of attendeesToCreate) {
          store.attendees.push({
            id: randomUUID(),
            eventId: event.id,
            userId: attendee.userId,
            registrationId: attendee.registrationId,
            attendeeRole: attendee.attendeeRole ?? null,
            promoSourceCode: attendee.promoSourceCode ?? null,
            promoSourceOther: attendee.promoSourceOther ?? null,
            registeredAt: now,
          });
        }

        return hydrateEvent(store, event, { select, include });
      },
      async updateMany({ where, data }: { where?: any; data: any }) {
        const store = getStore();
        const now = new Date().toISOString();
        let count = 0;
        store.events = store.events.map((e) => {
          if (!matchWhere(e, where)) return e;
          count += 1;
          return { ...e, ...data, updatedAt: now };
        });
        return { count };
      },
    },
  };

  return client;
}

export type JsonDbClient = ReturnType<typeof createJsonDbClient>;
