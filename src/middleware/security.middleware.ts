import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private rateLimiter: any;

  constructor(private configService: ConfigService) {
    // Configure rate limiting with development-friendly settings
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    this.rateLimiter = rateLimit({
      windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 minutes in prod
      max: isDevelopment ? 1000 : 100, // 1000 requests per minute in dev, 100 in prod
      message: {
        error: 'Too many requests from this IP, please try again later.',
        environment: isDevelopment ? 'development' : 'production'
      },
      standardHeaders: true,
      legacyHeaders: false,
      
      // More permissive skip logic for development
      skip: (req) => {
        if (isDevelopment) {
          // In development, skip rate limiting for most common development patterns
          const developmentPatterns = [
            '127.0.0.1', '::1', 'localhost', 
            '192.168.', '10.0.', '172.16.',  // Common local network ranges
            'lovable.app', 'ngrok.io'        // Common development domains
          ];
          
          const clientIP = req.ip || req.connection?.remoteAddress || '';
          const origin = req.get('origin') || '';
          const host = req.get('host') || '';
          
          return developmentPatterns.some(pattern => 
            clientIP.includes(pattern) || 
            origin.includes(pattern) || 
            host.includes(pattern)
          );
        }
        
        // Production: only skip for localhost
        const trustedIPs = ['127.0.0.1', '::1'];
        const clientIP = req.ip || req.connection?.remoteAddress || '';
        return trustedIPs.some(ip => clientIP.includes(ip));
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Development-friendly helmet configuration
    if (isDevelopment) {
      // Very permissive configuration for development
      helmet({
        contentSecurityPolicy: false, // Disable CSP in development
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        hsts: false, // Disable HSTS in development
      })(req, res, () => {
        this.rateLimiter(req, res, next);
      });
    } else {
      // Production security headers
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"],
          },
        },
        crossOriginEmbedderPolicy: false,
      })(req, res, () => {
        this.rateLimiter(req, res, next);
      });
    }
  }
}
