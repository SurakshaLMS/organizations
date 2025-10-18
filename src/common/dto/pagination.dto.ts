import { IsOptional, IsNumberString, IsString, IsIn, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 1) return '1';
    if (num > 1000) return '1000'; // Max 1000 pages
    return value;
  })
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 1) return '10';
    if (num > 100) return '100'; // SECURITY: Max 100 items per page
    return value;
  })
  limit?: string = '10';

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    // SECURITY: Limit search string length to prevent DoS
    if (typeof value === 'string' && value.length > 200) {
      return value.substring(0, 200);
    }
    return value;
  })
  search?: string;

  // Transform string values to numbers with security limits
  get pageNumber(): number {
    const parsed = parseInt(this.page || '1') || 1;
    // SECURITY: Prevent massive page numbers (DoS protection)
    return Math.max(1, Math.min(parsed, 1000));
  }

  get limitNumber(): number {
    const parsed = parseInt(this.limit || '10') || 10;
    // SECURITY: Max 100 items per page (prevent bulk data extraction)
    return Math.max(1, Math.min(parsed, 100));
  }

  get skip(): number {
    return (this.pageNumber - 1) * this.limitNumber;
  }
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    sortBy: string;
    sortOrder: string;
    search?: string;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  paginationDto: PaginationDto,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / paginationDto.limitNumber);
  const hasNext = paginationDto.pageNumber < totalPages;
  const hasPrev = paginationDto.pageNumber > 1;

  return {
    data,
    pagination: {
      page: paginationDto.pageNumber,
      limit: paginationDto.limitNumber,
      total,
      totalPages,
      hasNext,
      hasPrev,
    },
    meta: {
      sortBy: paginationDto.sortBy || 'createdAt',
      sortOrder: paginationDto.sortOrder || 'desc',
      search: paginationDto.search,
    },
  };
}
