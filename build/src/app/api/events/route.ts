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
  parseEventAttendeesInput,
  createEventAttendees,
  attachAttendeeUsers,
} from "@/lib/db";

/**
 * /events
 *
 *  - GET  /events                        -> all public events
 *  - GET  /events?orgId=<id>             -> all events for the given orgId
 *  - GET  /events?orgId=<id>&inPub=true  -> events for the given orgId, plus all public events
 *  - POST /events                        -> creates a new event for the current user's organization
 *      Request body:
 *        - name, description, date, startTime, endTime, location (strings)
 *        - isPublic (boolean)
 *        - organizationId (string, must match the caller's session org)
 *        - attendees (array of composite { User fields + Attendee fields } objects)
 */

export async function GET(request: Request) {
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const includePublic = searchParams.get("inPub") === "true";

    const where = !orgId
      ? { isPublic: true }
      : includePublic
        ? { OR: [{ organizationId: orgId }, { isPublic: true }] }
        : { organizationId: orgId };

    const events = await prisma.event.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: { _count: { select: { attendees: true } } },
    });
    return NextResponse.json({ events });
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId)
      return jsonError(
        "Sign in or start a guest session to create events.",
        401,
      );
    const body = await readJson(request);
    if (!body) return jsonError("Request body must be a JSON object.", 400);

    if (
      body.organizationId !== undefined &&
      body.organizationId !== organizationId
    )
      return jsonError(
        "organizationId must match your authenticated organization.",
        403,
      );

    const { data, errors: eventErrors } = parseEventInput(body);
    const { attendees, errors: attendeeErrors } =
      parseEventAttendeesInput(body);
    const errors = [...eventErrors, ...attendeeErrors];
    if (errors.length)
      return NextResponse.json(
        { error: "Validation failed.", details: errors },
        { status: 400 },
      );

    // Attendee -> User is a plain userId column, not a Prisma relation (see
    // schema.prisma), so each User row is created up front and only then
    // referenced by id in the event's nested attendees.create write.
    const attendeeCreateInputs = await createEventAttendees(prisma, attendees);

    const event = await prisma.event.create({
      data: {
        ...data,
        organizationId,
        attendees: attendeeCreateInputs.length
          ? { create: attendeeCreateInputs }
          : undefined,
      } as never,
      include: {
        attendees: true,
        _count: { select: { attendees: true } },
      },
    });

    const eventWithAttendeeUsers = {
      ...event,
      attendees: await attachAttendeeUsers(prisma, event.attendees),
    };
    return NextResponse.json(
      { event: eventWithAttendeeUsers },
      { status: 201 },
    );
  } catch (error) {
    return handleDatabaseError(error);
  }
}
