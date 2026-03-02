import { z } from "zod";

export const skuSchema = z
  .string()
  .trim()
  .min(1, "SKU is verplicht")
  .max(64, "SKU is te lang")
  .regex(/^[A-Za-z0-9._-]+$/, "Gebruik alleen letters/cijfers en . _ -");

export const eanSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? null : v))
  .refine(
    (v) => v === undefined || v === null || /^[0-9]{8,14}$/.test(v),
    "EAN moet 8–14 cijfers zijn (of leeg)"
  );

export const createProductSchema = z.object({
  sku: skuSchema,
  name: z.string().trim().min(1, "Naam is verplicht").max(200),
  ean: eanSchema,
  track_serial: z.boolean(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(200),
  ean: eanSchema,
  track_serial: z.boolean(),
});