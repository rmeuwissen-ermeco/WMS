import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ZodValidationPipe, z } from "../../common/zod";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProductsService } from "./products.service";

const CreateSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  ean: z.string().min(1).optional().nullable(),
  track_serial: z.boolean(),
});

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  ean: z.string().min(1).optional().nullable(),
  track_serial: z.boolean().optional(),
});

@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Get("/products")
  async list(@Query("query") query?: string) {
    return this.products.list(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/products/:id")
  async get(@Param("id") id: string) {
    return this.products.get(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/products")
  async create(@Body(new ZodValidationPipe(CreateSchema)) body: z.infer<typeof CreateSchema>) {
    return this.products.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("/products/:id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(PatchSchema)) body: z.infer<typeof PatchSchema>,
  ) {
    return this.products.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/products/:id/serials")
  async serials(@Param("id") id: string) {
    return this.products.listSerials(id);
  }
}