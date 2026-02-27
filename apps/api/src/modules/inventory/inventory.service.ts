import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private map(p: any) {
    const onHand = p.balance?.onHand ?? 0;
    const reserved = p.balance?.reserved ?? 0;

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      ean: p.ean,
      track_serial: p.trackSerial,
      on_hand: onHand,
      reserved,
      available: onHand - reserved,
    };
  }

  async search(query?: string) {
    const q = (query ?? "").trim();

    const where: Prisma.ProductWhereInput =
  q.length === 0
    ? {}
    : {
        OR: [
          { sku: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { ean: { contains: q } },
        ],
      };

    const products = await this.prisma.product.findMany({
      where,
      take: 50,
      orderBy: { sku: "asc" },
      include: { balance: true },
    });

    return products.map((p) => this.map(p));
  }

  async bySku(sku: string) {
    const p = await this.prisma.product.findUnique({
      where: { sku },
      include: { balance: true },
    });

    if (!p) throw new NotFoundException("Unknown SKU");
    return this.map(p);
  }
}