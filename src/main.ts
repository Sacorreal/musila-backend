import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RequestsStatusDto } from './requested-tracks/dto/requests-status.dto';


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
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('')
    .setDescription('')
    .setVersion('')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [RequestsStatusDto],
  })
  SwaggerModule.setup('api', app, document)

  await app.listen(process.env.PORT || 3000);

}
bootstrap();
