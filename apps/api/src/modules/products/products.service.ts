import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async list(query?: string) {
    const q = (query ?? "").trim();
    const where =
      q.length === 0
        ? undefined
        : {
            OR: [
              { sku: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
              { ean: { contains: q, mode: "insensitive" as const } },
            ],
          };

    const products = await this.prisma.product.findMany({
      where,
      take: 50,
      orderBy: { sku: "asc" },
      include: { balance: true },
    });

    return products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      ean: p.ean,
      track_serial: p.trackSerial,
      on_hand: p.balance?.onHand ?? 0,
      reserved: p.balance?.reserved ?? 0,
      available: (p.balance?.onHand ?? 0) - (p.balance?.reserved ?? 0),
    }));
  }

  async get(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { balance: true },
    });
    if (!p) throw new NotFoundException("Product not found");

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      ean: p.ean,
      track_serial: p.trackSerial,
      on_hand: p.balance?.onHand ?? 0,
      reserved: p.balance?.reserved ?? 0,
      available: (p.balance?.onHand ?? 0) - (p.balance?.reserved ?? 0),
    };
  }

  async create(data: { sku: string; name: string; ean?: string | null; track_serial: boolean }) {
    const created = await this.prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        ean: data.ean ?? null,
        trackSerial: data.track_serial,
        balance: { create: { onHand: 0, reserved: 0 } },
      },
    });
    return this.get(created.id);
  }

  async update(
    id: string,
    patch: { name?: string; ean?: string | null; track_serial?: boolean },
  ) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { balance: true },
    });
    if (!existing) throw new NotFoundException("Product not found");

    // track_serial toggles: conservatief (voorkomt inconsistenties)
    if (patch.track_serial !== undefined && patch.track_serial !== existing.trackSerial) {
      const onHand = existing.balance?.onHand ?? 0;
      const reserved = existing.balance?.reserved ?? 0;

      if (patch.track_serial === true && (onHand > 0 || reserved > 0)) {
        throw new ConflictException("Cannot enable track_serial while stock exists (on_hand/reserved > 0)");
      }

      if (patch.track_serial === false) {
        const serialCount = await this.prisma.serialNumber.count({ where: { productId: id } });
        if (serialCount > 0) {
          throw new ConflictException("Cannot disable track_serial while serial numbers exist");
        }
      }
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        name: patch.name ?? undefined,
        ean: patch.ean === undefined ? undefined : patch.ean,
        trackSerial: patch.track_serial ?? undefined,
      },
    });

    return this.get(id);
  }

  async listSerials(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException("Product not found");

    const serials = await this.prisma.serialNumber.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, serial: true, status: true, createdAt: true },
    });

    return serials;
  }
}