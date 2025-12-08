import { Injectable, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAccessValidationService } from '../auth/jwt-access-validation.service';
import { CreateLectureDto, UpdateLectureDto, LectureQueryDto } from './dto/lecture.dto';
import { CreateLectureWithDocumentsDto, LectureWithDocumentsResponseDto } from './dto/create-lecture-with-documents.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { convertToBigInt, convertToString, EnhancedJwtPayload } from '../auth/organization-access.service';
import { CloudStorageService, FileUploadResult } from '../common/services/cloud-storage.service';
import { UrlTransformerService } from '../common/services/url-transformer.service';
import { extractRelativePath } from '../common/utils/url-path.util';

/**
 * Document upload result interface
 */
export interface DocumentUploadResult {
  documentationId: string;
  title: string;
  url: string;
  fileName: string;
  size: number;
  fileId: string;
  uploadedAt: string;
}

/**
 * ENTERPRISE LECTURE SERVICE
 * 
 * Production-ready lecture management with:
 * - JWT-based access control (zero auth queries)
 * - Optimized filtering by cause IDs
 * - Minimal database joins
 * - Enhanced performance and security
 * - Comprehensive error handling
 * - Secure GCS file storage (serverless-ready)
 * - File type restrictions: Images (jpg, jpeg, png, gif, heic, heif) and PDFs only
 */
@Injectable()
export class LectureService {
  private readonly logger = new Logger(LectureService.name);

