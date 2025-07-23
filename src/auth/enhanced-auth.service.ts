import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EnhancedAuthService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const keyString = this.configService.get<string>('PASSWORD_ENCRYPTION_KEY') || '';
    this.encryptionKey = crypto.createHash('sha256').update(keyString).digest();
  }

  /**
   * Enhanced password validation with multiple fallback methods
   */
  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      // Method 1: Check if it's a direct bcrypt hash (legacy support)
      const directBcryptMatch = await bcrypt.compare(plainPassword, hashedPassword);
      if (directBcryptMatch) {
        return true;
      }

      // Method 2: Check if it's encrypted + bcrypt (new enhanced method)
      const encryptedPassword = this.encrypt(plainPassword);
      const enhancedMatch = await bcrypt.compare(encryptedPassword, hashedPassword);
      if (enhancedMatch) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Enhanced password hashing with encryption + bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    
    // Encrypt first, then hash
    const encryptedPassword = this.encrypt(password);
    return bcrypt.hash(encryptedPassword, saltRounds);
  }

  /**
   * Encrypt data using AES-256-CBC
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data using AES-256-CBC
   */
  private decrypt(encryptedText: string): string {
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
   * Generate secure random password
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
   * Generate secure API key
   */
  generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create secure hash for data integrity
   */
  createSecureHash(data: string): string {
    return crypto.createHash('sha256').update(data + this.encryptionKey.toString('hex')).digest('hex');
  }
}
