import { BadRequestException, PipeTransform } from "@nestjs/common";
import { z, ZodSchema } from "zod";

export { z };

// Handig voor plekken waar je direct wil parsen (zoals auth.controller)
export function parseOrThrow<T>(schema: ZodSchema<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException({
      message: "Invalid request",
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}

// Pipe voor NestJS @Body(new ZodValidationPipe(schema))
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Invalid request",
        issues: parsed.error.issues,
      });
    }
    return parsed.data;
  }
}