import { NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/auth";
import {
  prisma,
  databaseUnavailable,
  handleDatabaseError,
  jsonError,
  rejectCrossOrigin,
} from "@/lib/db";

type Context = { params: Promise<{ id: string; attendeeId: string }> };

export async function POST(request: Request, { params }: Context) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return jsonError("Sign in to manage check-ins.", 401);
    const { id: eventId, attendeeId } = await params;
    const attendee = await prisma.attendee.findFirst({
      where: { id: attendeeId, eventId, event: { organizationId } },
      select: { id: true },
    });
    if (!attendee) return jsonError("Attendee not found.", 404);
    const checkIn = await prisma.checkIn.create({ data: { attendeeId } });
    return NextResponse.json({ checkIn }, { status: 201 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return jsonError("Sign in to manage check-ins.", 401);
    const { id: eventId, attendeeId } = await params;
    const result = await prisma.checkIn.deleteMany({
      where: { attendeeId, attendee: { eventId, event: { organizationId } } },
    });
    if (!result.count) return jsonError("Check-in not found.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
