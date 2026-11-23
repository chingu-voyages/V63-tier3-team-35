import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  Prisma,
  PrismaClient,
  EventType,
  EventStatus,
  AttendeeRole,
  PromoSourceCode,
} from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createJsonDbClient, type JsonDbClient } from "./json-store";

/**
 * Minimal shape the routes actually depend on, satisfied by both the real
 * PrismaClient and the dev-only JSON shim below.
 */
type DbClient = Pick<
  PrismaClient,
  | "organizationSession"
  | "organization"
  | "event"
  | "user"
  | "attendee"
  | "$transaction"
>;

/**
 * Dev fallback: if there's no DATABASE_URL and we're not in a production
 * build/runtime, requests are served from seed-db.json via json-store.ts
 * instead of a real database — so a developer without access to the cloud
 * DATABASE_URL can still run `pnpm dev` and hit every API route.
 *
 * In production (`pnpm build` + start), DATABASE_URL is required and this
 * flag is always false: the JSON shim is never reached, and a missing
 * DATABASE_URL falls through to `databaseUnavailable()`'s 503 as before.
 */
export const usingJsonStore =
  !process.env.DATABASE_URL && process.env.NODE_ENV !== "production";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  jsonDbClient?: JsonDbClient;
};

export const prisma: DbClient = usingJsonStore
  ? ((globalForPrisma.jsonDbClient ??=
      createJsonDbClient()) as unknown as DbClient)
  : ((globalForPrisma.prisma ??= new PrismaClient()) as unknown as DbClient);

const cookieName = "event_planner_session";
const sessionLength = 30 * 24 * 60 * 60 * 1000;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function databaseUnavailable() {
  return process.env.DATABASE_URL || usingJsonStore
    ? null
    : jsonError("Set DATABASE_URL to use the API.", 503);
}

export function rejectCrossOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin && new URL(origin).origin !== new URL(request.url).origin
    ? jsonError("Cross-origin request not allowed.", 403)
    : null;
}

export async function requireOrganization() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return null;

  const session = await prisma.organizationSession.findUnique({
    where: { tokenHash: hash(token) },
    select: { organizationId: true, expiresAt: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session)
      await prisma.organizationSession.delete({
        where: { tokenHash: hash(token) },
      });
    store.delete(cookieName);
    return null;
  }
  return session.organizationId;
}

export async function createGuestSession(name: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLength);
  const organization = await prisma.organization.create({
    data: {
      name,
      isGuest: true,
      sessions: { create: { tokenHash: hash(token), expiresAt } },
    },
    select: { id: true, name: true, isGuest: true, createdAt: true },
  });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    expires: expiresAt,
  });
  return organization;
}

export async function revokeGuestSession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token)
    await prisma.organizationSession.deleteMany({
      where: { tokenHash: hash(token) },
    });
  store.delete(cookieName);
}

export function handleDatabaseError(error: unknown) {
  // Covers both the real Prisma.PrismaClientKnownRequestError and the
  // dev-mode JsonDbError shim — both carry a `.code` string in the same
  // P-prefixed vocabulary, so a single duck-typed check handles either.
  const code = (error as { code?: string } | null | undefined)?.code;
  if (code === "P2002") return jsonError("Record already exists.", 409);
  if (code === "P2025") return jsonError("Record not found.", 404);
  if (code && ["P1001", "P1002", "P1003"].includes(code))
    return jsonError("Database unavailable.", 503);
  if (error instanceof Prisma.PrismaClientInitializationError)
    return jsonError("Database unavailable.", 503);
  return jsonError("Request failed.", 500);
}

export async function readJson(
  request: Request,
): Promise<Record<string, any> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? body
      : null;
  } catch {
    return null;
  }
}

/**
 * Validates the scalar Event fields from a request body against the Event
 * model. `organizationId`, if present, is only type-checked here — the route
 * is responsible for always setting the real association from the
 * authenticated session rather than trusting a client-supplied value.
 */
