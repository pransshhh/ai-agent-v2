import { z } from "zod";

export const ZSuccessResponse = z.object({
  message: z.string()
});

export const ZErrorResponse = z.object({
  message: z.string(),
  code: z.string().optional()
});

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const schemaWithPagination = <T>(
  schema: z.ZodSchema<T>
): z.ZodSchema<PaginatedResponse<T>> =>
  z.object({
    data: z.array(schema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number()
  }) as z.ZodSchema<PaginatedResponse<T>>;
