/**
 * INSTITUTE MANAGEMENT DTOs FOR MIGRATION
 * 
 * Complete data transfer objects for institute management functionality
 * to be implemented in the main backend service.
 */

import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum, IsUrl, IsEmail, IsNumber, Min, Max, Length, Matches, IsNumberString, IsIn } from 'class-validator';

// ========================================================================================
// INSTITUTE MANAGEMENT DTOs
// ========================================================================================

/**
 * Create Institute DTO
 * Used for creating new educational institutes
 */
export class CreateInstituteDto {
  @IsString()
  @IsNotEmpty({ message: 'Institute name is required' })
  @Length(2, 100, { message: 'Institute name must be between 2 and 100 characters' })
  name: string;

  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255, { message: 'Address must not exceed 255 characters' })
  address?: string;

  @IsUrl({}, { message: 'Website must be a valid URL' })
  @IsOptional()
  website?: string;

  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  @IsOptional()
  imageUrl?: string;

  @IsEmail({}, { message: 'Contact email must be a valid email address' })
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[\d\s\-\(\)]+$/, { message: 'Contact phone must be a valid phone number' })
  contactPhone?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = true;

  @IsNumber({}, { message: 'Established year must be a number' })
  @IsOptional()
  @Min(1000, { message: 'Established year must be at least 1000' })
  @Max(new Date().getFullYear(), { message: 'Established year cannot be in the future' })
  establishedYear?: number;
}

/**
 * Update Institute DTO
 * Used for updating existing institutes (all fields optional)
 */
export class UpdateInstituteDto {
  @IsString()
  @IsOptional()
  @Length(2, 100, { message: 'Institute name must be between 2 and 100 characters' })
  name?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255, { message: 'Address must not exceed 255 characters' })
  address?: string;

  @IsUrl({}, { message: 'Website must be a valid URL' })
  @IsOptional()
  website?: string;

  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  @IsOptional()
  imageUrl?: string;

  @IsEmail({}, { message: 'Contact email must be a valid email address' })
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[\d\s\-\(\)]+$/, { message: 'Contact phone must be a valid phone number' })
  contactPhone?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsNumber({}, { message: 'Established year must be a number' })
  @IsOptional()
  @Min(1000, { message: 'Established year must be at least 1000' })
  @Max(new Date().getFullYear(), { message: 'Established year cannot be in the future' })
  establishedYear?: number;
}

/**
 * Institute Query DTO
 * Used for filtering and pagination when retrieving institutes
 */
export class InstituteQueryDto {
  // Pagination
  @IsOptional()
  @IsNumberString({}, { message: 'Page must be a numeric string' })
  page?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Limit must be a numeric string' })
  limit?: string;

  // Search
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Search term must be between 1 and 100 characters' })
  search?: string;

  // Sorting
  @IsOptional()
  @IsString()
  @IsIn(['name', 'createdAt', 'establishedYear', 'organizationCount'], {
    message: 'sortBy must be one of: name, createdAt, establishedYear, organizationCount'
  })
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'], { message: 'sortOrder must be either asc or desc' })
  sortOrder?: string;

  // Filtering
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false', 'all'], { message: 'isPublic must be true, false, or all' })
  isPublic?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'minYear must be a numeric string' })
  minYear?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'maxYear must be a numeric string' })
  maxYear?: string;
}

// ========================================================================================
// INSTITUTE ASSIGNMENT DTOs
// ========================================================================================

/**
 * Assign Institute DTO
 * Used for assigning organizations to institutes
 */
export class AssignInstituteDto {
  @IsString()
  @IsNotEmpty({ message: 'Institute ID is required' })
  @Matches(/^\d+$/, { 
    message: 'Institute ID must be a valid numeric string (e.g., "1", "123", "456")' 
  })
  @Length(1, 15, { 
    message: 'Institute ID must be between 1 and 15 digits long' 
  })
  instituteId: string;
}

// ========================================================================================
// ROLE MANAGEMENT DTOs
// ========================================================================================

export enum OrganizationRole {
  MEMBER = 'MEMBER',
  MODERATOR = 'MODERATOR', 
  ADMIN = 'ADMIN',
  PRESIDENT = 'PRESIDENT'
}

/**
 * Assign User Role DTO
 * Used for assigning or updating user roles in organizations
 */
export class AssignUserRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(OrganizationRole, { 
    message: 'Role must be one of: MEMBER, MODERATOR, ADMIN, PRESIDENT' 
  })
  role: OrganizationRole;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean = false;
}

/**
 * User Verification DTO
 * Used for verifying user membership in organizations
 */
export class VerifyUserDto {
  @IsString()
  @IsNotEmpty({ message: 'User ID is required' })
  @Matches(/^\d+$/, { message: 'User ID must be a numeric string' })
  @Length(1, 15, { message: 'User ID must be between 1 and 15 digits long' })
  userId: string;

