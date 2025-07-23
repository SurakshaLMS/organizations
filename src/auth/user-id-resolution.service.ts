import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * User ID Resolution Service
 * Handles mapping between external user IDs (CUIDs) and internal MySQL auto-increment user IDs
 */
@Injectable()
export class UserIdResolutionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resolve user ID from JWT token to internal MySQL user ID
   * @param tokenUserId - User ID from JWT token (might be CUID or numeric)
   * @returns MySQL auto-increment user ID as string
   */
  async resolveUserIdFromToken(tokenUserId: string): Promise<string> {
    // If it's already numeric, it's likely our internal ID
    if (/^\d+$/.test(tokenUserId.trim())) {
      // Validate user exists in our system
      const user = await this.prisma.user.findUnique({
        where: { userId: BigInt(tokenUserId) },
        select: { userId: true }
      });
      
      if (!user) {
        throw new NotFoundException(`User with ID ${tokenUserId} not found in organization service`);
      }
      
      return tokenUserId;
    }

    // If it's a CUID, try to find by email mapping
    if (/^c[a-z0-9]{24,}$/i.test(tokenUserId)) {
      throw new BadRequestException(
        `External user ID detected: "${tokenUserId}". User synchronization from external system required. Please ensure the user management service has synced this user to the organization service.`
      );
    }

    // If it's an email, find user by email
    if (tokenUserId.includes('@')) {
      const user = await this.prisma.user.findUnique({
        where: { email: tokenUserId },
        select: { userId: true }
      });
      
      if (!user) {
        throw new NotFoundException(`User with email ${tokenUserId} not found in organization service`);
      }
      
      return user.userId.toString();
    }

    throw new BadRequestException(
      `Invalid user ID format: "${tokenUserId}". Expected numeric ID (MySQL auto-increment), email, or synchronized external ID.`
    );
  }

  /**
   * Check if user ID needs resolution (is external format)
   * @param userId - User ID to check
   * @returns true if external format that needs resolution
   */
  isExternalUserId(userId: string): boolean {
    const trimmedId = userId.trim();
    
    // CUID format
    if (/^c[a-z0-9]{24,}$/i.test(trimmedId)) {
      return true;
    }
    
    // Email format
    if (trimmedId.includes('@')) {
      return true;
    }
    
    // UUID format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedId)) {
      return true;
    }
    
    return false;
  }

  /**
   * Safely resolve user ID for database operations
   * @param tokenUserId - User ID from JWT token
   * @returns Promise<bigint> - MySQL auto-increment user ID as BigInt
   */
  async resolveUserIdToBigInt(tokenUserId: string): Promise<bigint> {
    const resolvedUserId = await this.resolveUserIdFromToken(tokenUserId);
    return BigInt(resolvedUserId);
  }
}
