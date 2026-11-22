import { NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/auth";
import {
  prisma,
  databaseUnavailable,
  handleDatabaseError,
  jsonError,
  readJson,
  rejectCrossOrigin,
  parseEventInput,
} from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const organizationId = await getOrganizationId();
    const { id } = await params;
    if (organizationId) {
      const ownedEvent = await prisma.event.findFirst({
        where: { id, organizationId },
        include: { _count: { select: { attendees: true } } },
      });
      if (ownedEvent) return NextResponse.json({ event: ownedEvent });
    }
    const event = await prisma.event.findFirst({
      where: { id, isPublic: true },
      select: {
        id: true,
        name: true,
        eventType: true,
        date: true,
        startTime: true,
        timezone: true,
        location: true,
        description: true,
        expectedAttendance: true,
        targetAttendance: true,
        registrationUrl: true,
        ticketPrice: true,
        currency: true,
        status: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!event) return jsonError("Event not found.", 404);
    return NextResponse.json({ event });
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return jsonError("Sign in to update events.", 401);
    const { id } = await params;
    const body = await readJson(request);
    if (!body) return jsonError("Request body must be a JSON object.", 400);
    const { data, errors } = parseEventInput(body, true);
    if (errors.length)
      return NextResponse.json(
        { error: "Validation failed.", details: errors },
        { status: 400 },
      );
    if (!Object.keys(data).length)
      return jsonError("Provide at least one event field to update.", 400);
    const result = await prisma.event.updateMany({
      where: { id, organizationId },
      data: data as never,
    });
    if (!result.count) return jsonError("Event not found.", 404);
    const event = await prisma.event.findFirst({
      where: { id, organizationId },
    });
    return NextResponse.json({ event });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
