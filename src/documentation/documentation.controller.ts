import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  Query, 
  UseInterceptors, 
  UsePipes, 
  ValidationPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DocumentationService } from './documentation.service';
import { CreateDocumentationDto, UpdateDocumentationDto, DocumentationQueryDto } from './dto/documentation.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { EnhancedJwtPayload } from '../auth/organization-access.service';

@ApiTags('Documentation')
@Controller('documentation')
@UseInterceptors(SecurityHeadersInterceptor)
@UsePipes(new ValidationPipe({ 
  transform: true, 
  whitelist: true, 
  forbidNonWhitelisted: true 
}))
export class DocumentationController {
  constructor(private documentationService: DocumentationService) {}

  // Mock user for development
  private getMockUser(): EnhancedJwtPayload {
    return {
      sub: "1",
      email: "test@test.com", 
      name: "Test User",
      orgAccess: ["1:ADMIN"],
      isGlobalAdmin: true
    };
  }

  /**
   * Create a new documentation
   */
  @Post()
  @ApiOperation({ summary: 'Create documentation - Development Mode' })
  @ApiBody({ type: CreateDocumentationDto })
  @ApiResponse({ status: 201, description: 'Documentation created successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async createDocumentation(
    @Body() createDocumentationDto: CreateDocumentationDto
  ) {
    const user = this.getMockUser();
    return this.documentationService.createDocumentation(createDocumentationDto, user.sub, user);
  }

  /**
   * Get all documentation with pagination and filtering
   */
  @Get()
  @ApiOperation({ summary: 'Get all documentation - Development Mode' })
  @ApiQuery({ name: 'page', required: false, type: String, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: String, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'lectureId', required: false, type: String, description: 'Filter by lecture ID' })
  @ApiResponse({ status: 200, description: 'Documentation retrieved successfully' })
  async getDocumentation(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('lectureId') lectureId?: string
  ) {
    const user = this.getMockUser();
    const paginationDto = new PaginationDto();
    paginationDto.page = page;
    paginationDto.limit = limit;
    paginationDto.sortBy = sortBy;
    paginationDto.sortOrder = sortOrder;
    paginationDto.search = search;

    const queryDto = new DocumentationQueryDto();
    queryDto.lectureId = lectureId;
    queryDto.search = search;

    return this.documentationService.getDocumentation(user.sub, queryDto, paginationDto, user);
  }

  /**
   * Get documentation by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get documentation by ID - Development Mode' })
  @ApiParam({ name: 'id', type: String, description: 'Documentation ID' })
  @ApiResponse({ status: 200, description: 'Documentation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Documentation not found' })
  async getDocumentationById(
    @Param('id') documentationId: string
  ) {
    const user = this.getMockUser();
    return this.documentationService.getDocumentationById(documentationId, user.sub, user);
  }

  /**
   * Update documentation
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update documentation - Development Mode' })
  @ApiParam({ name: 'id', type: String, description: 'Documentation ID' })
  @ApiBody({ type: UpdateDocumentationDto })
  @ApiResponse({ status: 200, description: 'Documentation updated successfully' })
  @ApiResponse({ status: 404, description: 'Documentation not found' })
  async updateDocumentation(
    @Param('id') documentationId: string,
    @Body() updateDocumentationDto: UpdateDocumentationDto
  ) {
    const user = this.getMockUser();
    return this.documentationService.updateDocumentation(documentationId, updateDocumentationDto, user.sub, user);
  }

  /**
   * Delete documentation
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete documentation - Development Mode' })
  @ApiParam({ name: 'id', type: String, description: 'Documentation ID' })
  @ApiResponse({ status: 200, description: 'Documentation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Documentation not found' })
  async deleteDocumentation(
    @Param('id') documentationId: string
  ) {
    const user = this.getMockUser();
    return this.documentationService.deleteDocumentation(documentationId, user.sub, user);
  }

  /**
   * Get documentation by lecture
   */
  @Get('lecture/:lectureId')
  @ApiOperation({ summary: 'Get documentation by lecture ID - Development Mode' })
  @ApiParam({ name: 'lectureId', type: String, description: 'Lecture ID' })
  @ApiQuery({ name: 'page', required: false, type: String, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: String, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiResponse({ status: 200, description: 'Documentation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async getDocumentationByLecture(
    @Param('lectureId') lectureId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    const user = this.getMockUser();
    const paginationDto = new PaginationDto();
    paginationDto.page = page;
    paginationDto.limit = limit;
    paginationDto.sortBy = sortBy;
    paginationDto.sortOrder = sortOrder;

    return this.documentationService.getDocumentationByLecture(lectureId, user.sub, paginationDto, user);
  }
}
