import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLectureDto, UpdateLectureDto } from './dto/lecture.dto';
import { convertToBigInt, convertToString } from '../auth/organization-access.service';

@Injectable()
export class LectureService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new lecture
   */
  async createLecture(createLectureDto: CreateLectureDto, userId: string) {
    const { causeId, title, content, isPublic } = createLectureDto;

    // Check if cause exists and user has access
    const causeBigIntId = convertToBigInt(causeId);
    const cause = await this.prisma.cause.findUnique({
      where: { causeId: causeBigIntId },
      include: {
        organization: {
          include: {
            organizationUsers: {
              where: { userId: convertToBigInt(userId) },
            },
          },
        },
      },
    });

    if (!cause) {
      throw new NotFoundException('Cause not found');
    }

    // Check user permissions
    const userInOrg = (cause as any).organization.organizationUsers[0];
    if (!userInOrg || !userInOrg.isVerified) {
      throw new ForbiddenException('Access denied');
    }

    if (!['ADMIN', 'PRESIDENT', 'MODERATOR'].includes(userInOrg.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.lecture.create({
      data: {
        causeId: causeBigIntId,
        title,
        content,
        isPublic,
      },
      include: {
        cause: {
          include: {
            organization: {
              select: {
                organizationId: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            documentations: true,
          },
        },
      },
    });
  }

  /**
   * Get all lectures
   */
  async getLectures(userId?: string) {
    const where: any = {};

    if (userId) {
      where.OR = [
        { isPublic: true },
        {
          cause: {
            organization: {
              organizationUsers: {
                some: {
                  userId,
                  isVerified: true,
                },
              },
            },
          },
        },
      ];
    } else {
      where.isPublic = true;
    }

    return this.prisma.lecture.findMany({
      where,
      include: {
        cause: {
          select: {
            causeId: true,
            title: true,
            organizationId: true,
            organization: {
              select: {
                organizationId: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get lecture by ID
   */
  async getLectureById(lectureId: string, userId?: string) {
    const lectureBigIntId = convertToBigInt(lectureId);
    const lecture = await this.prisma.lecture.findUnique({
      where: { lectureId: lectureBigIntId },
      include: {
        cause: {
          include: {
            organization: {
              select: {
                organizationId: true,
                name: true,
                isPublic: true,
              },
            },
          },
        },
        documentations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    // Check access permissions
    if (!lecture.isPublic && userId) {
      const hasAccess = await this.checkUserAccess(convertToString((lecture as any).cause.organization.organizationId), userId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    } else if (!lecture.isPublic && !userId) {
      throw new ForbiddenException('Access denied');
    }

    return lecture;
  }

  /**
   * Update lecture
   */
  async updateLecture(lectureId: string, updateLectureDto: UpdateLectureDto, userId: string) {
    const lectureBigIntId = convertToBigInt(lectureId);
    const lecture = await this.prisma.lecture.findUnique({
      where: { lectureId: lectureBigIntId },
      include: {
        cause: {
          include: {
            organization: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    // Check user permissions
    await this.checkUserPermissions(convertToString((lecture as any).cause.organization.organizationId), userId, ['ADMIN', 'PRESIDENT', 'MODERATOR']);

    return this.prisma.lecture.update({
      where: { lectureId: lectureBigIntId },
      data: updateLectureDto,
      include: {
        cause: {
          include: {
            organization: {
              select: {
                organizationId: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Delete lecture
   */
  async deleteLecture(lectureId: string, userId: string) {
    const lectureBigIntId = convertToBigInt(lectureId);
    const lecture = await this.prisma.lecture.findUnique({
      where: { lectureId: lectureBigIntId },
      include: {
        cause: {
          include: {
            organization: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    // Check user permissions
    await this.checkUserPermissions(convertToString((lecture as any).cause.organization.organizationId), userId, ['ADMIN', 'PRESIDENT']);

    return this.prisma.lecture.delete({
      where: { lectureId: lectureBigIntId },
    });
  }

  /**
   * Helper: Check user access to organization
   */
  private async checkUserAccess(organizationId: string, userId: string): Promise<boolean> {
    const orgBigIntId = convertToBigInt(organizationId);
    const userBigIntId = convertToBigInt(userId);
    const organizationUser = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
        },
      },
    });

    return organizationUser ? organizationUser.isVerified : false;
  }

  /**
   * Helper: Check user permissions
   */
  private async checkUserPermissions(organizationId: string, userId: string, requiredRoles: string[]) {
    const orgBigIntId = convertToBigInt(organizationId);
    const userBigIntId = convertToBigInt(userId);
    const organizationUser = await this.prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgBigIntId,
          userId: userBigIntId,
        },
      },
    });

    if (!organizationUser) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    if (!organizationUser.isVerified) {
      throw new ForbiddenException('User is not verified in this organization');
    }

    if (!requiredRoles.includes(organizationUser.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
