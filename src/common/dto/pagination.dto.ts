import { IsOptional, IsNumberString, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '10';

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  search?: string;

  // Transform string values to numbers
  get pageNumber(): number {
    return parseInt(this.page || '1') || 1;
  }

  get limitNumber(): number {
    return Math.min(parseInt(this.limit || '10') || 10, 100); // Max 100 items per page
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
