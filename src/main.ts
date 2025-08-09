import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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

  // Global exception filter for enhanced error handling
  app.useGlobalFilters(new GlobalExceptionFilter());

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
    
    // Optimized BigInt serialization for production
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

  // Port configuration
  const port = configService.get<number>('app.port') || 3000;

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Organization Management API')
    .setDescription(`
## Organization Management System API

Complete API for managing organizations with role-based access control.

### Authentication
All protected endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

### Role Hierarchy
- **PRESIDENT** (Level 4): Full organization control
- **ADMIN** (Level 3): Organization management  
- **MODERATOR** (Level 2): Content moderation
- **MEMBER** (Level 1): Basic membership

### JWT Token Structure
JWT tokens include organization access in compact format:
- \`P\` = PRESIDENT, \`A\` = ADMIN, \`O\` = MODERATOR, \`M\` = MEMBER
- Example: \`"Porg-456"\` means user is PRESIDENT of organization 456

### Rate Limiting
Different endpoints have specific rate limits:
- Create operations: 5-10 per minute
- Read operations: 50-100 per minute  
- Update operations: 10-20 per minute
- Delete operations: 2-5 per minute

### Error Handling
Standard HTTP status codes with detailed error messages:
- 400: Bad Request (validation errors)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource not found)
- 429: Too Many Requests (rate limit exceeded)
    `)
    .setVersion('2.0.0')
    .setContact(
      'Development Team',
      'https://github.com/SurakshaLMS/organizations',
      'dev@suraksha.edu'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Development Server')
    .addServer('https://api.suraksha.edu', 'Production Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token (without Bearer prefix)',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('Organizations', 'Organization CRUD operations and public access')
    .addTag('Organization Management', 'Advanced organization management for ADMIN/PRESIDENT roles')
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Institutes', 'Institute management and associations')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  // Enhanced Swagger UI options
  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: false,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      syntaxHighlight: {
        theme: 'monokai'
      }
    },
    customSiteTitle: 'Organization Management API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  console.log(`📚 Swagger UI available at: http://localhost:${port}/api/docs`);

  // Prisma shutdown hooks
  await prismaService.enableShutdownHooks(app);

  // Start server
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}/organization/api/v1`);
  console.log(`📚 API Documentation: http://localhost:${port}/organization/api/v1/docs`);
}

bootstrap().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});
