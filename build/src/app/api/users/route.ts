import { NextResponse } from "next/server";
// place sample code here to test the build process.
// Can query and perform operations on the database schema and auth support modules.

export async function GET() {
  return NextResponse.json({ message: "users api is working" });
}
