import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import helmet from 'helmet';

if (process.env.NODE_ENV === 'local') {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}
import { AppModule } from './app.module';
import { RequestsStatusDto } from './requested-tracks/dto/requests-status.dto';
import * as cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const isLocal = process.env.NODE_ENV === 'local';
  const allowedOrigins = new Set(
    [
      process.env.WEB_APP_PRODUCTION,
      process.env.WEB_APP_DEVELOPMENT,
      process.env.WEB_APP_LOCAL,
      // Siempre permite localhost en modo local para desarrollo sin dev tunnel
      ...(isLocal ? ['http://localhost:3000', 'http://localhost:3001'] : []),
    ].filter(Boolean) as string[],
  );

  // Permite preview deployments de Vercel para este proyecto
  const vercelPreviewRe = /^https:\/\/musila-web-app[^.]*\.vercel\.app$/;

  app.use(cookieParser.default());

  app.enableCors({
    origin: (origin, callback) => {
      // Peticiones sin origin (curl, Postman, mismo servidor)
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin) || vercelPreviewRe.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin no permitido: ${origin}`));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Musila Backend')
    .setDescription(
      'API REST para la plataforma Musila. Documentación completa de todos los servicios y controladores disponibles.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [RequestsStatusDto],
  });
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
