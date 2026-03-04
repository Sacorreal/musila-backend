import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

if (process.env.NODE_ENV === 'local') {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}
import { AppModule } from './app.module';
import { RequestsStatusDto } from './requested-tracks/dto/requests-status.dto';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  const allowedOrigins = [
    process.env.WEB_APP_PRODUCTION,
    process.env.WEB_APP_DEVELOPMENT, 
    process.env.WEB_APP_LOCAL,
  ].filter(Boolean); 


  app.use(cookieParser.default());

  app.enableCors({
    origin: allowedOrigins,
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

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
