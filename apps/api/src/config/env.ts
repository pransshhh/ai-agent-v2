import { baseEnvSchema, parseEnv } from "@repo/config";
import { z } from "zod";
import "dotenv/config";

const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number()
});

export const env = parseEnv(apiEnvSchema);
