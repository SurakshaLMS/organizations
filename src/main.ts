import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import helmet from 'helmet';

async function bootstrap() {
  // Global BigInt serialization fix
  (BigInt.prototype as any).toJSON = function() {
    return this.toString();
  };

  const app = await NestFactory.create(AppModule);
  
  // Get configuration service
  const configService = app.get(ConfigService);
  
  // Get Prisma service for shutdown hooks
  const prismaService = app.get(PrismaService);
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    methods: configService.get<string>('app.corsMethods'),
    credentials: configService.get<boolean>('app.corsCredentials'),
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Transform payloads to be objects typed according to their DTO classes
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global BigInt serialization interceptor
  app.useGlobalInterceptors(new (class {
    intercept(context: any, next: any) {
      return next.handle().pipe(
        require('rxjs/operators').map((data: any) => {
          return this.sanitizeBigInt(data);
        })
      );
    }
    
    private sanitizeBigInt(data: any): any {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitizeBigInt(item));
      }
      
      if (data && typeof data === 'object') {
        const sanitized = { ...data };
        Object.keys(sanitized).forEach(key => {
          if (typeof sanitized[key] === 'bigint') {
            sanitized[key] = sanitized[key].toString();
          } else if (sanitized[key] && typeof sanitized[key] === 'object') {
            sanitized[key] = this.sanitizeBigInt(sanitized[key]);
          }
        });
        return sanitized;
      }
      
      return data;
    }
  })());

  // Global prefix
  app.setGlobalPrefix('organization/api/v1');

  // Prisma shutdown hooks
  await prismaService.enableShutdownHooks(app);

  // Start server
  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}/organization/api/v1`);
  console.log(`📚 API Documentation: http://localhost:${port}/organization/api/v1/docs`);
}

bootstrap().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});
