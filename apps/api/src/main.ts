import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin:
      process.env.CORS_ORIGIN?.split(',') ??
      (process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000'),
  });
  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();
