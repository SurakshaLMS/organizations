import { IsOptional, IsNumberString, IsString, IsIn, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Configurable limits - can be overridden via environment variables
// These are safe defaults that will be used if ConfigService is not available
const getMaxPaginationLimit = () => parseInt(process.env.MAX_PAGINATION_LIMIT || '100', 10);
const getMaxPageNumber = () => parseInt(process.env.MAX_PAGE_NUMBER || '1000', 10);
const getMaxSearchLength = () => parseInt(process.env.MAX_SEARCH_LENGTH || '200', 10);

export class PaginationDto {
  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => {
    const num = parseInt(value);
    const maxPageNumber = getMaxPageNumber();
    if (isNaN(num) || num < 1) return '1';
    if (num > maxPageNumber) return maxPageNumber.toString();
    return value;
  })
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => {
    const num = parseInt(value);
    const maxLimit = getMaxPaginationLimit();
    if (isNaN(num) || num < 1) return '10';
    if (num > maxLimit) return maxLimit.toString();
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
    const maxSearchLength = getMaxSearchLength();
    if (typeof value === 'string' && value.length > maxSearchLength) {
      return value.substring(0, maxSearchLength);
    }
    return value;
  })
  search?: string;

  // Transform string values to numbers with security limits
  get pageNumber(): number {
    const parsed = parseInt(this.page || '1') || 1;
    const maxPageNumber = getMaxPageNumber();
    // SECURITY: Prevent massive page numbers (DoS protection)
    return Math.max(1, Math.min(parsed, maxPageNumber));
  }

  get limitNumber(): number {
    const parsed = parseInt(this.limit || '10') || 10;
    const maxLimit = getMaxPaginationLimit();
    // SECURITY: Max items per page (prevent bulk data extraction)
    return Math.max(1, Math.min(parsed, maxLimit));
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
