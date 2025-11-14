import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly encryptionKey: Buffer;
  private readonly ivLength: number;

  constructor(private configService: ConfigService) {
    const keyString = this.configService.get<string>('PASSWORD_ENCRYPTION_KEY') || '';
    this.encryptionKey = crypto.createHash('sha256').update(keyString).digest();
    this.ivLength = this.configService.get<number>('PASSWORD_ENCRYPTION_IV_LENGTH', 16);
  }

  /**
   * Encrypt sensitive data using AES-256-CBC
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data using AES-256-CBC
   */
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Hash password with bcrypt after encryption
   */
  async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    
    // First encrypt the password
    const encryptedPassword = this.encrypt(password);
    
    // Then hash the encrypted password with bcrypt
    return bcrypt.hash(encryptedPassword, saltRounds);
  }

  /**
   * Verify password by decrypting and comparing with bcrypt
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    
    try {
      // First encrypt the plain password
      const encryptedPassword = this.encrypt(password);
      
      // Then compare with bcrypt
      return bcrypt.compare(encryptedPassword, hashedPassword);
    } catch (error) {
      this.logger.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate a secure API key
   */
  generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a hash of sensitive data for comparison
   */
  createSecureHash(data: string): string {
    return crypto.createHash('sha256').update(data + this.encryptionKey.toString('hex')).digest('hex');
  }
}
