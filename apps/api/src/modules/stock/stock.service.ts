import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, StockTxType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type BaseDto = {
  request_id: string;
  sku: string;
  qty: number;
  meta?: Prisma.InputJsonValue;
};

type ReceiveDto = BaseDto & {
  serials?: string[];
};

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  private computeAvailable(onHand: number, reserved: number) {
    return onHand - reserved;
  }

  async receive(dto: ReceiveDto) {
    const { request_id, sku, qty, meta, serials } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 1) idempotency
      const existing = await tx.stockTransaction.findUnique({ where: { requestId: request_id } });
      if (existing) return existing.meta ?? { reused: true, tx_id: existing.id };

      // 2) product
      const product = await tx.product.findUnique({ where: { sku } });
      if (!product) throw new NotFoundException("Unknown SKU");

      // 2b) serial rules
      if (serials && serials.length > 0) {
        if (!product.trackSerial) throw new ConflictException("Product does not track serials");
        if (serials.length !== qty) {
          throw new ConflictException({
            message: "qty must match serials.length",
            qty,
            serials: serials.length,
          });
        }
        // simpele dedupe check
        const uniq = new Set(serials);
        if (uniq.size !== serials.length) {
          throw new ConflictException("Duplicate serials in request");
        }
      }

      // 3) ensure balance exists
      await tx.stockBalance.upsert({
        where: { productId: product.id },
        update: {},
        create: { productId: product.id, onHand: 0, reserved: 0 },
      });

      // 4) lock balance row
      const rows = await tx.$queryRaw<Array<{ productId: string; onHand: number; reserved: number }>>(
        Prisma.sql`
          SELECT "productId", "onHand", "reserved"
          FROM "StockBalance"
          WHERE "productId" = ${product.id}
          FOR UPDATE
        `,
      );
      if (rows.length !== 1) throw new ConflictException("Balance lock failed");

      const before = rows[0];
      const afterOnHand = before.onHand + qty;
      const afterReserved = before.reserved;

      // 5) serial inserts (same tx, before commit)
      if (serials && serials.length > 0) {
        // status enums: pas aan als jouw enum anders heet
        await tx.serialNumber.createMany({
          data: serials.map((s) => ({
            productId: product.id,
            serial: s,
            status: "ON_HAND" as any,
          })),
          // skipDuplicates: false => unique violation => error (goed)
        });
      }

      // 6) update cache (same tx)
      await tx.stockBalance.update({
        where: { productId: product.id },
        data: { onHand: afterOnHand, reserved: afterReserved },
      });

      const response = {
        tx_type: "RECEIVE",
        sku,
        qty,
        before: {
          on_hand: before.onHand,
          reserved: before.reserved,
          available: this.computeAvailable(before.onHand, before.reserved),
        },
        after: {
          on_hand: afterOnHand,
          reserved: afterReserved,
          available: this.computeAvailable(afterOnHand, afterReserved),
        },
      };

      const safeMeta: Prisma.InputJsonValue | null =
        meta === undefined ? null : (meta as Prisma.InputJsonValue);

      await tx.stockTransaction.create({
        data: {
          requestId: request_id,
          type: StockTxType.RECEIVE,
          productId: product.id,
          qty,
          deltaOnHand: qty,
          deltaReserved: 0,
          meta: {
            request: { request_id, sku, qty, meta: safeMeta, serials: serials ?? null },
            response,
          } as Prisma.InputJsonValue,
        },
      });

      return response;
    });
  }

  // --- Jouw bestaande methods blijven zoals ze al werken ---
  async reserve(dto: BaseDto) {
    const { request_id, sku, qty, meta } = dto;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockTransaction.findUnique({ where: { requestId: request_id } });
      if (existing) return existing.meta ?? { reused: true, tx_id: existing.id };

      const product = await tx.product.findUnique({ where: { sku } });
      if (!product) throw new NotFoundException("Unknown SKU");

      await tx.stockBalance.upsert({
        where: { productId: product.id },
        update: {},
        create: { productId: product.id, onHand: 0, reserved: 0 },
      });

      const rows = await tx.$queryRaw<Array<{ productId: string; onHand: number; reserved: number }>>(
        Prisma.sql`
          SELECT "productId", "onHand", "reserved"
          FROM "StockBalance"
          WHERE "productId" = ${product.id}
          FOR UPDATE
        `,
      );
      if (rows.length !== 1) throw new ConflictException("Balance lock failed");

      const before = rows[0];
      const available = this.computeAvailable(before.onHand, before.reserved);
      if (available < qty) {
        throw new ConflictException({ message: "Insufficient available stock", available, requested: qty });
      }

      const afterOnHand = before.onHand;
      const afterReserved = before.reserved + qty;

      await tx.stockBalance.update({
        where: { productId: product.id },
        data: { onHand: afterOnHand, reserved: afterReserved },
      });

      const safeMeta: Prisma.InputJsonValue | null =
        meta === undefined ? null : (meta as Prisma.InputJsonValue);

      const response = {
        tx_type: "RESERVE",
        sku,
        qty,
        before: { on_hand: before.onHand, reserved: before.reserved, available },
        after: {
          on_hand: afterOnHand,
          reserved: afterReserved,
          available: this.computeAvailable(afterOnHand, afterReserved),
        },
      };

      await tx.stockTransaction.create({
        data: {
          requestId: request_id,
          type: StockTxType.RESERVE,
          productId: product.id,
          qty,
          deltaOnHand: 0,
          deltaReserved: qty,
          meta: { request: { request_id, sku, qty, meta: safeMeta }, response } as Prisma.InputJsonValue,
        },
      });

      return response;
    });
  }

  async ship(dto: BaseDto) {
    const { request_id, sku, qty, meta } = dto;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockTransaction.findUnique({ where: { requestId: request_id } });
      if (existing) return existing.meta ?? { reused: true, tx_id: existing.id };

      const product = await tx.product.findUnique({ where: { sku } });
      if (!product) throw new NotFoundException("Unknown SKU");

      await tx.stockBalance.upsert({
        where: { productId: product.id },
        update: {},
        create: { productId: product.id, onHand: 0, reserved: 0 },
      });

      const rows = await tx.$queryRaw<Array<{ productId: string; onHand: number; reserved: number }>>(
        Prisma.sql`
          SELECT "productId", "onHand", "reserved"
          FROM "StockBalance"
          WHERE "productId" = ${product.id}
          FOR UPDATE
        `,
      );
      if (rows.length !== 1) throw new ConflictException("Balance lock failed");

      const before = rows[0];
      if (before.reserved < qty) {
        throw new ConflictException({
          message: "Insufficient reserved stock to ship",
          reserved: before.reserved,
          requested: qty,
        });
      }

      const afterOnHand = before.onHand - qty;
      const afterReserved = before.reserved - qty;

      await tx.stockBalance.update({
        where: { productId: product.id },
        data: { onHand: afterOnHand, reserved: afterReserved },
      });

      const safeMeta: Prisma.InputJsonValue | null =
        meta === undefined ? null : (meta as Prisma.InputJsonValue);

      const response = {
        tx_type: "SHIP",
        sku,
        qty,
        before: {
          on_hand: before.onHand,
          reserved: before.reserved,
          available: this.computeAvailable(before.onHand, before.reserved),
        },
        after: {
          on_hand: afterOnHand,
          reserved: afterReserved,
          available: this.computeAvailable(afterOnHand, afterReserved),
        },
      };

      await tx.stockTransaction.create({
        data: {
          requestId: request_id,
          type: StockTxType.SHIP,
          productId: product.id,
          qty,
          deltaOnHand: -qty,
          deltaReserved: -qty,
          meta: { request: { request_id, sku, qty, meta: safeMeta }, response } as Prisma.InputJsonValue,
        },
      });

      return response;
    });
  }

  async adjust(dto: BaseDto) {
    const { request_id, sku, qty, meta } = dto;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockTransaction.findUnique({ where: { requestId: request_id } });
      if (existing) return existing.meta ?? { reused: true, tx_id: existing.id };

      const product = await tx.product.findUnique({ where: { sku } });
      if (!product) throw new NotFoundException("Unknown SKU");

      await tx.stockBalance.upsert({
        where: { productId: product.id },
        update: {},
        create: { productId: product.id, onHand: 0, reserved: 0 },
      });

      const rows = await tx.$queryRaw<Array<{ productId: string; onHand: number; reserved: number }>>(
        Prisma.sql`
          SELECT "productId", "onHand", "reserved"
          FROM "StockBalance"
          WHERE "productId" = ${product.id}
          FOR UPDATE
        `,
      );
      if (rows.length !== 1) throw new ConflictException("Balance lock failed");

      const before = rows[0];
      const newOnHand = before.onHand + qty;
      if (newOnHand < before.reserved) {
        throw new ConflictException({
          message: "Adjust would make on_hand < reserved",
          on_hand_after: newOnHand,
          reserved: before.reserved,
        });
      }

      await tx.stockBalance.update({
        where: { productId: product.id },
        data: { onHand: newOnHand },
      });

      const safeMeta: Prisma.InputJsonValue | null =
        meta === undefined ? null : (meta as Prisma.InputJsonValue);

      const response = {
        tx_type: "ADJUST",
        sku,
        qty,
        before: {
          on_hand: before.onHand,
          reserved: before.reserved,
          available: this.computeAvailable(before.onHand, before.reserved),
        },
        after: {
          on_hand: newOnHand,
          reserved: before.reserved,
          available: this.computeAvailable(newOnHand, before.reserved),
        },
      };

      await tx.stockTransaction.create({
        data: {
          requestId: request_id,
          type: StockTxType.ADJUST,
          productId: product.id,
          qty,
          deltaOnHand: qty,
          deltaReserved: 0,
          meta: { request: { request_id, sku, qty, meta: safeMeta }, response } as Prisma.InputJsonValue,
        },
      });

      return response;
    });
  }
}