  @IsBoolean()
  isVerified: boolean;
}

/**
 * Organization Members Query DTO
 * Used for filtering organization members
 */
export class OrganizationMembersQueryDto {
  // Pagination
  @IsOptional()
  @IsNumberString({}, { message: 'Page must be a numeric string' })
  page?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Limit must be a numeric string' })
  limit?: string;

  // Search
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Search term must be between 1 and 100 characters' })
  search?: string;

  // Filtering
  @IsOptional()
  @IsString()
  @IsEnum(OrganizationRole, { 
    message: 'Role must be one of: MEMBER, MODERATOR, ADMIN, PRESIDENT' 
  })
  role?: OrganizationRole;

  @IsOptional()
  @IsString()
  @IsIn(['true', 'false', 'all'], { message: 'isVerified must be true, false, or all' })
  isVerified?: string;

  // Sorting
  @IsOptional()
  @IsString()
  @IsIn(['name', 'email', 'role', 'joinedAt', 'isVerified'], {
    message: 'sortBy must be one of: name, email, role, joinedAt, isVerified'
  })
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'], { message: 'sortOrder must be either asc or desc' })
  sortOrder?: string;
}

// ========================================================================================
// RESPONSE INTERFACES
// ========================================================================================

/**
 * Institute Response Interface
 */
export interface InstituteResponse {
  instituteId: string;
  name: string;
  description?: string;
  address?: string;
  website?: string;
  imageUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  isPublic: boolean;
  establishedYear?: number;
  organizationCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Institute with Organizations Response
 */
export interface InstituteWithOrganizationsResponse extends InstituteResponse {
  organizations: {
    organizationId: string;
    name: string;
    type: string;
    isPublic: boolean;
    memberCount: number;
  }[];
}

/**
 * Organization Member Response
 */
export interface OrganizationMemberResponse {
  userId: string;
  email: string;
  name: string;
  role: OrganizationRole;
  isVerified: boolean;
  joinedAt: string;
  verifiedAt?: string;
}

/**
 * Role Assignment Response
 */
export interface RoleAssignmentResponse {
  success: boolean;
  message: string;
  userRole: {
    userId: string;
    organizationId: string;
    role: OrganizationRole;
    isVerified: boolean;
    updatedAt: string;
  };
  performedBy: {
    userId: string;
    role: OrganizationRole;
  };
}

/**
 * Institute Assignment Response
 */
export interface InstituteAssignmentResponse {
  success: boolean;
  message: string;
  timestamp: string;
  operation: 'ASSIGN_INSTITUTE' | 'REMOVE_INSTITUTE';
  organizationId: string;
  instituteId?: string;
  performedBy: {
    userId: string;
    role: OrganizationRole;
  };
}

// ========================================================================================
// PAGINATION INTERFACE
// ========================================================================================

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// ========================================================================================
// JWT PAYLOAD INTERFACE
// ========================================================================================

export interface JwtPayload {
  sub: string; // userId
  email: string;
  name: string;
  orgAccess: string[]; // Compact format ["Aorg-123", "Porg-456"]
  isGlobalAdmin: boolean;
  iat?: number;
  exp?: number;
}

// ========================================================================================
// ACCESS CONTROL TYPES
// ========================================================================================

export type CompactOrganizationAccess = string[]; // ["A123", "P456", "M789"]

export interface EnhancedJwtPayload extends JwtPayload {
  // Additional fields for enhanced security
}

// ========================================================================================
// VALIDATION PIPES
// ========================================================================================

/**
 * Numeric ID Validation Pipe
 * For validating BigInt database IDs
 */
export class ParseNumericIdPipe {
  constructor(private readonly fieldName: string = 'ID') {}

  transform(value: string): string {
    if (!value) {
      throw new Error(`${this.fieldName} is required`);
    }

    if (typeof value !== 'string') {
      throw new Error(`${this.fieldName} must be a string`);
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      throw new Error(`${this.fieldName} cannot be empty`);
    }

    if (!/^\d+$/.test(trimmedValue)) {
      throw new Error(`${this.fieldName} must be a valid numeric string`);
    }

    if (trimmedValue.length > 15) {
      throw new Error(`${this.fieldName} is too long (maximum 15 digits)`);
    }

    if (trimmedValue.length > 1 && trimmedValue.startsWith('0')) {
      throw new Error(`${this.fieldName} cannot have leading zeros`);
    }

    try {
      BigInt(trimmedValue);
    } catch (error) {
      throw new Error(`${this.fieldName} is not a valid number`);
    }

    return trimmedValue;
  }
}

// Pre-configured pipes
export const ParseOrganizationIdPipe = () => new ParseNumericIdPipe('Organization ID');
export const ParseInstituteIdPipe = () => new ParseNumericIdPipe('Institute ID');
export const ParseUserIdPipe = () => new ParseNumericIdPipe('User ID');
