import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { databaseUnavailable } from "@/lib/db";

const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  const unavailable = databaseUnavailable();
  return unavailable ?? handlers.GET(request);
}

export async function POST(request: Request) {
  const unavailable = databaseUnavailable();
  return unavailable ?? handlers.POST(request);
}
