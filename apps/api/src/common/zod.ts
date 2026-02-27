import { BadRequestException } from "@nestjs/common";
import { z, ZodSchema } from "zod";

export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const res = schema.safeParse(data);
  if (!res.success) {
    throw new BadRequestException({ message: "Invalid request", issues: res.error.issues });
  }
  return res.data;
}
export { z };
