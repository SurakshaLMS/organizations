import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignUserToInstituteDto, UpdateInstituteUserDto, InstituteUserFilterDto, InstituteRole } from './dto/institute-user.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class InstituteUserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Assign user to institute with role
   */
  async assignUserToInstitute(assignDto: AssignUserToInstituteDto, assignedByUserId: string) {
    // Validate institute exists
    const institute = await this.prisma.institute.findUnique({
      where: { instituteId: assignDto.instituteId },
    });

    if (!institute) {
      throw new NotFoundException('Institute not found');
    }

    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { userId: assignDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already assigned to this institute
    const existingAssignment = await this.prisma.instituteUser.findUnique({
      where: {
        instituteId_userId: {
          instituteId: assignDto.instituteId,
          userId: assignDto.userId,
        },
      },
    });

    if (existingAssignment) {
      throw new BadRequestException('User is already assigned to this institute');
    }

    // Create assignment
    const assignment = await this.prisma.instituteUser.create({
      data: {
        instituteId: assignDto.instituteId,
        userId: assignDto.userId,
        role: assignDto.role,
        isActive: assignDto.isActive || true,
        assignedBy: assignedByUserId,
        notes: assignDto.notes,
        activatedDate: assignDto.isActive !== false ? new Date() : null,
      },
      select: {
        instituteId: true,
        userId: true,
        role: true,
        isActive: true,
        assignedBy: true,
        // Exclude: notes, assignedDate, activatedDate, deactivatedDate, createdAt, updatedAt
      },
    });

    return {
      message: 'User successfully assigned to institute',
      assignment,
    };
  }

  /**
   * Update institute user assignment
   */
  async updateInstituteUser(
    instituteId: string,
    userId: string,
    updateDto: UpdateInstituteUserDto,
    updatedByUserId: string,
  ) {
    // Check if assignment exists
    const existingAssignment = await this.prisma.instituteUser.findUnique({
      where: {
        instituteId_userId: {
          instituteId,
          userId,
        },
      },
    });

    if (!existingAssignment) {
      throw new NotFoundException('Institute user assignment not found');
    }

    // Prepare update data
    const updateData: any = {
      ...updateDto,
    };

    // Handle activation/deactivation dates
    if (updateDto.isActive !== undefined) {
      if (updateDto.isActive && !existingAssignment.isActive) {
        updateData.activatedDate = new Date();
        updateData.deactivatedDate = null;
      } else if (!updateDto.isActive && existingAssignment.isActive) {
        updateData.deactivatedDate = new Date();
      }
    }

    // Update assignment
    const updatedAssignment = await this.prisma.instituteUser.update({
      where: {
        instituteId_userId: {
          instituteId,
          userId,
        },
      },
      data: updateData,
      include: {
        institute: {
          select: {
            instituteId: true,
            name: true,
            imageUrl: true,
          },
        },
        user: {
          select: {
            userId: true,
            email: true,
            name: true,
          },
        },
        assignedByUser: {
          select: {
            userId: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return {
      message: 'Institute user assignment updated successfully',
      assignment: updatedAssignment,
    };
  }

  /**
   * Remove user from institute
   */
  async removeUserFromInstitute(instituteId: string, userId: string, removedByUserId: string) {
    // Check if assignment exists
    const existingAssignment = await this.prisma.instituteUser.findUnique({
      where: {
        instituteId_userId: {
          instituteId,
          userId,
        },
      },
      include: {
        institute: {
          select: {
            instituteId: true,
            name: true,
          },
        },
        user: {
          select: {
            userId: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!existingAssignment) {
      throw new NotFoundException('Institute user assignment not found');
    }

    // Remove assignment
    await this.prisma.instituteUser.delete({
      where: {
        instituteId_userId: {
          instituteId,
          userId,
        },
      },
    });

    return {
      message: 'User successfully removed from institute',
      removedAssignment: existingAssignment,
    };
  }

  /**
   * Get institute users with pagination
   */
  async getInstituteUsers(
    filterDto: InstituteUserFilterDto,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    // Build where clause
    const where: any = {};

    if (filterDto.instituteId) {
      where.instituteId = filterDto.instituteId;
    }

    if (filterDto.userId) {
      where.userId = filterDto.userId;
    }

    if (filterDto.role) {
      where.role = filterDto.role;
    }

    if (filterDto.isActive !== undefined) {
      where.isActive = filterDto.isActive;
    }

    if (filterDto.assignedBy) {
      where.assignedBy = filterDto.assignedBy;
    }

    // Add search functionality
    if (paginationDto.search) {
      where.OR = [
        {
          user: {
            name: {
              contains: paginationDto.search,
            },
          },
        },
        {
          user: {
            email: {
              contains: paginationDto.search,
            },
          },
        },
        {
          institute: {
            name: {
              contains: paginationDto.search,
            },
          },
        },
      ];
    }

    // Build order by
    const orderBy: any = {};
    if (paginationDto.sortBy === 'userName') {
      orderBy.user = { name: paginationDto.sortOrder };
    } else if (paginationDto.sortBy === 'instituteName') {
      orderBy.institute = { name: paginationDto.sortOrder };
    } else {
      orderBy[paginationDto.sortBy || 'createdAt'] = paginationDto.sortOrder;
    }

    // Get total count
    const total = await this.prisma.instituteUser.count({ where });

    // Get paginated data
    const assignments = await this.prisma.instituteUser.findMany({
      where,
      orderBy,
      skip: paginationDto.skip,
      take: paginationDto.limitNumber,
      select: {
        instituteId: true,
        userId: true,
        role: true,
        isActive: true,
        assignedBy: true,
        // Exclude: notes, assignedDate, activatedDate, deactivatedDate, createdAt, updatedAt
      },
    });

    return createPaginatedResponse(assignments, total, paginationDto);
  }

  /**
   * Get users by institute with pagination
   */
  async getUsersByInstitute(
    instituteId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    // Validate institute exists
    const institute = await this.prisma.institute.findUnique({
      where: { instituteId },
    });

    if (!institute) {
      throw new NotFoundException('Institute not found');
    }

    const filterDto = { instituteId };
    return this.getInstituteUsers(filterDto, paginationDto);
  }

  /**
   * Get institutes by user with pagination
   */
  async getInstitutesByUser(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const filterDto = { userId };
    return this.getInstituteUsers(filterDto, paginationDto);
  }

  /**
   * Get available roles
   */
  getAvailableRoles() {
    return Object.values(InstituteRole).map(role => ({
      value: role,
      label: role.charAt(0) + role.slice(1).toLowerCase(),
    }));
  }
}
