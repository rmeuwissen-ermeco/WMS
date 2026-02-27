import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, StockTxType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type ReceiveDto = {
  request_id: string;
  sku: string;
  qty: number;
  meta?: Prisma.InputJsonValue;
};

type AdjustDto = {
  request_id: string;
  sku: string;
  qty: number; // non-zero (controller en zod doen de check)
  meta?: Prisma.InputJsonValue;
};

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  private computeAvailable(onHand: number, reserved: number) {
    return onHand - reserved;
  }

  private safeJson(meta: Prisma.InputJsonValue | undefined): Prisma.InputJsonValue | null {
    return meta === undefined ? null : meta;
  }

  async receive(dto: ReceiveDto) {
    const { request_id, sku, qty, meta } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 1) idempotency
      const existing = await tx.stockTransaction.findUnique({ where: { requestId: request_id } });
      if (existing) {
        // we stored response in meta; return that
        return (existing.meta as any) ?? { reused: true, tx_id: existing.id };
      }

      // 2) product
      const product = await tx.product.findUnique({ where: { sku } });
      if (!product) throw new NotFoundException("Unknown SKU");

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

      // 5) update cache (same tx)
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

      const safeMeta = this.safeJson(meta);

      // 6) ledger insert
      await tx.stockTransaction.create({
        data: {
          requestId: request_id,
          type: StockTxType.RECEIVE,
          productId: product.id,
          qty,
          deltaOnHand: qty,
          deltaReserved: 0,
          meta: {
            request: { request_id, sku, qty, meta: safeMeta },
            response,
          } as Prisma.InputJsonValue,
        },
      });

      return response;
    });
  }

  async reserve(dto: ReceiveDto) {
    const { request_id, sku, qty, meta } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 1) idempotency
      const existing = await tx.stockTransaction.findUnique({ where: { requestId: request_id } });
      if (existing) return (existing.meta as any) ?? { reused: true, tx_id: existing.id };

      // 2) product
      const product = await tx.product.findUnique({ where: { sku } });
      if (!product) throw new NotFoundException("Unknown SKU");

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
      const available = this.computeAvailable(before.onHand, before.reserved);
      if (available < qty) {
        throw new ConflictException({
          message: "Insufficient available stock",
          available,
          requested: qty,
        });
      }

      const afterOnHand = before.onHand;
      const afterReserved = before.reserved + qty;

      // 5) update cache
      await tx.stockBalance.update({
        where: { productId: product.id },
        data: { onHand: afterOnHand, reserved: afterReserved },
      });

      const response = {
        tx_type: "RESERVE",
        sku,
        qty,
        before: {
          on_hand: before.onHand,
          reserved: before.reserved,
          available,
        },
        after: {
          on_hand: afterOnHand,
          reserved: afterReserved,
          available: this.computeAvailable(afterOnHand, afterReserved),
        },
      };

      const safeMeta = this.safeJson(meta);

      // 6) ledger insert
      await tx.stockTransaction.create({
        data: {
          requestId: request_id,
          type: StockTxType.RESERVE,
          productId: product.id,
          qty,
          deltaOnHand: 0,
          deltaReserved: qty,
          meta: {
            request: { request_id, sku, qty, meta: safeMeta },
            response,
          } as Prisma.InputJsonValue,
        },
      });

      return response;
    });
  }

  async ship(dto: ReceiveDto) {
    const { request_id, sku, qty, meta } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 1) idempotency
      const existing = await tx.stockTransaction.findUnique({ where: { requestId: request_id } });
      if (existing) return (existing.meta as any) ?? { reused: true, tx_id: existing.id };

      // 2) product
      const product = await tx.product.findUnique({ where: { sku } });
      if (!product) throw new NotFoundException("Unknown SKU");

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

      // SHIP requires reserved >= qty
      if (before.reserved < qty) {
        throw new ConflictException({
          message: "Insufficient reserved stock to ship",
          reserved: before.reserved,
          requested: qty,
        });
      }

      const afterOnHand = before.onHand - qty;
      const afterReserved = before.reserved - qty;

      // 5) update cache
      await tx.stockBalance.update({
        where: { productId: product.id },
        data: { onHand: afterOnHand, reserved: afterReserved },
      });

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

      const safeMeta = this.safeJson(meta);

      // 6) ledger insert
      await tx.stockTransaction.create({
        data: {
          requestId: request_id,
          type: StockTxType.SHIP,
          productId: product.id,
          qty,
          deltaOnHand: -qty,
          deltaReserved: -qty,
          meta: {
            request: { request_id, sku, qty, meta: safeMeta },
            response,
          } as Prisma.InputJsonValue,
        },
      });

      return response;
    });
  }

  async adjust(dto: AdjustDto) {
    const { request_id, sku, qty, meta } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 1) idempotency
      const existing = await tx.stockTransaction.findUnique({ where: { requestId: request_id } });
      if (existing) return (existing.meta as any) ?? { reused: true, tx_id: existing.id };

      // 2) product
      const product = await tx.product.findUnique({ where: { sku } });
      if (!product) throw new NotFoundException("Unknown SKU");

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

      // Adjust must not make onHand < reserved
      const afterOnHand = before.onHand + qty;
      if (afterOnHand < before.reserved) {
        throw new ConflictException({
          message: "Adjust would make on_hand < reserved",
          on_hand_after: afterOnHand,
          reserved: before.reserved,
        });
      }

      // 5) update cache
      await tx.stockBalance.update({
        where: { productId: product.id },
        data: { onHand: afterOnHand },
      });

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
          on_hand: afterOnHand,
          reserved: before.reserved,
          available: this.computeAvailable(afterOnHand, before.reserved),
        },
      };

      const safeMeta = this.safeJson(meta);

      // 6) ledger insert
      await tx.stockTransaction.create({
        data: {
          requestId: request_id,
          type: StockTxType.ADJUST,
          productId: product.id,
          qty,
          deltaOnHand: qty,
          deltaReserved: 0,
          meta: {
            request: { request_id, sku, qty, meta: safeMeta },
            response,
          } as Prisma.InputJsonValue,
        },
      });

      return response;
    });
  }
}