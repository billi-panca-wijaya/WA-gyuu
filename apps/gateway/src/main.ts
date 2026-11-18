import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParserModule from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

const cookieParser = (cookieParserModule as any).default || cookieParserModule;

async function bootstrap() {
  const logger = new Logger('WAgyuuGateway');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 18091);

  await app.listen(port);
  logger.log(`WAgyuu Central Gateway listening on port ${port} (proxy: http://127.0.0.1:${port})`);
}

bootstrap();
