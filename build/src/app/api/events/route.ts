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

export async function GET() {
  const unavailable = databaseUnavailable();
  if (unavailable) return unavailable;
  try {
    const organizationId = await getOrganizationId();
    const events = await prisma.event.findMany({
      where: organizationId
        ? { OR: [{ organizationId }, { isPublic: true }] }
        : { isPublic: true },
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
    const { data, errors } = parseEventInput(body);
    if (errors.length)
      return NextResponse.json(
        { error: "Validation failed.", details: errors },
        { status: 400 },
      );
    const event = await prisma.event.create({
      data: { ...data, organizationId } as never,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
