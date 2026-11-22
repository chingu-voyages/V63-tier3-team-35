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

type Context = { params: Promise<{ id: string; attendeeId: string }> };

async function findOwnedAttendee(
  eventId: string,
  attendeeId: string,
  organizationId: string,
) {
  return prisma.attendee.findFirst({
    where: { id: attendeeId, eventId, event: { organizationId } },
    include: { checkIn: true },
  });
}

export async function GET(_request: Request, { params }: Context) {
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return jsonError("Sign in to manage attendees.", 401);
    const { id, attendeeId } = await params;
    const attendee = await findOwnedAttendee(id, attendeeId, organizationId);
    if (!attendee) return jsonError("Attendee not found.", 404);
    return NextResponse.json({ attendee });
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return jsonError("Sign in to manage attendees.", 401);
    const { id, attendeeId } = await params;
    if (!(await findOwnedAttendee(id, attendeeId, organizationId)))
      return jsonError("Attendee not found.", 404);
    const body = await readJson(request);
    if (!body) return jsonError("Request body must be a JSON object.", 400);
    const { data, errors } = parseAttendeeInput(body, true);
    if (errors.length)
      return NextResponse.json(
        { error: "Validation failed.", details: errors },
        { status: 400 },
      );
    if (!Object.keys(data).length)
      return jsonError("Provide at least one attendee field to update.", 400);
    await prisma.attendee.updateMany({
      where: { id: attendeeId, eventId: id, event: { organizationId } },
      data: data as never,
    });
    const attendee = await findOwnedAttendee(id, attendeeId, organizationId);
    return NextResponse.json({ attendee });
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
    if (!organizationId) return jsonError("Sign in to manage attendees.", 401);
    const { id, attendeeId } = await params;
    const deleted = await prisma.attendee.deleteMany({
      where: { id: attendeeId, eventId: id, event: { organizationId } },
    });
    if (!deleted.count) return jsonError("Attendee not found.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
