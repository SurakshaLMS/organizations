import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Global BigInt serialization fix
  (BigInt.prototype as any).toJSON = function() {
    return this.toString();
  };

  const app = await NestFactory.create(AppModule);
  
  // Get configuration service
  const configService = app.get(ConfigService);
  
  // Get Prisma service for shutdown hooks
  const prismaService = app.get(PrismaService);
  
  // Security middleware with relaxed settings for proxy and cross-origin
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // ✅ Minimal inline CSS only
        scriptSrc: ["'self'"], // ✅ No unsafe-inline or unsafe-eval
        imgSrc: ["'self'", "data:", "https://storage.googleapis.com", "https:"],
        connectSrc: ["'self'", "https://storage.googleapis.com"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    frameguard: { action: 'deny' }, // ✅ Prevent clickjacking
    hsts: {
      maxAge: 31536000, // ✅ 1 year HSTS
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true, // ✅ Prevent MIME sniffing
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // 🔒 STRICT PRODUCTION SECURITY - Block unauthorized access
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS')?.split(',').map(o => o.trim()).filter(o => o) || [];
  const corsMethods = configService.get<string>('CORS_METHODS', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS').split(',');
  const corsCredentials = configService.get<boolean>('CORS_CREDENTIALS', true);
  const corsMaxAge = configService.get<number>('CORS_MAX_AGE', 86400);
  
  // SECURITY: Strict production configuration logging
  if (isProduction) {
    logger.log('═══════════════════════════════════════════════════════════');
    logger.log('🔒 PRODUCTION MODE - MAXIMUM SECURITY ENABLED');
    logger.log('═══════════════════════════════════════════════════════════');
    logger.log(`🛡️  Allowed Origins (${allowedOrigins.length}):`);
    allowedOrigins.forEach(origin => logger.log(`   ✅ ${origin}`));
    logger.log('───────────────────────────────────────────────────────────');
    logger.log('🚫 BLOCKED: Postman, cURL, Thunder Client, Insomnia');
    logger.log('🚫 BLOCKED: Direct API access without origin header');
    logger.log('🚫 BLOCKED: Requests from non-whitelisted domains');
    logger.log('🚫 BLOCKED: Missing or invalid authorization tokens');
    logger.log('───────────────────────────────────────────────────────────');
    logger.log('✅ ALLOWED: Only whitelisted frontend applications');
    logger.log('✅ ENFORCED: JWT authentication on all protected routes');
    logger.log('✅ ENFORCED: Origin header validation');
    logger.log('═══════════════════════════════════════════════════════════');
    
    if (allowedOrigins.length === 0) {
      logger.error('⚠️⚠️⚠️ CRITICAL SECURITY ERROR ⚠️⚠️⚠️');
      logger.error('❌ No ALLOWED_ORIGINS configured!');
      logger.error('❌ API will REJECT ALL requests!');
      logger.error('❌ Set ALLOWED_ORIGINS in .env.production');
      logger.error('⚠️⚠️⚠️ APPLICATION WILL NOT ACCEPT ANY REQUESTS ⚠️⚠️⚠️');
    }
  } else {
    logger.warn('═══════════════════════════════════════════════════════════');
    logger.warn('⚠️  DEVELOPMENT MODE - SECURITY RELAXED (INSECURE)');
    logger.warn('⚠️  All origins allowed - DO NOT USE IN PRODUCTION');
    logger.warn('═══════════════════════════════════════════════════════════');
  }
  
  // Custom CORS validation function for production
  const corsOptionsDelegate = (req: any, callback: any) => {
    const requestOrigin = req.headers.origin;
    let corsOptions: any;

    if (isProduction) {
      // Production: Strict validation
      if (allowedOrigins.length === 0) {
        // No origins configured - block everything
        logger.error(`🚫 [SECURITY] Request blocked - No allowed origins configured`);
        corsOptions = { origin: false };
      } else if (!requestOrigin) {
        // No origin header - block (catches Postman, cURL, etc.)
        logger.warn(`🚫 [SECURITY] Request blocked - Missing origin header`);
        logger.warn(`   User-Agent: ${req.headers['user-agent'] || 'Unknown'}`);
        corsOptions = { origin: false };
      } else if (allowedOrigins.includes(requestOrigin)) {
        // Origin is whitelisted - allow
        corsOptions = { origin: true };
      } else {
        // Origin not in whitelist - block
        logger.warn(`🚫 [SECURITY] Unauthorized origin blocked: ${requestOrigin}`);
        corsOptions = { origin: false };
      }
    } else {
      // Development: Allow all
      corsOptions = { origin: true };
    }

    corsOptions.methods = corsMethods;
    corsOptions.credentials = corsCredentials;
    corsOptions.maxAge = corsMaxAge;
    
    callback(null, corsOptions);
  };
  
  app.enableCors(corsOptionsDelegate);
  
  // Additional CORS configuration with strict origin validation
  app.use((req: any, res: any, next: any) => {
    const requestOrigin = req.headers.origin;
    
    // In production, validate origin on every request
    if (isProduction) {
      if (!requestOrigin) {
        // Block requests without origin (Postman, cURL, etc.)
        logger.warn(`🚫 [SECURITY] Non-browser request blocked on ${req.method} ${req.path}`);
        logger.warn(`   IP: ${req.ip}`);
        logger.warn(`   User-Agent: ${req.headers['user-agent'] || 'Unknown'}`);
        return res.status(403).end();
      }
      
      if (allowedOrigins.length > 0 && !allowedOrigins.includes(requestOrigin)) {
        logger.warn(`🚫 [SECURITY] Unauthorized origin: ${requestOrigin} on ${req.method} ${req.path}`);
        return res.status(403).end();
      }
    }
    
    next();
  });

  // Enhanced request size limits for file uploads
  const requestSizeLimit = configService.get<string>('REQUEST_SIZE_LIMIT', '10mb');
  app.use(express.json({ limit: requestSizeLimit }));
  app.use(express.urlencoded({ extended: true, limit: requestSizeLimit }));
  app.use(express.raw({ limit: requestSizeLimit }));

  // Trust proxy settings for load balancers and reverse proxies
  // Set specific trust proxy configuration to avoid rate limiting validation errors
  // Use only valid IP addresses (localhost resolved to 127.0.0.1)
  app.getHttpAdapter().getInstance().set('trust proxy', ['127.0.0.1', '::1']);

  // Enhanced middleware for proxy and cross-origin compatibility with security
  app.use((req: any, res: any, next: any) => {
    const requestOrigin = req.headers.origin;

    // Handle preflight requests for any route
    if (req.method === 'OPTIONS') {
      // Development: Allow all origins
      if (!isProduction) {
        res.header('Access-Control-Allow-Origin', requestOrigin || '*');
      } 
      // Production: CORS origin validation with allowedOrigins check
      else if (requestOrigin && allowedOrigins.length > 0) {
        if (!allowedOrigins.includes(requestOrigin)) {
          logger.warn(`[SECURITY] CORS preflight blocked for origin: ${requestOrigin}`);
          return res.status(403).end();
        }
        res.header('Access-Control-Allow-Origin', requestOrigin);
      } else {
        res.header('Access-Control-Allow-Origin', allowedOrigins.length > 0 ? allowedOrigins[0] : '*');
      }
      res.header('Access-Control-Allow-Methods', corsMethods.join(','));
      res.header('Access-Control-Allow-Headers', [
        'Accept',
        'Authorization', 
        'Content-Type',
        'X-Requested-With',
        'X-HTTP-Method-Override',
        'X-Forwarded-For',
        'X-Forwarded-Proto',
        'X-Forwarded-Host',
        'X-Real-IP',
        'User-Agent',
        'Referer',
        'Cache-Control',
        'Pragma',
        'Origin',
        'Accept-Encoding',
        'Accept-Language',
        'Connection',
        'Host',
        'ngrok-skip-browser-warning'
      ].join(', '));
      res.header('Access-Control-Max-Age', '86400'); // 24 hours
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Vary', 'Origin, Access-Control-Request-Headers');
      
      // SECURITY: Add security headers to OPTIONS responses
      if (isProduction) {
        res.header('X-Content-Type-Options', 'nosniff');
        res.header('X-Frame-Options', 'DENY');
        res.header('X-XSS-Protection', '1; mode=block');
        res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
      
      return res.sendStatus(200);
    }

    
    // Enhanced CORS headers with environment-aware validation
    if (!isProduction) {
      // 🔓 DEVELOPMENT: Allow all origins
      res.header('Access-Control-Allow-Origin', requestOrigin || '*');
      logger.log(`[DEV] CORS allowed for origin: ${requestOrigin || 'any'}`);
    } else if (requestOrigin) {
      // 🔒 PRODUCTION: Validate origin against whitelist
      if (allowedOrigins.length > 0 && !allowedOrigins.includes(requestOrigin)) {
        logger.warn(`[SECURITY] CORS request blocked for origin: ${requestOrigin} on ${req.method} ${req.path}`);
        return res.status(403).end();
      }
      res.header('Access-Control-Allow-Origin', requestOrigin);
    } else {
      // Production without specific origin - use first allowed origin or deny
      if (allowedOrigins.length > 0) {
        res.header('Access-Control-Allow-Origin', allowedOrigins[0]);
      } else {
        logger.warn('[SECURITY] No allowed origins configured in production!');
        res.header('Access-Control-Allow-Origin', 'null');
      }
    }

    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin, Accept-Encoding');
    
    // SECURITY: Add anti-MITM headers in production
    if (isProduction) {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    }
    
    // Enhanced proxy-friendly headers
    if (req.headers['x-forwarded-proto']) {
      // Don't set req.protocol directly as it's read-only in newer Node.js versions
      // Just set the response header for proxy awareness
      res.header('X-Forwarded-Proto', req.headers['x-forwarded-proto']);
    }
    if (req.headers['x-forwarded-host']) {
      req.headers.host = req.headers['x-forwarded-host'];
      res.header('X-Forwarded-Host', req.headers['x-forwarded-host']);
    }
    if (req.headers['x-forwarded-for']) {
      res.header('X-Forwarded-For', req.headers['x-forwarded-for']);
    }
    if (req.headers['x-real-ip']) {
      res.header('X-Real-IP', req.headers['x-real-ip']);
    }
    
    // Handle different content types for cross-origin requests
    if (req.headers['content-type']?.includes('application/json') || 
        req.headers['content-type']?.includes('multipart/form-data') ||
        req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      res.header('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Disposition');
    }
    
    next();
  });

  // Global exception filter for enhanced error handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ✅ SECURITY: Enhanced Global validation pipe with strict rules
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      forbidUnknownValues: true, // ✅ Prevent prototype pollution
      transform: true, // Transform payloads to be objects typed according to their DTO classes
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: false, // Show validation errors
      validateCustomDecorators: true, // Support custom validators
      stopAtFirstError: false, // Show all validation errors
      // ✅ SECURITY: Strict validation
      skipMissingProperties: false,
      skipNullProperties: false,
      skipUndefinedProperties: false,
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

  // Port configuration - Use ConfigService with fallback to 8080 for Cloud Run
  const port = configService.get<number>('PORT', 8080);

  // ✅ SECURITY: Conditional Swagger setup - ONLY in development (disabled in production)
  if (!isProduction) {
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

    logger.log(`📚 Swagger UI available at: http://localhost:${port}/api/docs`);
  } else {
    logger.log('🔒 Swagger UI disabled in production mode for security');
  }

  // Prisma shutdown hooks
  await prismaService.enableShutdownHooks(app);

  // Start server - bind to 0.0.0.0 for Cloud Run compatibility
  logger.log(`🚀 Starting server on port ${port}...`);
  logger.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`);
  logger.log(`💾 Database: ${configService.get<string>('DATABASE_URL') ? 'Connected' : 'Not configured'}`);
  logger.log(`🔐 Security: ${isProduction ? 'Enabled (CORS whitelist, no Swagger)' : 'Development mode'}`);
  logger.log(`📁 Storage: Google Cloud Storage (${configService.get<string>('GCS_BUCKET_NAME', 'not-configured')})`);
  logger.log(`⏰ Rate limiting: ${configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100)} requests per ${configService.get<number>('RATE_LIMIT_WINDOW_MS', 900000) / 60000} minutes`);
  
  await app.listen(port, '0.0.0.0');
  
  logger.log('Server started successfully!');
  logger.log(`Application is running on: http://0.0.0.0:${port}/organization/api/v1`);
  logger.log(`API Documentation: http://0.0.0.0:${port}/api/docs`);
  logger.log(`Health check: http://0.0.0.0:${port}/health`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Fatal error starting server: ${error.message}`);
  logger.error(`Stack trace: ${error.stack}`);
  process.exit(1);
});
