import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { PaginationDto } from '../dto/pagination.dto';

@Injectable()
export class PaginationValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): PaginationDto {
    const paginationDto = new PaginationDto();
    
    // Validate and set page
    if (value.page !== undefined) {
      const page = parseInt(value.page, 10);
      if (isNaN(page) || page < 1) {
        throw new BadRequestException('Page must be a positive integer');
      }
      if (page > 1000) {
        throw new BadRequestException('Page cannot exceed 1000');
      }
      paginationDto.page = value.page;
    }

    // Validate and set limit
    if (value.limit !== undefined) {
      const limit = parseInt(value.limit, 10);
      if (isNaN(limit) || limit < 1) {
        throw new BadRequestException('Limit must be a positive integer');
      }
      if (limit > 100) {
        throw new BadRequestException('Limit cannot exceed 100');
      }
      paginationDto.limit = value.limit;
    }

    // Validate sort order
    if (value.sortOrder && !['asc', 'desc'].includes(value.sortOrder)) {
      throw new BadRequestException('Sort order must be either "asc" or "desc"');
    }
    paginationDto.sortOrder = value.sortOrder;

    // Validate and sanitize search
    if (value.search !== undefined) {
      const search = String(value.search).trim();
      if (search.length > 100) {
        throw new BadRequestException('Search query cannot exceed 100 characters');
      }
      // Basic XSS protection
      const sanitizedSearch = search.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      paginationDto.search = sanitizedSearch;
    }

    // Validate sortBy field
    const allowedSortFields = ['name', 'createdAt', 'updatedAt', 'type', 'memberCount'];
    if (value.sortBy && !allowedSortFields.includes(value.sortBy)) {
      throw new BadRequestException(`Sort field must be one of: ${allowedSortFields.join(', ')}`);
    }
    paginationDto.sortBy = value.sortBy;

    return paginationDto;
  }
}
