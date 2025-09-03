import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseInterceptors } from '@nestjs/common';
import { DocumentationService } from './documentation.service';
import { CreateDocumentationDto, UpdateDocumentationDto, DocumentationQueryDto } from './dto/documentation.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

@Controller('documentation')
@UseInterceptors(SecurityHeadersInterceptor)
export class DocumentationController {
  constructor(private documentationService: DocumentationService) {}

  // Mock user for testing period
  private getMockUser(): EnhancedJwtPayload {
    return {
      sub: "1",
      email: "test@test.com", 
      name: "Test User",
      orgAccess: ["Aorg-1"], // Admin access to organization 1
      isGlobalAdmin: true
    };
  }

  /**
   * Create a new documentation
   */
  @Post()
  async createDocumentation(@Body() createDocumentationDto: CreateDocumentationDto) {
    return this.documentationService.createDocumentation(
      createDocumentationDto, 
      "1", 
      this.getMockUser()
    );
  }

  /**
   * Get all documentation with pagination and filters
   */
  @Get()
  async getDocumentation(
    @Query() queryDto: DocumentationQueryDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
  ) {
    const paginationDto = new PaginationDto();
    paginationDto.page = page;
    paginationDto.limit = limit;
    paginationDto.sortBy = sortBy;
    paginationDto.sortOrder = sortOrder;
    paginationDto.search = search;

    return this.documentationService.getDocumentation(
      "1", 
      queryDto,
      paginationDto, 
      this.getMockUser()
    );
  }

  /**
   * Get documentation by ID
   */
  @Get(':id')
  async getDocumentationById(@Param('id') documentationId: string) {
    return this.documentationService.getDocumentationById(
      documentationId, 
      "1", 
      this.getMockUser()
    );
  }

  /**
   * Update documentation
   */
  @Put(':id')
  async updateDocumentation(
    @Param('id') documentationId: string,
    @Body() updateDocumentationDto: UpdateDocumentationDto,
  ) {
    return this.documentationService.updateDocumentation(
      documentationId, 
      updateDocumentationDto, 
      "1", 
      this.getMockUser()
    );
  }

  /**
   * Delete documentation
   */
  @Delete(':id')
  async deleteDocumentation(@Param('id') documentationId: string) {
    return this.documentationService.deleteDocumentation(
      documentationId, 
      "1", 
      this.getMockUser()
    );
  }

  /**
   * Get documentation by lecture ID
   */
  @Get('lecture/:lectureId')
  async getDocumentationByLecture(
    @Param('lectureId') lectureId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const paginationDto = new PaginationDto();
    paginationDto.page = page;
    paginationDto.limit = limit;
    paginationDto.sortBy = sortBy;
    paginationDto.sortOrder = sortOrder;

    return this.documentationService.getDocumentationByLecture(
      lectureId,
      "1", 
      paginationDto,
      this.getMockUser()
    );
  }
}
