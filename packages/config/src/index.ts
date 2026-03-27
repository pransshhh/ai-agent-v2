import { z } from "zod";

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"])
});

export const parseEnv = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables");
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
};