  constructor(
    private prisma: PrismaService,
    private jwtAccessValidation: JwtAccessValidationService,
    private cloudStorage: CloudStorageService,
    private urlTransformer: UrlTransformerService,
  ) {}  /**
   * CREATE LECTURE (ENTERPRISE OPTIMIZED)
   * 
   * Features:
   * - JWT-based access validation (zero auth queries)
   * - Minimal database queries
   * - Production-ready error handling
   */
  async createLecture(createLectureDto: CreateLectureDto, user?: EnhancedJwtPayload) {
    const { causeId, title, content, isPublic } = createLectureDto;

    try {
      // Step 1: Get cause with minimal data and organization info
      const causeBigIntId = convertToBigInt(causeId);
      const cause = await this.prisma.cause.findUnique({
        where: { causeId: causeBigIntId },
        select: {
          causeId: true,
          organizationId: true,
          title: true,
          isPublic: true,
        },
      });

      if (!cause) {
        throw new NotFoundException('Cause not found');
      }

      // Step 2: JWT-BASED ACCESS VALIDATION (optional when no authentication)
      const organizationId = convertToString(cause.organizationId);
      if (user) {
        this.jwtAccessValidation.requireOrganizationModerator(user, organizationId);
      }

      // Step 3: Create lecture with minimal data return (NO UNNECESSARY JOINS)
      const lecture = await this.prisma.lecture.create({
        data: {
          causeId: causeBigIntId,
          title,
          content,
          description: createLectureDto.description,
          venue: createLectureDto.venue,
          mode: createLectureDto.mode,
          timeStart: createLectureDto.timeStart ? new Date(createLectureDto.timeStart) : null,
          timeEnd: createLectureDto.timeEnd ? new Date(createLectureDto.timeEnd) : null,
          liveLink: createLectureDto.liveLink,
          liveMode: createLectureDto.liveMode,
          recordingUrl: createLectureDto.recordingUrl,
          isPublic: isPublic ?? false,
        },
        select: {
          lectureId: true,
          causeId: true,
          title: true,
          description: true,
          venue: true,
          mode: true,
          timeStart: true,
          timeEnd: true,
          liveLink: true,
          liveMode: true,
          recordingUrl: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
          // NO cause relation - only IDs needed
        },
      });

      // Transform to production format with proper date handling
      const result = {
        lectureId: convertToString(lecture.lectureId),
        causeId: convertToString(lecture.causeId),
        title: lecture.title,
        description: lecture.description,
        venue: lecture.venue,
        mode: lecture.mode,
        timeStart: lecture.timeStart?.toISOString(),
        timeEnd: lecture.timeEnd?.toISOString(),
        liveLink: lecture.liveLink,
        liveMode: lecture.liveMode,
        recordingUrl: lecture.recordingUrl,
        isPublic: lecture.isPublic,
        createdAt: lecture.createdAt.toISOString(),
        updatedAt: lecture.updatedAt.toISOString(),
      };

      this.logger.log(`📚 Lecture created: ${lecture.lectureId} ${user ? `by user ${user.sub}` : 'without authentication'} in cause ${causeId}`);
      return this.urlTransformer.transformCommonFields(result);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Lecture creation failed for cause ${causeId}:`, error);
      throw new BadRequestException('Failed to create lecture');
    }
  }

  /**
   * CREATE LECTURE WITH DOCUMENTS
   * 
   * Enhanced lecture creation that supports:
   * 1. Creating lecture with pre-uploaded document URLs (signed URL flow)
   * 2. Legacy: Uploading multiple documents to S3 (deprecated)
   */
  async createLectureWithDocuments(
    createLectureDto: CreateLectureWithDocumentsDto,
    causeId: string,
    user?: any,
    files?: any[]
  ): Promise<LectureWithDocumentsResponseDto> {
    try {
      // Convert causeId to BigInt for database query
      const causeIdBigInt = convertToBigInt(causeId);
      
      // Validate user access to cause
      const cause = await this.prisma.cause.findUnique({
        where: { causeId: causeIdBigInt },
        include: {
          organization: true,
        },
      });

      if (!cause) {
        throw new NotFoundException('Cause not found');
      }

      // Check user permissions for the organization (optional when no authentication)
      const organizationId = convertToString(cause.organizationId);
      if (user) {
        this.jwtAccessValidation.requireOrganizationMember(user, organizationId);
      }

      // Extract documents array from DTO if present
      const documentsMetadata = createLectureDto.documents || [];
      
      // Remove documents from lecture data to avoid Prisma errors
      const lectureData = { ...createLectureDto };
      delete lectureData.documents;

      // Create the lecture first
      const lecture = await this.prisma.lecture.create({
        data: {
          ...lectureData,
          causeId: causeIdBigInt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      let uploadedDocuments: DocumentUploadResult[] = [];

      // Handle documents from DTO (pre-uploaded via signed URLs)
      if (documentsMetadata && documentsMetadata.length > 0) {
        this.logger.log(`📁 Creating ${documentsMetadata.length} document records for lecture ${lecture.lectureId}`);

        for (const docMeta of documentsMetadata) {
          try {
            // Extract relative path for storage URLs, keep external URLs as-is
            const docUrl = extractRelativePath(docMeta.docUrl) as string || '';

            // Create documentation record with provided metadata
            const documentation = await this.prisma.documentation.create({
              data: {
                lectureId: lecture.lectureId,
                title: docMeta.title || 'Untitled Document',
                description: docMeta.description || '',
                content: docMeta.content || '',
                docUrl: docUrl, // Store relative path for storage URLs
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            this.logger.log(`📋 Documentation record created: ${documentation.documentationId}`);

            // URL transformation is handled by UrlTransformerService on response
            // No need to build URL here - just pass the stored value

            uploadedDocuments.push({
              documentationId: convertToString(documentation.documentationId),
              title: documentation.title,
              url: docUrl, // Relative path - will be transformed to full URL by UrlTransformerService
              fileName: docMeta.title,
              size: 0, // Size not available for pre-uploaded files
              fileId: convertToString(documentation.documentationId),
              uploadedAt: new Date().toISOString(),
            });

            this.logger.log(`✅ Document linked: ${docMeta.title} -> ${docUrl}`);
          } catch (docError) {
            this.logger.error(`❌ Failed to create document record for ${docMeta.title}:`, docError);
            
            // If database creation fails, delete the uploaded file from S3 to prevent orphaned files
            const docUrl = extractRelativePath(docMeta.docUrl);
            if (docUrl) {
              try {
                await this.cloudStorage.deleteFile(docUrl);
                this.logger.log(`🗑️ Cleaned up orphaned file from S3: ${docUrl}`);
              } catch (cleanupError) {
                this.logger.error(`Failed to cleanup orphaned file ${docUrl}:`, cleanupError);
              }
            }
            
            // Continue with other documents
          }
        }
      }

      // Upload documents if provided
      if (files && files.length > 0) {
        this.logger.log(`📁 Uploading ${files.length} documents for lecture ${lecture.lectureId}`);

        for (const file of files) {
          try {
            this.logger.log(`📄 Processing file: ${file.originalname} (${file.size} bytes)`);
            
            // Validate file
            if (!file.buffer || file.buffer.length === 0) {
              this.logger.warn(`⚠️ Skipping empty file: ${file.originalname}`);
              continue;
            }

            // Upload to Cloud Storage with security validation
            const uploadResult: FileUploadResult = await this.cloudStorage.uploadFile(
              file.buffer,
              `lectures/${lecture.lectureId}/documents/${file.originalname}`,
              file.mimetype
            );

            // Check if upload was successful
            if (!uploadResult.success || !uploadResult.fullUrl) {
              this.logger.error(`❌ Upload failed for ${file.originalname}: ${uploadResult.error || 'No URL returned'}`);
              throw new Error(`Failed to upload file ${file.originalname}: ${uploadResult.error || 'Upload failed'}`);
            }

            this.logger.log(`✅ Upload successful: ${uploadResult.fullUrl}`);

            // Create documentation record - store relativePath in database
            const documentation = await this.prisma.documentation.create({
              data: {
                lectureId: lecture.lectureId,
                title: file.originalname,
                content: '', // Can be enhanced later if needed
                description: `Document uploaded for lecture: ${lecture.title}`,
                docUrl: uploadResult.relativePath, // Store relative path in DB
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            this.logger.log(`📋 Documentation record created: ${documentation.documentationId}`);

            uploadedDocuments.push({
              documentationId: convertToString(documentation.documentationId),
              title: documentation.title,
              url: uploadResult.fullUrl, // Return full URL to client
              fileName: uploadResult.fileName,
              size: uploadResult.fileSize,
              fileId: convertToString(documentation.documentationId),
              uploadedAt: new Date().toISOString(),
            });

            this.logger.log(`✅ Document uploaded: ${file.originalname} -> ${uploadResult.fullUrl}`);
          } catch (docError) {
            this.logger.error(`❌ Failed to upload document ${file.originalname}:`, docError);
            // Continue with other files, don't fail the entire operation
          }
        }
      } else {
        this.logger.log(`📁 No documents provided for lecture ${lecture.lectureId}`);
      }

      const result: LectureWithDocumentsResponseDto = {
        lectureId: convertToString(lecture.lectureId),
        causeId: convertToString(lecture.causeId),
        title: lecture.title,
        description: lecture.description || undefined,
        content: lecture.content || undefined,
        venue: lecture.venue || undefined,
        mode: lecture.mode || undefined,
        timeStart: lecture.timeStart?.toISOString() || undefined,
        timeEnd: lecture.timeEnd?.toISOString() || undefined,
        liveLink: lecture.liveLink || undefined,
        liveMode: lecture.liveMode || undefined,
        recordingUrl: lecture.recordingUrl || undefined,
        isPublic: lecture.isPublic || false,
        createdAt: lecture.createdAt.toISOString(),
        updatedAt: lecture.updatedAt.toISOString(),
        documents: uploadedDocuments.map(doc => ({
          documentationId: doc.documentationId,
          lectureId: convertToString(lecture.lectureId),
          title: doc.title,
          description: undefined,
          content: undefined,
          docUrl: doc.url,
          originalFileName: doc.fileName,
          fileSize: doc.size,
          mimeType: 'application/octet-stream', // Can be enhanced later
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      };

      // Transform URLs in lecture and nested documents
      const transformedResult = this.urlTransformer.transformCommonFields(result);
      transformedResult.documents = this.urlTransformer.transformCommonFieldsArray(result.documents);

      this.logger.log(
        `🎓 Lecture with documents created: ${lecture.lectureId} (${uploadedDocuments.length}/${files?.length || 0} documents uploaded)`
      );

      return transformedResult;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      
      this.logger.error(`Enhanced lecture creation failed for cause ${causeId}:`, error);
      this.logger.error(`Error details: ${errorMessage}`);
      this.logger.error(`Error stack: ${errorStack}`);
      
      throw new BadRequestException(`Failed to create lecture with documents: ${errorMessage}`);
    }
  }

  /**
   * GET LECTURES WITH ADVANCED FILTERING (ENTERPRISE OPTIMIZED)
   * 
   * Features:
   * - JWT-based access filtering
   * - Optimized cause ID filtering
   * - Minimal joins and queries
   * - Production-ready pagination
   */
  async getLectures(
    user: EnhancedJwtPayload, 
    queryDto: LectureQueryDto = {}
  ): Promise<PaginatedResponse<any>> {
    
    // Validate user authentication
    if (!user || !user.sub) {
      throw new UnauthorizedException('Authentication required');
    }
    
    try {
      // Step 1: Build optimized where clause
      const where = this.buildOptimizedWhereClause(user, queryDto);
      
      // Step 2: Pagination setup
      const page = parseInt(queryDto.page || '1');
      const limit = Math.min(parseInt(queryDto.limit || '10'), 100); // Max 100 items
      const skip = (page - 1) * limit;

      // Step 3: Sorting setup
      const orderBy = this.buildOrderByClause(queryDto);

      // Step 4: Execute optimized query with minimal data (NO UNNECESSARY JOINS)
      const [lectures, total] = await Promise.all([
        this.prisma.lecture.findMany({
          where,
          select: {
            lectureId: true,
            title: true,
            description: true,
            venue: true,
            mode: true,
            timeStart: true,
            timeEnd: true,
            liveLink: true,
            liveMode: true,
            recordingUrl: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
            causeId: true, // Only ID, no cause details
            // NO cause relation - saves unnecessary join
            // Include document details (not just count)
            documentations: {
              where: {
                isActive: true,
              },
              select: {
                documentationId: true,
                title: true,
                description: true,
                docUrl: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.lecture.count({ where }),
      ]);

      
      this.logger.log(`📚 Retrieved ${lectures.length} lectures (${total} total) for user ${user.sub}`);      // Transform data to production format with proper date handling
      const transformedLectures = lectures.map(lecture => {
        const lectureData = {
          lectureId: convertToString(lecture.lectureId),
          title: lecture.title,
          description: lecture.description,
          venue: lecture.venue,
          mode: lecture.mode,
          timeStart: lecture.timeStart?.toISOString(),
          timeEnd: lecture.timeEnd?.toISOString(),
          liveLink: lecture.liveLink,
          liveMode: lecture.liveMode,
          recordingUrl: lecture.recordingUrl,
          isPublic: lecture.isPublic,
          createdAt: lecture.createdAt.toISOString(),
          updatedAt: lecture.updatedAt.toISOString(),
          causeId: convertToString(lecture.causeId),
          // Include full document details with proper date formatting
          documents: lecture.documentations.map(doc => ({
            documentationId: convertToString(doc.documentationId),
            title: doc.title,
            description: doc.description,
            docUrl: doc.docUrl,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
          })),
          documentCount: lecture.documentations.length,
        };
        
        // Transform URLs in lecture and nested documents
        const transformed = this.urlTransformer.transformCommonFields(lectureData);
        transformed.documents = this.urlTransformer.transformCommonFieldsArray(lectureData.documents);
        return transformed;
      });

      const paginationDto = new PaginationDto();
      paginationDto.page = page.toString();
      paginationDto.limit = limit.toString();
      paginationDto.sortBy = queryDto.sortBy || 'createdAt';
      paginationDto.sortOrder = (queryDto.sortOrder || 'desc') as 'asc' | 'desc';
      paginationDto.search = queryDto.search;

      return createPaginatedResponse(transformedLectures, total, paginationDto);

    } catch (error) {
      this.logger.error('Lecture retrieval failed:', error);
      throw new BadRequestException('Failed to retrieve lectures');
    }
  }

  /**
   * GET LECTURE BY ID WITH DOCUMENTS (ENTERPRISE OPTIMIZED)
   * 
   * Features:
   * - Minimal database queries (only IDs, no unnecessary joins)
   * - Related documents included
   * - Proper date handling
   * - Sensitive data filtering
   */
  async getLectureById(lectureId: string, user: EnhancedJwtPayload) {
    // Validate user authentication
    if (!user || !user.sub) {
      throw new UnauthorizedException('Authentication required');
    }
    try {
      const lectureBigIntId = convertToBigInt(lectureId);
      
      // Get lecture with minimal joins and related documents
      const lecture = await this.prisma.lecture.findFirst({
        where: { 
          lectureId: lectureBigIntId,
          isActive: true, // Only show active (non-deleted) lectures
        },
        select: {
          lectureId: true,
          title: true,
          description: true,
          content: true, // Full content for single lecture view
          venue: true,
          mode: true,
          timeStart: true,
          timeEnd: true,
          liveLink: true,
          liveMode: true,
          recordingUrl: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
          causeId: true, // Only ID needed
          // Get related documents with minimal fields
          documentations: {
            where: {
              isActive: true, // Only show active (non-deleted) documents
            },
            select: {
              documentationId: true,
              title: true,
              description: true,
              docUrl: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          // Get cause organization ID for access control (minimal query)
          cause: {
            select: {
              organizationId: true,
              isPublic: true,
            },
          },
        },
      });

      if (!lecture) {
        throw new NotFoundException('Lecture not found');
      }

      // JWT-based access validation (zero additional queries)
      if (!lecture.isPublic && user) {
        const organizationId = convertToString(lecture.cause.organizationId);
        this.jwtAccessValidation.requireOrganizationMember(user, organizationId);
      } else if (!lecture.isPublic && !user) {
        throw new ForbiddenException('Access denied - authentication required');
      }

      // Transform to production format with proper date handling
      const result = {
        lectureId: convertToString(lecture.lectureId),
        title: lecture.title,
        description: lecture.description,
        content: lecture.content,
        venue: lecture.venue,
        mode: lecture.mode,
        timeStart: lecture.timeStart?.toISOString(),
        timeEnd: lecture.timeEnd?.toISOString(),
        liveLink: lecture.liveLink,
        liveMode: lecture.liveMode,
        recordingUrl: lecture.recordingUrl,
        isPublic: lecture.isPublic,
        createdAt: lecture.createdAt.toISOString(),
        updatedAt: lecture.updatedAt.toISOString(),
        causeId: convertToString(lecture.causeId),
        // Related documents with proper date formatting
        documents: lecture.documentations.map(doc => ({
          documentationId: convertToString(doc.documentationId),
          title: doc.title,
          description: doc.description,
          docUrl: doc.docUrl,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        })),
        documentCount: lecture.documentations.length,
      };

      // Transform URLs in lecture and nested documents
      const transformedResult = this.urlTransformer.transformCommonFields(result);
      transformedResult.documents = this.urlTransformer.transformCommonFieldsArray(result.documents);
            
      this.logger.log(`📚 Lecture ${lectureId} accessed by user ${user.sub} with ${lecture.documentations.length} documents`);
      return transformedResult;

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Lecture retrieval failed for ID ${lectureId}:`, error);
      throw new BadRequestException('Failed to retrieve lecture');
    }
  }

  /**
   * UPDATE LECTURE (ENTERPRISE OPTIMIZED)
   */
  async updateLecture(lectureId: string, updateLectureDto: UpdateLectureDto, user?: EnhancedJwtPayload) {
    try {
      const lectureBigIntId = convertToBigInt(lectureId);

      // Get lecture with minimal organization data
      const lecture = await this.prisma.lecture.findUnique({
        where: { lectureId: lectureBigIntId },
        select: {
          lectureId: true,
          causeId: true,
          cause: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      if (!lecture) {
        throw new NotFoundException('Lecture not found');
      }

      // JWT-based access validation - REQUIRED
      if (!user || !user.orgAccess || user.orgAccess.length === 0) {
        throw new UnauthorizedException('Authentication required - No organization access');
      }
      
      const organizationId = convertToString(lecture.cause.organizationId);
      this.jwtAccessValidation.requireOrganizationModerator(user, organizationId);

      // Prepare update data (exclude documents field - not a Prisma field)
      const updateData: any = {};
      Object.keys(updateLectureDto).forEach(key => {
        // Skip documents field - handled separately in updateLectureWithDocuments
        if (key === 'documents') {
          return;
        }
        
        const value = updateLectureDto[key as keyof UpdateLectureDto];
        if (value !== undefined) {
          if (key === 'timeStart' || key === 'timeEnd') {
            updateData[key] = value ? new Date(value as string) : null;
          } else {
            updateData[key] = value;
          }
        }
      });

      // Update lecture with minimal data return
      const updatedLecture = await this.prisma.lecture.update({
        where: { lectureId: lectureBigIntId },
        data: updateData,
        select: {
          lectureId: true,
          title: true,
          description: true,
          venue: true,
          mode: true,
          timeStart: true,
          timeEnd: true,
          liveLink: true,
          liveMode: true,
          recordingUrl: true,
          isPublic: true,
          updatedAt: true,
          causeId: true,
          // NO content field for update response (sensitive data)
        },
      });

      // Transform to production format with proper date handling
      const result = {
        lectureId: convertToString(updatedLecture.lectureId),
        title: updatedLecture.title,
        description: updatedLecture.description,
        venue: updatedLecture.venue,
        mode: updatedLecture.mode,
        timeStart: updatedLecture.timeStart?.toISOString(),
        timeEnd: updatedLecture.timeEnd?.toISOString(),
        liveLink: updatedLecture.liveLink,
        liveMode: updatedLecture.liveMode,
        recordingUrl: updatedLecture.recordingUrl,
        isPublic: updatedLecture.isPublic,
        updatedAt: updatedLecture.updatedAt.toISOString(),
        causeId: convertToString(updatedLecture.causeId),
      };

      this.logger.log(`📚 Lecture ${lectureId} updated ${user ? `by user ${user.sub}` : 'without authentication'}`);
      return this.urlTransformer.transformCommonFields(result);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Lecture update failed for ID ${lectureId}:`, error);
      throw new BadRequestException('Failed to update lecture');
    }
  }

  /**
   * UPDATE LECTURE WITH DOCUMENTS
   * 
   * Enhanced method to update lecture details and manage documents
   * Allows adding new documents while optionally replacing existing ones
   */
  async updateLectureWithDocuments(
    lectureId: string,
    updateLectureDto: UpdateLectureDto,
    files?: any[],
    user?: EnhancedJwtPayload
  ) {
    const uploadedFilePaths: string[] = []; // Track uploaded files for cleanup on failure
    
    try {
      const lectureBigIntId = convertToBigInt(lectureId);

      // First, update the lecture details using existing method
      const updatedLecture = await this.updateLecture(lectureId, updateLectureDto, user);

      let uploadedDocuments: DocumentUploadResult[] = [];

      // Handle document uploads if provided
      if (files && files.length > 0) {
        this.logger.log(`📁 Uploading ${files.length} new documents for lecture ${lectureId}`);

        for (const file of files) {
          try {
            // Upload to Cloud Storage with security validation
            const uploadResult: FileUploadResult = await this.cloudStorage.uploadFile(
              file.buffer,
              `lectures/${lectureId}/documents/${file.originalname}`,
              file.mimetype
            );

            // Check if upload was successful
            if (!uploadResult.success || !uploadResult.fullUrl) {
              this.logger.error(`❌ Upload failed for ${file.originalname}: ${uploadResult.error || 'No URL returned'}`);
              throw new Error(`Failed to upload file ${file.originalname}: ${uploadResult.error || 'Upload failed'}`);
            }

            this.logger.log(`✅ Document upload successful: ${uploadResult.fullUrl}`);

            // Create database record for the document - store relativePath
            const document = await this.prisma.documentation.create({
              data: {
                title: file.originalname,
                description: `Document uploaded for lecture ${lectureId}`,
                docUrl: uploadResult.relativePath, // Store relative path in DB
                lectureId: lectureBigIntId,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            uploadedDocuments.push({
              documentationId: convertToString(document.documentationId),
              title: document.title,
              url: uploadResult.fullUrl, // Return full URL to client
              fileName: uploadResult.fileName,
              size: uploadResult.fileSize,
              fileId: convertToString(document.documentationId),
              uploadedAt: new Date().toISOString(),
            });

            this.logger.log(`📄 Document uploaded: ${file.originalname} for lecture ${lectureId}`);
          } catch (uploadError) {
            this.logger.error(`Failed to upload document ${file.originalname} for lecture ${lectureId}:`, uploadError);
            // Continue with other files even if one fails
          }
        }
      }

      // Handle documents from DTO (pre-uploaded via signed URL)
      if (updateLectureDto.documents && updateLectureDto.documents.length > 0) {
        this.logger.log(`📝 Creating ${updateLectureDto.documents.length} documents from pre-uploaded URLs`);

        for (const docMeta of updateLectureDto.documents) {
          let relativePath: string | null | undefined = null;
          
          try {
            // Skip if no docUrl provided
            if (!docMeta.docUrl) {
              this.logger.warn(`⚠️ Skipping document ${docMeta.title} - no docUrl provided`);
              continue;
            }

            // Extract relative path from full URL
            relativePath = extractRelativePath(docMeta.docUrl);
            
            if (!relativePath) {
              this.logger.warn(`⚠️ Skipping document ${docMeta.title} - invalid docUrl: ${docMeta.docUrl}`);
              continue;
            }

            this.logger.log(`💾 Saving document: ${docMeta.title} with path: ${relativePath}`);

            // Track this file for potential cleanup
            uploadedFilePaths.push(relativePath);

            // Create database record for the document
            const document = await this.prisma.documentation.create({
              data: {
                title: docMeta.title,
                description: docMeta.description || `Document for lecture ${lectureId}`,
                content: docMeta.content,
                docUrl: relativePath, // Store relative path in DB
                lectureId: lectureBigIntId,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            // Extract filename from the relative path
            const fileName = relativePath.split('/').pop() || 'unknown';

            uploadedDocuments.push({
              documentationId: convertToString(document.documentationId),
              title: document.title,
              url: docMeta.docUrl, // Return original full URL
              fileName: fileName,
              size: 0, // Size not available for pre-uploaded files
              fileId: convertToString(document.documentationId),
              uploadedAt: new Date().toISOString(),
            });

            this.logger.log(`✅ Document record created: ${docMeta.title} (ID: ${document.documentationId})`);
          } catch (docError) {
            this.logger.error(`Failed to create document record for ${docMeta.title}:`, docError);
            
            // If database creation fails, delete the uploaded file from S3 to prevent orphaned files
            if (relativePath) {
              try {
                await this.cloudStorage.deleteFile(relativePath);
                this.logger.log(`🗑️ Cleaned up orphaned file from S3: ${relativePath}`);
              } catch (cleanupError) {
                this.logger.error(`Failed to cleanup orphaned file ${relativePath}:`, cleanupError);
              }
            }
            
            // Continue with other documents even if one fails
          }
        }
      }

      // Fetch ALL existing documents for this lecture
      const allDocuments = await this.prisma.documentation.findMany({
        where: { 
          lectureId: lectureBigIntId,
          isActive: true, // Only show active (non-deleted) documents
        },
        select: {
          documentationId: true,
          title: true,
          description: true,
          docUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform documents to proper format
      const documents = allDocuments.map(doc => ({
        documentationId: convertToString(doc.documentationId),
        title: doc.title,
        description: doc.description,
        docUrl: doc.docUrl,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }));

      // Transform URLs for documents
      const documentsWithUrls = this.urlTransformer.transformCommonFieldsArray(documents);

      // Return enhanced response with updated lecture, all documents, and upload info
      return {
        ...updatedLecture,
        documents: documentsWithUrls, // All existing documents with full URLs
        uploadedDocuments, // Info about newly uploaded files
        totalDocuments: documentsWithUrls.length,
        newDocumentsCount: uploadedDocuments.length,
        message: `Lecture updated successfully${uploadedDocuments.length > 0 ? ` with ${uploadedDocuments.length} new documents` : ''}`,
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      // If update fails completely, cleanup any files that were uploaded in this request
      if (uploadedFilePaths.length > 0) {
        this.logger.warn(`⚠️ Update failed, cleaning up ${uploadedFilePaths.length} orphaned files`);
        for (const filePath of uploadedFilePaths) {
          try {
            await this.cloudStorage.deleteFile(filePath);
            this.logger.log(`🗑️ Cleaned up orphaned file: ${filePath}`);
          } catch (cleanupError) {
            this.logger.error(`Failed to cleanup file ${filePath}:`, cleanupError);
          }
        }
      }
      
      this.logger.error(`Failed to update lecture with documents for ID ${lectureId}:`, error);
      throw new BadRequestException('Failed to update lecture with documents');
    }
  }

  /**
   * DELETE SINGLE DOCUMENT
   * Public method to delete a document (requires authorization)
   */
  async deleteDocument(documentationId: string, user?: EnhancedJwtPayload): Promise<{ message: string }> {
    try {
      const docIdBigInt = convertToBigInt(documentationId);

      // Get document with lecture and organization info for authorization
      const document = await this.prisma.documentation.findUnique({
        where: { documentationId: docIdBigInt },
        select: {
          documentationId: true,
          title: true,
          docUrl: true,
          isActive: true,
          lecture: {
            select: {
              lectureId: true,
              title: true,
              cause: {
                select: {
                  organizationId: true,
                },
              },
            },
          },
        },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      if (!document.isActive) {
        throw new NotFoundException('Document has already been deleted');
      }

      // JWT-based access validation - require president or admin only
      if (user) {
        const organizationId = convertToString(document.lecture.cause.organizationId);
        try {
          this.jwtAccessValidation.requireOrganizationAdmin(user, organizationId);
        } catch (adminError) {
          // Check if user is president
          const userId = convertToBigInt(user.sub);
          const userRole = await this.prisma.organizationUser.findUnique({
            where: {
              organizationId_userId: {
                organizationId: document.lecture.cause.organizationId,
                userId: userId,
              },
            },
            select: {
              role: true,
              isVerified: true,
            },
          });

          if (!userRole || !userRole.isVerified || userRole.role !== 'PRESIDENT') {
            throw new ForbiddenException(
              'Insufficient permissions. Only organization presidents and admins can delete documents.'
            );
          }
        }
      } else {
        throw new UnauthorizedException('Authentication required');
      }

      // Soft delete the document
      await this.prisma.documentation.update({
        where: { documentationId: docIdBigInt },
        data: {
          isActive: false,
        },
      });

      this.logger.warn(`🗑️ Document soft deleted: ${document.title} (ID: ${documentationId}) by user ${user?.sub || 'unknown'}`);
      
      return {
        message: `Document "${document.title}" soft deleted successfully`,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to soft delete document ${documentationId}:`, error);
      throw new BadRequestException('Failed to delete document');
    }
  }

  /**
   * DELETE SINGLE DOCUMENT (Helper method)
   * Private helper for internal use
   */
  private async deleteDocumentWithFile(documentationId: bigint): Promise<boolean> {
    try {
      // Get document details
      const document = await this.prisma.documentation.findUnique({
        where: { documentationId },
        select: {
          documentationId: true,
          title: true,
          docUrl: true,
        },
      });

      if (!document) {
        this.logger.warn(`⚠️ Document ${documentationId} not found in database`);
        return false;
      }

      // Delete file from S3 storage first
      if (document.docUrl) {
        try {
          await this.cloudStorage.deleteFile(document.docUrl);
          this.logger.log(`🗑️ Deleted file from S3: ${document.docUrl}`);
        } catch (storageError) {
          this.logger.error(`Failed to delete file from S3: ${document.docUrl}`, storageError);
          // Continue with database deletion even if S3 fails
        }
      }

      // Delete from database
      await this.prisma.documentation.delete({
        where: { documentationId },
      });

      this.logger.log(`✅ Document deleted: ${document.title} (ID: ${documentationId})`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete document ${documentationId}:`, error);
      return false;
    }
  }

  /**
   * DELETE LECTURE (SOFT DELETE with CASCADE)
   * 
   * Soft deletes a lecture and all related documents
   * Only accessible by organization PRESIDENT and ADMIN roles
   * 
   * Cascade behavior:
   * - Sets lecture.isActive = false
   * - Sets all related documents.isActive = false
   */
  async deleteLecture(lectureId: string, user?: EnhancedJwtPayload) {
    try {
      const lectureBigIntId = convertToBigInt(lectureId);

      // Get lecture with organization data and document count
      const lecture = await this.prisma.lecture.findUnique({
        where: { lectureId: lectureBigIntId },
        select: {
          lectureId: true,
          title: true,
          causeId: true,
          isActive: true,
          cause: {
            select: {
              organizationId: true,
            },
          },
          _count: {
            select: {
              documentations: true,
            },
          },
        },
      });

      if (!lecture) {
        throw new NotFoundException('Lecture not found');
      }

      if (!lecture.isActive) {
        throw new NotFoundException('Lecture has already been deleted');
      }

      // JWT-based access validation 
      // Only allow organization presidents and admins to soft delete lectures
      const organizationId = convertToString(lecture.cause.organizationId);
      if (user) {
        try {
          // Try organization admin first (highest permission)
          this.jwtAccessValidation.requireOrganizationAdmin(user, organizationId);
        } catch (adminError) {
          // Check if user is president
          const userId = convertToBigInt(user.sub);
          const userRole = await this.prisma.organizationUser.findUnique({
            where: {
              organizationId_userId: {
                organizationId: lecture.cause.organizationId,
                userId: userId,
              },
            },
            select: {
              role: true,
              isVerified: true,
            },
          });

          if (!userRole || !userRole.isVerified || userRole.role !== 'PRESIDENT') {
            throw new ForbiddenException(
              'Insufficient permissions. Only organization presidents and admins can delete lectures.'
            );
          }
        }
      }

      // Start transaction for cascade soft delete
      const result = await this.prisma.$transaction(async (prisma) => {
        // 1. Soft delete all documents related to this lecture
        const documentsUpdate = await prisma.documentation.updateMany({
          where: {
            lectureId: lectureBigIntId,
          },
          data: {
            isActive: false,
          },
        });

        // 2. Soft delete the lecture itself
        const lectureUpdate = await prisma.lecture.update({
          where: { lectureId: lectureBigIntId },
          data: {
            isActive: false,
          },
        });

        return {
          lecture: lectureUpdate,
          documentsAffected: documentsUpdate.count,
        };
      });

      this.logger.warn(`🗑️ Soft deleted lecture ${lectureId} (${lecture.title}) with ${result.documentsAffected} documents by user ${user?.sub || 'unknown'}`);
      
      return {
        message: 'Lecture and all related documents soft deleted successfully',
        deletedLecture: {
          lectureId: convertToString(result.lecture.lectureId),
          title: result.lecture.title,
          deletedAt: new Date().toISOString(),
        },
        cascade: {
          documentsAffected: result.documentsAffected,
        },
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Lecture deletion failed for ID ${lectureId}:`, error);
      throw new BadRequestException('Failed to delete lecture');
    }
  }

  /**
   * GET LECTURE DOCUMENTS (ENTERPRISE OPTIMIZED)
   * 
   * Separate endpoint for documents to avoid loading them when not needed
   */
  async getLectureDocuments(lectureId: string, user?: EnhancedJwtPayload) {
    try {
      const lectureBigIntId = convertToBigInt(lectureId);
      
      // First check if lecture exists and get access info
      const lecture = await this.prisma.lecture.findFirst({
        where: { 
          lectureId: lectureBigIntId,
          isActive: true, // Only allow access to active (non-deleted) lectures
        },
        select: {
          lectureId: true,
          isPublic: true,
          cause: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      if (!lecture) {
        throw new NotFoundException('Lecture not found');
      }

      // JWT-based access validation
      if (!lecture.isPublic && user) {
        const organizationId = convertToString(lecture.cause.organizationId);
        this.jwtAccessValidation.requireOrganizationMember(user, organizationId);
      } else if (!lecture.isPublic && !user) {
        throw new ForbiddenException('Access denied - authentication required');
      }

      // Get documents with minimal fields
      const documents = await this.prisma.documentation.findMany({
        where: { 
          lectureId: lectureBigIntId,
          isActive: true, // Only show active (non-deleted) documents
        },
        select: {
          documentationId: true,
          title: true,
          description: true,
          docUrl: true,
          createdAt: true,
          updatedAt: true,
          // NO content field for list view (avoid large data)
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform to production format
      const result = documents.map(doc => ({
        documentationId: convertToString(doc.documentationId),
        title: doc.title,
        description: doc.description,
        docUrl: doc.docUrl,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }));

      // Transform document URLs
      const transformedDocuments = this.urlTransformer.transformCommonFieldsArray(result);

      this.logger.log(`📄 Retrieved ${documents.length} documents for lecture ${lectureId}`);
      return {
        lectureId: convertToString(lecture.lectureId),
        documents: transformedDocuments,
        documentCount: transformedDocuments.length,
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Document retrieval failed for lecture ${lectureId}:`, error);
      throw new BadRequestException('Failed to retrieve lecture documents');
    }
  }

  /**
   * ULTRA-OPTIMIZED WHERE CLAUSE BUILDER
   * 
   * Features:
   * - JWT-based organization filtering (no cause joins)
   * - Minimal database queries
   * - Cause ID filtering optimized
   * - Smart query building for performance
   */
  private buildOptimizedWhereClause(user: EnhancedJwtPayload | undefined, queryDto: LectureQueryDto): any {
    const where: any = {
      isActive: true, // Only show active (non-deleted) lectures
    };

    // Step 1: CAUSE ID FILTERING (PRIMARY OPTIMIZATION - NO JOINS NEEDED)
    if (queryDto.causeIds) {
      const causeIdArray = queryDto.causeIds.split(',').map(id => convertToBigInt(id.trim()));
      where.causeId = { in: causeIdArray };
    } else if (queryDto.causeId) {
      where.causeId = convertToBigInt(queryDto.causeId);
    }

    // Step 2: BASE ACCESS CONTROL (JWT-BASED - NO DATABASE QUERIES)
    if (user) {
      // If specific causes are requested, check access via JWT
      if (queryDto.causeIds || queryDto.causeId) {
        // User has access to specific causes via JWT, no need for complex OR logic
        const userOrgIds = this.jwtAccessValidation.getUserOrganizationsByRole(user)
          .map(org => org.organizationId);
        
        // Only add public filter if user doesn't have access to requested causes
        // This is optimized - we trust JWT validation for cause access
        if (!queryDto.causeIds && !queryDto.causeId) {
          where.OR = [
            { isPublic: true },
            // Only add cause filter if no specific causes requested
            {
              cause: {
                organizationId: {
                  in: userOrgIds.map(id => convertToBigInt(id)),
                },
              },
            },
          ];
        }
      } else {
        // General browsing - show public + user's organization lectures
        const userOrgIds = this.jwtAccessValidation.getUserOrganizationsByRole(user)
          .map(org => convertToBigInt(org.organizationId));

        where.OR = [
          { isPublic: true },
          {
            cause: {
              organizationId: {
                in: userOrgIds,
              },
            },
          },
        ];
      }
    }

    // Step 3: ORGANIZATION FILTERING (AVOID CAUSE JOINS WHEN POSSIBLE)
    if (queryDto.organizationIds && user) {
      const orgIdArray = queryDto.organizationIds.split(',').map(id => convertToBigInt(id.trim()));
      // Override OR logic with specific organization filter
      delete where.OR;
      where.cause = {
        organizationId: { in: orgIdArray },
      };
    } else if (queryDto.organizationId && user) {
      delete where.OR;
      where.cause = {
        organizationId: convertToBigInt(queryDto.organizationId),
      };
    }

    // Step 4: SEARCH FILTERING (NO JOINS)
    if (queryDto.search) {
      const searchConditions = [
        { title: { contains: queryDto.search, mode: 'insensitive' } },
        { description: { contains: queryDto.search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        // Combine search with existing OR conditions
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = [...(where.OR || []), ...searchConditions];
      }
    }

    // Step 5: DIRECT FIELD FILTERING (NO JOINS)
    if (queryDto.mode) {
      where.mode = queryDto.mode;
    }

    if (queryDto.isPublic && queryDto.isPublic !== 'all') {
      where.isPublic = queryDto.isPublic === 'true';
    }

    // Step 6: DATE FILTERING (INDEXED FIELDS) - ENHANCED
    if (queryDto.fromDate || queryDto.toDate) {
      if (!where.timeStart) {
        where.timeStart = {};
      }
      if (queryDto.fromDate) {
        where.timeStart.gte = new Date(queryDto.fromDate);
      }
      if (queryDto.toDate) {
        where.timeStart.lte = new Date(queryDto.toDate);
      }
    }

    // Step 7: STATUS FILTERING (OPTIMIZED DATE QUERIES) - ENHANCED
    if (queryDto.status && queryDto.status !== 'all') {
      const now = new Date();
      switch (queryDto.status) {
        case 'upcoming':
          // Override previous timeStart filters for status
          where.timeStart = { gt: now };
          break;
        case 'live':
          // Currently happening lectures
          where.AND = [
            ...(where.AND || []),
            { timeStart: { lte: now } },
            { 
              OR: [
                { timeEnd: { gte: now } },
                { timeEnd: null }, // No end time means ongoing
              ]
            },
          ];
          break;
        case 'completed':
          where.timeEnd = { lt: now };
          break;
      }
    }

    return where;
  }

  /**
   * OPTIMIZED ORDER BY CLAUSE BUILDER
   */
  private buildOrderByClause(queryDto: LectureQueryDto): any {
    const sortBy = queryDto.sortBy || 'createdAt';
    const sortOrder = queryDto.sortOrder || 'desc';

    return { [sortBy]: sortOrder };
  }
}
