import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { StockModule } from "./modules/stock/stock.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { ProductsModule } from "./modules/products/products.module";
import { RoutesDebugController } from "./routes-debug.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    StockModule,
    InventoryModule,
    ProductsModule,
  ],
  controllers: [HealthController, RoutesDebugController],
})
export class AppModule {}