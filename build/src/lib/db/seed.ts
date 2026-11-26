import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds the real database from seed-db.json — the same fixture file the
 * dev-only JSON store (lib/db/json-store.ts) reads when DATABASE_URL isn't
 * set. One file, two consumers: `pnpm prisma db seed` for a real Postgres
 * instance, or the JSON shim for DB-less local development.
 */
async function main() {
  const seedPath = path.join(process.cwd(), "src/lib/db/seed-db.json");
  const raw = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

  for (const org of raw.organizations ?? []) {
    await prisma.organization.upsert({
      where: { id: org.id },
      update: {},
      create: {
        id: org.id,
        name: org.name,
        isGuest: org.isGuest,
        createdAt: new Date(org.createdAt),
      },
    });
  }

  for (const user of raw.users ?? []) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }

  for (const event of raw.events ?? []) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: {},
      create: {
        ...event,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      },
    });
  }

  for (const attendee of raw.attendees ?? []) {
    await prisma.attendee.upsert({
      where: { id: attendee.id },
      update: {},
      create: {
        ...attendee,
        registeredAt: new Date(attendee.registeredAt),
      },
    });
  }

  console.log(
    `Seeded ${raw.organizations?.length ?? 0} organizations, ${raw.users?.length ?? 0} users, ` +
      `${raw.events?.length ?? 0} events, ${raw.attendees?.length ?? 0} attendees.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