export function parseEventInput(body: Record<string, any>, partial = false) {
  const data: Record<string, any> = {};
  const errors: string[] = [];
  const required = [
    "name",
    "date",
    "startTime",
    "endTime",
    "location",
    "description",
  ];
  for (const key of required) {
    if (partial && body[key] === undefined) continue;
    if (typeof body[key] !== "string" || !body[key].trim())
      errors.push(`${key} is required`);
    else data[key] = body[key].trim();
  }
  for (const key of ["timezone", "currency", "registrationUrl"]) {
    if (body[key] !== undefined && body[key] !== null)
      data[key] = String(body[key]).trim();
    else if (body[key] === null) data[key] = null;
  }
  for (const key of ["expectedAttendance", "targetAttendance"]) {
    if (body[key] === undefined) {
      if (key === "expectedAttendance" && !partial)
        errors.push(`${key} is required`);
    } else if (!Number.isInteger(body[key]) || body[key] < 0)
      errors.push(`${key} must be a non-negative integer`);
    else data[key] = body[key];
  }
  if (body.eventType !== undefined) {
    if (!Object.values(EventType).includes(body.eventType))
      errors.push("Invalid eventType");
    else data.eventType = body.eventType;
  }
  if (body.status !== undefined) {
    if (!Object.values(EventStatus).includes(body.status))
      errors.push("Invalid status");
    else data.status = body.status;
  }
  if (body.isPublic === undefined) {
    if (!partial) errors.push("isPublic is required");
  } else if (typeof body.isPublic !== "boolean") {
    errors.push("isPublic must be a boolean");
  } else {
    data.isPublic = body.isPublic;
  }
  if (body.ticketPrice !== undefined) {
    if (
      body.ticketPrice !== null &&
      (typeof body.ticketPrice !== "number" || body.ticketPrice < 0)
    )
      errors.push("Invalid ticketPrice");
    else data.ticketPrice = body.ticketPrice;
  }
  // organizationId travels with the payload per the composite request shape,
  // but is never trusted as-is: validated here, authoritatively re-applied
  // by the route from the session in `getOrganizationId()`.
  if (body.organizationId !== undefined) {
    if (typeof body.organizationId !== "string" || !body.organizationId.trim())
      errors.push("organizationId must be a string");
  } else if (!partial) {
    errors.push("organizationId is required");
  }
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date))
    errors.push("date must use YYYY-MM-DD");
  if (data.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.startTime))
    errors.push("startTime must use HH:mm");
  if (data.endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.endTime))
    errors.push("endTime must use HH:mm");
  if (data.startTime && data.endTime && data.endTime <= data.startTime)
    errors.push("endTime must be after startTime");
  return { data, errors };
}

/**
 * An attendee in a POST /events body is a composite object: User fields
 * (fullName, email, city, company) describing the person, plus Attendee
 * fields (attendeeRole, promoSourceCode, promoSourceOther, registrationId)
 * describing their relationship to this event. A User can be referenced by
 * many Attendee rows (across different events, or if re-added later), but
 * that association is a plain userId column rather than a Prisma relation
 * (see schema.prisma), so validation here just splits the composite input
 * into its User-shaped and Attendee-shaped fields.
 */
export function parseAttendeeInput(body: Record<string, any>, partial = false) {
  const data: Record<string, any> = {};
  const errors: string[] = [];
  if (!partial || body.fullName !== undefined) {
    if (typeof body.fullName !== "string" || !body.fullName.trim())
      errors.push("fullName is required");
    else data.fullName = body.fullName.trim();
  }
  for (const key of ["email", "company", "city"]) {
    if (body[key] !== undefined)
      data[key] = body[key] === null ? null : String(body[key]).trim();
  }
  if (body.promoSourceOther !== undefined)
    data.promoSourceOther =
      body.promoSourceOther === null
        ? null
        : String(body.promoSourceOther).trim();
  if (body.attendeeRole !== undefined) {
    if (
      body.attendeeRole !== null &&
      !Object.values(AttendeeRole).includes(body.attendeeRole)
    )
      errors.push("Invalid attendeeRole");
    else data.attendeeRole = body.attendeeRole;
  }
  if (body.promoSourceCode !== undefined) {
    if (
      body.promoSourceCode !== null &&
      !Object.values(PromoSourceCode).includes(body.promoSourceCode)
    )
      errors.push("Invalid promoSourceCode");
    else data.promoSourceCode = body.promoSourceCode;
  }
  if (body.registrationId !== undefined) {
    if (typeof body.registrationId !== "string" || !body.registrationId.trim())
      errors.push("registrationId must be a string");
    else data.registrationId = body.registrationId.trim();
  }
  return { data, errors };
}

