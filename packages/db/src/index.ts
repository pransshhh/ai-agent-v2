import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

// RDS enforces SSL (rds.force_ssl). Enable TLS in production. The Amazon RDS CA
// isn't in Node's trust store, so we don't verify the chain — encrypted, but
// unverified. Local dev (docker Postgres) stays plaintext.
const ssl =
  process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined;

const pool = new PrismaPg({ connectionString, ssl });
export const db = new PrismaClient({ adapter: pool });
export type { ProjectStatus } from "./generated/prisma/client";
