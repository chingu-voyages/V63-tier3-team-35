import { createHash, randomBytes } from "node:crypto";
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

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const cookieName = "event_planner_session";
const sessionLength = 30 * 24 * 60 * 60 * 1000;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function databaseUnavailable() {
  return process.env.DATABASE_URL
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
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return jsonError("Record already exists.", 409);
    if (error.code === "P2025") return jsonError("Record not found.", 404);
    if (["P1001", "P1002", "P1003"].includes(error.code))
      return jsonError("Database unavailable.", 503);
  }
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

export function parseEventInput(body: Record<string, any>, partial = false) {
  const data: Record<string, any> = {};
  const errors: string[] = [];
  const required = ["name", "date", "startTime", "location", "description"];
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
  if (body.ticketPrice !== undefined) {
    if (
      body.ticketPrice !== null &&
      (typeof body.ticketPrice !== "number" || body.ticketPrice < 0)
    )
      errors.push("Invalid ticketPrice");
    else data.ticketPrice = body.ticketPrice;
  }
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date))
    errors.push("date must use YYYY-MM-DD");
  if (data.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.startTime))
    errors.push("startTime must use HH:mm");
  return { data, errors };
}

export function parseAttendeeInput(body: Record<string, any>, partial = false) {
  const data: Record<string, any> = {};
  const errors: string[] = [];
  if (!partial || body.fullName !== undefined) {
    if (typeof body.fullName !== "string" || !body.fullName.trim())
      errors.push("fullName is required");
    else data.fullName = body.fullName.trim();
  }
  for (const key of ["email", "company", "promoSourceOther", "city"]) {
    if (body[key] !== undefined)
      data[key] = body[key] === null ? null : String(body[key]).trim();
  }
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
  return { data, errors };
}
