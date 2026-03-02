import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ZodValidationPipe, z } from "../../common/zod";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { StockService } from "./stock.service";

const ReceiveSchema = z.object({
  request_id: z.string().uuid(),
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  meta: z.any().optional(),
  serials: z.array(z.string().min(1)).optional(),
});

@Controller()
export class StockController {
  constructor(private readonly stock: StockService) {}

  @UseGuards(JwtAuthGuard)
  @Post("/mutations/receive")
  async receive(@Body(new ZodValidationPipe(ReceiveSchema)) body: z.infer<typeof ReceiveSchema>) {
    return this.stock.receive(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/mutations/reserve")
  async reserve(@Body(new ZodValidationPipe(ReceiveSchema)) body: z.infer<typeof ReceiveSchema>) {
    return this.stock.reserve(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/mutations/ship")
  async ship(@Body(new ZodValidationPipe(ReceiveSchema)) body: z.infer<typeof ReceiveSchema>) {
    return this.stock.ship(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/mutations/adjust")
  async adjust(@Body(new ZodValidationPipe(ReceiveSchema)) body: z.infer<typeof ReceiveSchema>) {
    return this.stock.adjust(body);
  }
}