import path from "node:path";
import { config } from "dotenv";
import { z } from "zod";

config({ path: path.resolve(__dirname, "../../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  REDIS_URL: z.url(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  JIRA_BASE_URL: z.url(),
  JIRA_EMAIL: z.email(),
  JIRA_API_TOKEN: z.string().min(1),
  JIRA_PROJECT_KEY: z.string().min(1),
  JIRA_BOARD_ID: z.coerce.number()
});

const { success, data, error } = envSchema.safeParse(process.env);

if (!success) {
  console.error("❌ Invalid environment variables");
  console.error(z.treeifyError(error));
  process.exit(1);
}

export const env = data;
