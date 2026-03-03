import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  (global as any).__express_app = app.getHttpAdapter().getInstance();
  app.enableCors({ origin: true, credentials: true });

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);

  console.log(`API listening on ${port}`);
}
bootstrap();