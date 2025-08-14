import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCauseDto, UpdateCauseDto } from './dto/cause.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { convertToBigInt, convertToString } from '../auth/organization-access.service';

@Injectable()
export class CauseService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new cause (SIMPLIFIED - no authentication required)
   */
  async createCause(createCauseDto: CreateCauseDto, userId: string) {
    const { organizationId, title, description, isPublic } = createCauseDto;
    const orgBigIntId = convertToBigInt(organizationId);

    return this.prisma.cause.create({
      data: {
        organizationId: orgBigIntId,
        title,
        description,
        isPublic,
      },
      select: {
        causeId: true,
        title: true,
        description: true,
        isPublic: true,
        organizationId: true,
        // Exclude: createdAt, updatedAt
      },
    });
  }

  /**
   * Get all causes with pagination (public or user's organization causes)
   */
  async getCauses(userId?: string, paginationDto?: PaginationDto): Promise<PaginatedResponse<any>> {
    const pagination = paginationDto || new PaginationDto();
    
    const where: any = {};

    if (userId) {
      const userBigIntId = convertToBigInt(userId);
      // Get causes from user's organizations and public causes
      where.OR = [
        { isPublic: true },
        {
          organization: {
            organizationUsers: {
              some: {
                userId: userBigIntId,
                isVerified: true,
              },
            },
          },
        },
      ];
    } else {
      // Only public causes for unauthenticated users
      where.isPublic = true;
    }

    // Add search functionality
    if (pagination.search) {
      const searchCondition = {
        OR: [
          {
            title: {
              contains: pagination.search,
            },
          },
          {
            description: {
              contains: pagination.search,
            },
          },
        ],
      };
      
      if (where.OR) {
        where.OR = where.OR.map((condition: any) => ({
          ...condition,
          ...searchCondition,
        }));
      } else {
        where.OR = searchCondition.OR;
      }
    }

    // Build order by
    const orderBy: any = {};
    if (pagination.sortBy === 'lectureCount') {
      orderBy.lectures = {
        _count: pagination.sortOrder,
      };
    } else if (pagination.sortBy === 'assignmentCount') {
      orderBy.assignments = {
        _count: pagination.sortOrder,
      };
    } else if (pagination.sortBy === 'organizationName') {
      orderBy.organization = { name: pagination.sortOrder };
    } else {
      orderBy[pagination.sortBy || 'createdAt'] = pagination.sortOrder;
    }

    // Get total count
    const total = await this.prisma.cause.count({ where });

    // Get paginated data
    const causes = await this.prisma.cause.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limitNumber,
      select: {
        causeId: true,
        title: true,
        description: true,
        isPublic: true,
        organizationId: true,
        // Exclude: createdAt, updatedAt
      },
    });

    return createPaginatedResponse(causes, total, pagination);
  }

  /**
   * Get cause by ID
   */
  async getCauseById(causeId: string, userId?: string) {
    const causeBigIntId = convertToBigInt(causeId);
    const cause = await this.prisma.cause.findUnique({
      where: { causeId: causeBigIntId },
      select: {
        causeId: true,
        title: true,
        description: true,
        isPublic: true,
        organizationId: true,
        // Exclude: createdAt, updatedAt, and related data
      },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    return cause;
  }

  /**
   * Update cause
   */
  async updateCause(causeId: string, updateCauseDto: UpdateCauseDto, userId: string) {
    const causeBigIntId = convertToBigInt(causeId);
    const cause = await this.prisma.cause.findUnique({
      where: { causeId: causeBigIntId },
      select: { organizationId: true },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    return this.prisma.cause.update({
      where: { causeId: causeBigIntId },
      data: updateCauseDto,
      select: {
        causeId: true,
        title: true,
        description: true,
        isPublic: true,
        organizationId: true,
        // Exclude: createdAt, updatedAt
      },
    });
  }

  /**
   * Delete cause
   */
  async deleteCause(causeId: string, userId: string) {
    const causeBigIntId = convertToBigInt(causeId);
    const cause = await this.prisma.cause.findUnique({
      where: { causeId: causeBigIntId },
      select: { organizationId: true },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    return this.prisma.cause.delete({
      where: { causeId: causeBigIntId },
    });
  }

  /**
   * Get causes by organization
   */
  async getCausesByOrganization(organizationId: string, userId?: string) {
    const orgBigIntId = convertToBigInt(organizationId);
    
    const where: any = { organizationId: orgBigIntId };

    if (!userId) {
      // Only public causes for unauthenticated users
      where.isPublic = true;
    } else {
      // Get all causes for organization members, only public for non-members
      const userBigIntId = convertToBigInt(userId);
      const userInOrg = await this.prisma.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgBigIntId,
            userId: userBigIntId,
          },
        },
      });

      if (!userInOrg || !userInOrg.isVerified) {
        where.isPublic = true;
      }
    }

    return this.prisma.cause.findMany({
      where,
      include: {
        organization: {
          select: {
            organizationId: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            lectures: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

}
