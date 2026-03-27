import path from "node:path";
import { config } from "dotenv";
import { z } from "zod";

config({ path: path.resolve(__dirname, "../../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number(),
  CORS_ORIGIN: z.url(),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.url()
});

const { success, data, error } = envSchema.safeParse(process.env);

if (!success) {
  console.error("❌ Invalid environment variables");
  console.error(error.format());
  process.exit(1);
}

export const env = data;
