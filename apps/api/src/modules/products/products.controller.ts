import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ZodValidationPipe, z } from "../../common/zod";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProductsService } from "./products.service";

const ListQuerySchema = z.object({
  query: z.string().optional(),
});

const CreateProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  ean: z.string().nullable().optional(),
  track_serial: z.boolean(),
});

const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  ean: z.string().nullable().optional(),
  track_serial: z.boolean().optional(),
});

@Controller("products")
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(ListQuerySchema)) q: { query?: string }) {
    return this.products.list(q.query ?? "");
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.products.get(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(CreateProductSchema)) body: z.infer<typeof CreateProductSchema>) {
    return this.products.create(body);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateProductSchema)) body: z.infer<typeof UpdateProductSchema>
  ) {
    return this.products.update(id, body);
  }

  @Get(":id/serials")
  listSerials(@Param("id") id: string) {
    return this.products.listSerials(id);
  }
}