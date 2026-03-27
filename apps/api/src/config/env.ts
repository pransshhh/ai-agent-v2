import { baseEnvSchema, parseEnv } from "@repo/config";
import { z } from "zod";
import "dotenv/config";

const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number(),
  DATABASE_URL: z.string().url()
});

export const env = parseEnv(apiEnvSchema);
