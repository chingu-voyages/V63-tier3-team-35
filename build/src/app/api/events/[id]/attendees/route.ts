import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/auth";
import {
  prisma,
  databaseUnavailable,
  handleDatabaseError,
  jsonError,
  readJson,
  rejectCrossOrigin,
  parseAttendeeInput,
} from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return jsonError("Sign in to manage attendees.", 401);
    const { id: eventId } = await params;
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId },
      select: { id: true },
    });
    if (!event) return jsonError("Event not found.", 404);
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const attendees = await prisma.attendee.findMany({
      where: {
        eventId,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { registrationId: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { registeredAt: "desc" },
      include: { checkIn: true },
    });
    return NextResponse.json({ attendees });
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return jsonError("Sign in to manage attendees.", 401);
    const { id: eventId } = await params;
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizationId },
      select: { id: true },
    });
    if (!event) return jsonError("Event not found.", 404);
    const body = await readJson(request);
    if (!body) return jsonError("Request body must be a JSON object.", 400);
    const { data, errors } = parseAttendeeInput(body);
    if (errors.length)
      return NextResponse.json(
        { error: "Validation failed.", details: errors },
        { status: 400 },
      );
    const registrationId = `REG-${randomBytes(4).toString("hex").toUpperCase()}`;
    const attendee = await prisma.attendee.create({
      data: { ...data, eventId, registrationId } as never,
    });
    return NextResponse.json({ attendee }, { status: 201 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
