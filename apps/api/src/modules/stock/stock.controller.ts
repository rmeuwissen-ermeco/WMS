import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { StockService } from "./stock.service";
import { parseOrThrow, z } from "../../common/zod";

const Base = {
  request_id: z.string().uuid(),
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  meta: z.any().optional(),
};

const ReceiveSchema = z.object(Base);

const ReserveSchema = z.object(Base);

const ShipSchema = z.object(Base);

const AdjustSchema = z.object({
  request_id: z.string().uuid(),
  sku: z.string().min(1),
  // qty kan positief of negatief zijn bij adjust
  qty: z.number().int().refine((n) => n !== 0, "qty must be non-zero"),
  meta: z.any().optional(),
});

@Controller()
@UseGuards(AuthGuard("jwt"))
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Post("mutations/receive")
  async receive(@Body() body: unknown) {
    return this.stock.receive(parseOrThrow(ReceiveSchema, body));
  }

  @Post("mutations/reserve")
  async reserve(@Body() body: unknown) {
    return this.stock.reserve(parseOrThrow(ReserveSchema, body));
  }

  @Post("mutations/ship")
  async ship(@Body() body: unknown) {
    return this.stock.ship(parseOrThrow(ShipSchema, body));
  }

  @Post("mutations/adjust")
  async adjust(@Body() body: unknown) {
    return this.stock.adjust(parseOrThrow(AdjustSchema, body));
  }
}