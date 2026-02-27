import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { InventoryService } from "./inventory.service";

@Controller()
@UseGuards(AuthGuard("jwt"))
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Get("inventory")
  async search(@Query("query") query?: string) {
    return this.inventory.search(query);
  }

  @Get("inventory/:sku")
  async bySku(@Param("sku") sku: string) {
    return this.inventory.bySku(sku);
  }
}