/**
 * A validated composite attendee: User fields (to create the person) plus
 * Attendee fields (to create their registration). Deliberately flat and not
 * yet a Prisma write shape — Attendee.userId is a plain scalar column with
 * no Prisma relation (see schema.prisma), so the caller must create the
 * User row first and only then create the Attendee row with that userId.
 * `createEventAttendees` below does exactly that.
 */
export interface ValidatedAttendee {
  fullName: string;
  email: string | null;
  city: string | null;
  company: string | null;
  registrationId: string;
  attendeeRole: string | null | undefined;
  promoSourceCode: string | null | undefined;
  promoSourceOther: string | null | undefined;
}

/**
 * Validates an array of composite attendee objects from a POST /events body.
 * Generates a registrationId per attendee when the caller didn't supply one.
 */
export function parseEventAttendeesInput(body: Record<string, any>) {
  const errors: string[] = [];
  const attendees: ValidatedAttendee[] = [];

  if (body.attendees === undefined) return { attendees, errors };
  if (!Array.isArray(body.attendees)) {
    errors.push("attendees must be an array");
    return { attendees, errors };
  }

  body.attendees.forEach((raw: any, index: number) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push(`attendees[${index}] must be an object`);
      return;
    }
    const { data, errors: attendeeErrors } = parseAttendeeInput(raw);
    attendeeErrors.forEach((message) =>
      errors.push(`attendees[${index}]: ${message}`),
    );
    if (attendeeErrors.length) return;

    attendees.push({
      fullName: data.fullName,
      email: data.email ?? null,
      city: data.city ?? null,
      company: data.company ?? null,
      registrationId: data.registrationId ?? randomUUID(),
      attendeeRole: data.attendeeRole,
      promoSourceCode: data.promoSourceCode,
      promoSourceOther: data.promoSourceOther,
    });
  });

  return { attendees, errors };
}

/**
 * Writes validated attendees for a newly-created event: creates each User
 * row first, then the Attendee rows (with plain userId FKs) in one nested
 * `attendees.create` write on the event. Attendee has no Prisma relation to
 * User, so there is no nested `user: { create: ... }` shape to lean on here.
 */
export async function createEventAttendees(
  db: DbClient,
  attendees: ValidatedAttendee[],
) {
  const attendeeCreateInputs = [];
  for (const attendee of attendees) {
    const user = await db.user.create({
      data: {
        fullName: attendee.fullName,
        email: attendee.email,
        city: attendee.city,
        company: attendee.company,
      },
    });
    attendeeCreateInputs.push({
      userId: user.id,
      registrationId: attendee.registrationId,
      attendeeRole: attendee.attendeeRole,
      promoSourceCode: attendee.promoSourceCode,
      promoSourceOther: attendee.promoSourceOther,
    });
  }
  return attendeeCreateInputs;
}

/**
 * Re-attaches each attendee's User by id, since Attendee -> User isn't a
 * Prisma relation and so can never come back from an `include`.
 */
export async function attachAttendeeUsers(
  db: DbClient,
  attendees: Array<{ userId: string } & Record<string, unknown>>,
) {
  const userIds = [...new Set(attendees.map((a) => a.userId))];
  if (!userIds.length) return attendees.map((a) => ({ ...a, user: null }));
  const users = await db.user.findMany({ where: { id: { in: userIds } } });
  const usersById = new Map(users.map((u) => [u.id, u]));
  return attendees.map((a) => ({
    ...a,
    user: usersById.get(a.userId) ?? null,
  }));
}

/**
 * Deletes a User and evicts them from every event they were registered for.
 *
 * The database itself enforces this via a hand-written ON DELETE CASCADE
 * foreign key (see migrations/..._attendee_user_cascade/migration.sql) --
 * that's the guarantee that holds no matter how a User row gets deleted.
 * This function is a second, explicit line of defense for callers that go
 * through the app, and it's the *only* enforcement in dev mode, since the
 * JSON store (json-store.ts) has no real database to carry a constraint.
 */
export async function deleteUser(db: DbClient, userId: string) {
  return db.$transaction(async (tx) => {
    const { count: evictedAttendeeCount } = await tx.attendee.deleteMany({
      where: { userId },
    });
    const user = await tx.user.delete({ where: { id: userId } });
    return { user, evictedAttendeeCount };
  });
}
