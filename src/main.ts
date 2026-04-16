import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const logger = new Logger('Bootstrap');

  // ─── Global Pipes & Filters ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors();

  // ─── API Prefix ────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── Swagger ───────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('WhatsApp Notifier')
    .setDescription('Bulk WhatsApp Notification System via Baileys + NestJS')
    .setVersion('1.0')
    .addTag('WhatsApp', 'Connection management')
    .addTag('Notifications', 'Send messages')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ─── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 App running on: http://localhost:${port}`);
  logger.log(`📖 Swagger docs:   http://localhost:${port}/docs`);
  logger.log(`📱 Waiting for WhatsApp QR scan...`);
}

bootstrap();
