import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') || ['http://localhost:3000'], credentials: true });
  app.setGlobalPrefix(process.env.API_PREFIX || 'api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  const port = Number(process.env.API_PORT || 3001);
  await app.listen(port);
  console.log(`Dar Al-Safa API listening on http://localhost:${port}/${process.env.API_PREFIX || 'api'}`);
}
bootstrap();
