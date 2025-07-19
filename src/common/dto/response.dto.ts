// Base response DTOs with minimal necessary data

export class UserSummaryDto {
  userId: string;
  email: string;
  name: string;
}

export class OrganizationSummaryDto {
  organizationId: string;
  name: string;
  type: string;
  isPublic: boolean;
  instituteId?: string;
}

export class InstituteSummaryDto {
  instituteId: string;
  name: string;
  imageUrl?: string;
}

export class CauseSummaryDto {
  causeId: string;
  title: string;
  description: string;
  isPublic: boolean;
  organizationId: string;
}

export class OrganizationUserSummaryDto {
  userId: string;
  organizationId: string;
  role: string;
  isVerified: boolean;
}

export class InstituteUserSummaryDto {
  userId: string;
  instituteId: string;
  role: string;
  isActive: boolean;
  assignedBy: string;
}
