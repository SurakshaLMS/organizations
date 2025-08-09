import { IsString, IsNotEmpty, IsEnum, IsOptional, Matches, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';

/**
 * Assign User Role DTO
 */
export class AssignUserRoleDto {
  @ApiProperty({
    description: 'User ID to assign role to',
    example: '123'
  })
  @IsString()
  @IsNotEmpty({ message: 'User ID is required' })
  @Matches(/^\d+$/, { message: 'User ID must be a numeric string' })
  @Length(1, 15, { message: 'User ID must be between 1 and 15 digits' })
  userId: string;

  @ApiProperty({
    description: 'Role to assign to the user',
    enum: OrganizationRole,
    example: OrganizationRole.ADMIN
  })
  @IsEnum(OrganizationRole, { message: 'Invalid user role' })
  role: OrganizationRole;
}

/**
 * Remove User From Organization DTO
 */
export class RemoveUserDto {
  @ApiProperty({
    description: 'User ID to remove from organization',
    example: '123'
  })
  @IsString()
  @IsNotEmpty({ message: 'User ID is required' })
  @Matches(/^\d+$/, { message: 'User ID must be a numeric string' })
  @Length(1, 15, { message: 'User ID must be between 1 and 15 digits' })
  userId: string;
}

/**
 * Change User Role DTO
 */
export class ChangeUserRoleDto {
  @ApiProperty({
    description: 'User ID whose role to change',
    example: '123'
  })
  @IsString()
  @IsNotEmpty({ message: 'User ID is required' })
  @Matches(/^\d+$/, { message: 'User ID must be a numeric string' })
  @Length(1, 15, { message: 'User ID must be between 1 and 15 digits' })
  userId: string;

  @ApiProperty({
    description: 'New role for the user',
    enum: OrganizationRole,
    example: OrganizationRole.MODERATOR
  })
  @IsEnum(OrganizationRole, { message: 'Invalid user role' })
  newRole: OrganizationRole;
}

/**
 * Organization Member Response DTO
 */
export class OrganizationMemberDto {
  @ApiProperty({
    description: 'User ID',
    example: '123'
  })
  userId: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe'
  })
  name: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'User role in organization',
    enum: OrganizationRole,
    example: OrganizationRole.MEMBER
  })
  role: OrganizationRole;

  @ApiProperty({
    description: 'Whether user is verified',
    example: true
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Date user joined organization',
    example: '2024-01-15T10:30:00Z'
  })
  joinedAt: Date;
}

/**
 * Organization Members List Response DTO
 */
export class OrganizationMembersResponseDto {
  @ApiProperty({
    description: 'List of organization members',
    type: [OrganizationMemberDto]
  })
  members: OrganizationMemberDto[];

  @ApiProperty({
    description: 'Total number of members',
    example: 25
  })
  totalMembers: number;

  @ApiProperty({
    description: 'Role breakdown',
    example: {
      PRESIDENT: 1,
      ADMIN: 2,
      MODERATOR: 4,
      MEMBER: 18
    }
  })
  roleBreakdown: Record<OrganizationRole, number>;
}

/**
 * Role Assignment Response DTO
 */
export class RoleAssignmentResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'User role assigned successfully'
  })
  message: string;

  @ApiProperty({
    description: 'User ID',
    example: '123'
  })
  userId: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '456'
  })
  organizationId: string;

  @ApiProperty({
    description: 'Assigned role',
    enum: OrganizationRole,
    example: OrganizationRole.ADMIN
  })
  role: OrganizationRole;

  @ApiProperty({
    description: 'Assignment timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  assignedAt: Date;
}
