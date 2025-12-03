import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
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

  /**
   * Enhanced XSS Detection - Comprehensive patterns
   */
  private detectXSS(value: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^>]*>/gi,
      /<link\b[^>]*>/gi,
      /<meta\b[^>]*>/gi,
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers: onclick, onerror, etc.
      /on\w+\s*=\s*[^\s>]*/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /<img[^>]*src\s*=\s*["']?javascript:/gi,
      /<svg[^>]*onload\s*=/gi,
      /document\.cookie/gi,
      /document\.write/gi,
      /window\.location/gi,
      /eval\s*\(/gi,
      /<base\b[^>]*>/gi,
      /<form\b[^>]*action\s*=\s*["']?javascript:/gi,
      /expression\s*\(/gi, // CSS expression
      /import\s*\(/gi, // Dynamic imports
      /<\s*\/?\s*script/gi,
      /&#\d+;/g, // HTML entities that could be XSS
      /\\x[0-9a-fA-F]{2}/g, // Hex encoding
      /\\u[0-9a-fA-F]{4}/g, // Unicode encoding
    ];

    return xssPatterns.some(pattern => pattern.test(value));
  }

  /**
   * SQL Injection Detection
   */
  private detectSQLInjection(value: string): boolean {
    const sqlPatterns = [
      /(\bUNION\b.*\bSELECT\b)/gi,
      /(\bSELECT\b.*\bFROM\b)/gi,
      /(\bINSERT\b.*\bINTO\b)/gi,
      /(\bDELETE\b.*\bFROM\b)/gi,
      /(\bUPDATE\b.*\bSET\b)/gi,
      /(\bDROP\b.*\bTABLE\b)/gi,
      /(\bEXEC\b|\bEXECUTE\b)/gi,
      /(;.*--)|(--.*)/g, // SQL comments
      /('.*OR.*'.*=.*')/gi,
      /(\bOR\b.*\b1\s*=\s*1\b)/gi,
      /(\bAND\b.*\b1\s*=\s*1\b)/gi,
      /('.*OR.*'.*=.*'.*--)/gi,
      /(\/\*.*\*\/)/g, // SQL block comments
      /(\bxp_cmdshell\b)/gi,
    ];

    return sqlPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Path Traversal Detection
   */
  private detectPathTraversal(value: string): boolean {
    const pathPatterns = [
      /\.\.[\/\\]/g, // ../ or ..\
      /[\/\\]\.\.$/g, // Ends with /.. or \..
      /^\.\.$/g, // Exact '..'
      /%2e%2e[\/\\]/gi, // URL encoded ../
      /\.\.%2f/gi,
      /\.\.%5c/gi,
      /\.\.%252f/gi, // Double encoded
      /etc[\/\\]passwd/gi,
      /proc[\/\\]self/gi,
      /win\.ini/gi,
      /boot\.ini/gi,
    ];

    return pathPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Bulk Request Abuse Detection
   */
  private detectBulkAbuse(queryParams: any): boolean {
    // Check for suspicious large numbers in query parameters
    const suspiciousPatterns = [
      { key: 'limit', maxValue: 100 },
      { key: 'page', maxValue: 1000 },
      { key: 'count', maxValue: 100 },
      { key: 'size', maxValue: 100 },
      { key: 'take', maxValue: 100 },
      { key: 'offset', maxValue: 100000 },
      { key: 'skip', maxValue: 100000 },
    ];

    for (const pattern of suspiciousPatterns) {
      const value = queryParams[pattern.key];
      if (value) {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue > pattern.maxValue) {
          this.logger.warn(`[SECURITY] Bulk abuse attempt detected: ${pattern.key}=${numValue} exceeds max ${pattern.maxValue}`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Sanitize input recursively
   */
  private sanitizeInput(obj: any, depth = 0): any {
    // Prevent infinite recursion
    if (depth > 10) return obj;

    if (typeof obj === 'string') {
      // HTML encode dangerous characters
      return obj
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeInput(item, depth + 1));
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = this.sanitizeInput(obj[key], depth + 1);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Check for dangerous input recursively
   */
  private checkDangerousInput(obj: any, depth = 0): string | null {
    // Prevent infinite recursion
    if (depth > 10) return null;

    if (typeof obj === 'string') {
      if (this.detectXSS(obj)) {
        return 'XSS attack pattern detected';
      }
      if (this.detectSQLInjection(obj)) {
        return 'SQL injection pattern detected';
      }
      if (this.detectPathTraversal(obj)) {
        return 'Path traversal attack detected';
      }
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = this.checkDangerousInput(item, depth + 1);
        if (result) return result;
      }
    }

    if (obj !== null && typeof obj === 'object') {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const result = this.checkDangerousInput(obj[key], depth + 1);
          if (result) return result;
        }
      }
    }

    return null;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // SECURITY: Check for bulk abuse attempts
    if (this.detectBulkAbuse(req.query)) {
      this.logger.error('[SECURITY ALERT] Bulk abuse attempt blocked:', {
        ip: req.ip,
        query: req.query,
        path: req.path,
        method: req.method,
      });
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid query parameters - values exceed maximum allowed limits',
        error: 'Bad Request',
      });
    }

    // SECURITY: Validate input for XSS, SQL injection, path traversal
    const xssProtectionEnabled = this.configService.get<boolean>('XSS_PROTECTION', true);
    
    if (xssProtectionEnabled) {
      // Check query parameters
      const queryDanger = this.checkDangerousInput(req.query);
      if (queryDanger) {
        this.logger.error('[SECURITY ALERT] Attack blocked in query:', {
          ip: req.ip,
          attack: queryDanger,
          query: req.query,
          path: req.path,
        });
        return res.status(400).json({
          statusCode: 400,
          message: 'Invalid input detected',
          error: queryDanger,
        });
      }

      // Check body parameters
      const bodyDanger = this.checkDangerousInput(req.body);
      if (bodyDanger) {
        console.error('[SECURITY ALERT] Attack blocked in body:', {
          ip: req.ip,
          attack: bodyDanger,
          path: req.path,
        });
        return res.status(400).json({
          statusCode: 400,
          message: 'Invalid input detected',
          error: bodyDanger,
        });
      }

      // Check URL parameters
      const paramsDanger = this.checkDangerousInput(req.params);
      if (paramsDanger) {
        this.logger.error('[SECURITY ALERT] Attack blocked in params:', {
          ip: req.ip,
          attack: paramsDanger,
          params: req.params,
          path: req.path,
        });
        return res.status(400).json({
          statusCode: 400,
          message: 'Invalid input detected',
          error: paramsDanger,
        });
      }
    }

    // Apply Helmet security headers
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
      // Production security headers with MITM protection
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true, // MITM protection
        },
        frameguard: {
          action: 'deny', // Prevent clickjacking
        },
        noSniff: true, // Prevent MIME sniffing
        referrerPolicy: {
          policy: 'strict-origin-when-cross-origin',
        },
      })(req, res, () => {
        this.rateLimiter(req, res, next);
      });
    }
  }
}

