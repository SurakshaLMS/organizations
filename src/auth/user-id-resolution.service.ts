import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * User ID Resolution Service
 * Handles MySQL auto-increment user IDs from JWT tokens
 * Production-optimized for numeric IDs only
 */
@Injectable()
export class UserIdResolutionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resolve user ID from JWT token to internal MySQL user ID
   * @param tokenUserId - User ID from JWT token (numeric string)
   * @returns MySQL auto-increment user ID as string
   */
  async resolveUserIdFromToken(tokenUserId: string): Promise<string> {
    const trimmedId = tokenUserId.trim();
    
    // Validate numeric format (MySQL auto-increment IDs only)
    if (!/^\d+$/.test(trimmedId)) {
      throw new BadRequestException(
        `Invalid user ID format: "${tokenUserId}". Expected numeric value (MySQL auto-increment ID).`
      );
    }
    
    // Validate positive value
    const numericId = BigInt(trimmedId);
    if (numericId <= 0) {
      throw new BadRequestException(
        `Invalid user ID value: "${tokenUserId}". Must be positive integer (MySQL auto-increment ID).`
      );
    }
    
    // Validate user exists in our system
    const user = await this.prisma.user.findUnique({
      where: { userId: numericId },
      select: { userId: true }
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${tokenUserId} not found in organization service`);
    }
    
    return trimmedId;
  }

  /**
   * Safely resolve user ID for database operations
   * @param tokenUserId - User ID from JWT token (numeric string)
   * @returns Promise<bigint> - MySQL auto-increment user ID as BigInt
   */
  async resolveUserIdToBigInt(tokenUserId: string): Promise<bigint> {
    const resolvedUserId = await this.resolveUserIdFromToken(tokenUserId);
    return BigInt(resolvedUserId);
  }
}
