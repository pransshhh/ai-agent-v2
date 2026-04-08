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
  BETTER_AUTH_URL: z.url(),
  JIRA_BASE_URL: z.url(),
  JIRA_EMAIL: z.email(),
  JIRA_API_TOKEN: z.string().min(1),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  REDIS_URL: z.url(),
  GITHUB_PAT_SECRET: z
    .string()
    .min(16, "GITHUB_PAT_SECRET must be at least 16 characters")
});

const { success, data, error } = envSchema.safeParse(process.env);

if (!success) {
  console.error("❌ Invalid environment variables");
  console.error(z.treeifyError(error));
  process.exit(1);
}

export const env = data;
