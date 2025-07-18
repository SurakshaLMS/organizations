import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private rateLimiter: any;

  constructor(private configService: ConfigService) {
    // Configure rate limiting
    this.rateLimiter = rateLimit({
      windowMs: this.configService.get<number>('app.rateLimitWindowMs') || 15 * 60 * 1000, // 15 minutes
      max: this.configService.get<number>('app.rateLimitMaxRequests') || 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Apply helmet security headers
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })(req, res, () => {
      // Apply rate limiting
      this.rateLimiter(req, res, next);
    });
  }
}
