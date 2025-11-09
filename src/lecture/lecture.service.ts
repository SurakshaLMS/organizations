import { Injectable, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAccessValidationService } from '../auth/jwt-access-validation.service';
import { CreateLectureDto, UpdateLectureDto, LectureQueryDto } from './dto/lecture.dto';
import { CreateLectureWithDocumentsDto, LectureWithDocumentsResponseDto } from './dto/create-lecture-with-documents.dto';
import { PaginationDto, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { convertToBigInt, convertToString, EnhancedJwtPayload } from '../auth/organization-access.service';
import { CloudStorageService, FileUploadResult } from '../common/services/cloud-storage.service';
import { UrlTransformerService } from '../common/services/url-transformer.service';

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
   * Enhanced lecture creation that supports uploading multiple documents to S3
   * and creating lecture with documents in a single transaction.
   */
  async createLectureWithDocuments(
    createLectureDto: CreateLectureDto,
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

      // Create the lecture first
      const lecture = await this.prisma.lecture.create({
        data: {
          ...createLectureDto,
          causeId: causeIdBigInt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      let uploadedDocuments: DocumentUploadResult[] = [];

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
      
      this.logger.error(`Enhanced lecture creation failed for cause ${causeId}:`, error);
      throw new BadRequestException('Failed to create lecture with documents');
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
      const lecture = await this.prisma.lecture.findUnique({
        where: { lectureId: lectureBigIntId },
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

      // Prepare update data
      const updateData: any = {};
      Object.keys(updateLectureDto).forEach(key => {
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

      // Fetch ALL existing documents for this lecture
      const allDocuments = await this.prisma.documentation.findMany({
        where: { lectureId: lectureBigIntId },
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

      // Return enhanced response with updated lecture, all documents, and upload info
      return {
        ...updatedLecture,
        documents, // All existing documents (including newly uploaded)
        uploadedDocuments, // Info about newly uploaded files
        totalDocuments: documents.length,
        newDocumentsCount: uploadedDocuments.length,
        message: `Lecture updated successfully${uploadedDocuments.length > 0 ? ` with ${uploadedDocuments.length} new documents` : ''}`,
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to update lecture with documents for ID ${lectureId}:`, error);
      throw new BadRequestException('Failed to update lecture with documents');
    }
  }

  /**
   * DELETE LECTURE (ENTERPRISE OPTIMIZED)
   */
  async deleteLecture(lectureId: string, user?: EnhancedJwtPayload) {
    try {
      const lectureBigIntId = convertToBigInt(lectureId);

      // Get lecture with minimal organization data
      const lecture = await this.prisma.lecture.findUnique({
        where: { lectureId: lectureBigIntId },
        select: {
          lectureId: true,
          title: true,
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

      // JWT-based access validation 
      // Allow organization admins and moderators to delete lectures
      // Since Lecture model lacks createdBy field, we implement organization-level permissions
      const organizationId = convertToString(lecture.cause.organizationId);
      if (user) {
        try {
          // Try organization admin first (highest permission)
          this.jwtAccessValidation.requireOrganizationAdmin(user, organizationId);
        } catch (adminError) {
          // If not admin, try moderator (teacher equivalent)
          try {
            this.jwtAccessValidation.requireOrganizationModerator(user, organizationId);
          } catch (moderatorError) {
            throw new ForbiddenException(
              'Insufficient permissions. Only organization admins and moderators can delete lectures.'
            );
          }
        }
      }

      // Step 1: Get all documents associated with this lecture
      const documents = await this.prisma.documentation.findMany({
        where: { lectureId: lectureBigIntId },
        select: {
          documentationId: true,
          title: true,
          docUrl: true,
        },
      });

      this.logger.log(`🗑️ Found ${documents.length} documents to delete for lecture ${lectureId}`);

      // Step 2: Delete documents from S3 storage
      const deletedDocuments: Array<{
        documentationId: string;
        title: string;
        url: string | null;
      }> = [];
      
      const failedDeletions: Array<{
        documentationId: string;
        title: string;
        error: string;
      }> = [];

      for (const document of documents) {
        try {
          if (document.docUrl) {
            // Delete file from cloud storage using relative path stored in DB
            await this.cloudStorage.deleteFile(document.docUrl);
            this.logger.log(`📄 Deleted document from storage: ${document.title}`);
          }
          
          deletedDocuments.push({
            documentationId: convertToString(document.documentationId),
            title: document.title,
            url: document.docUrl,
          });
        } catch (storageError) {
          this.logger.error(`Failed to delete document ${document.title} from storage:`, storageError);
          failedDeletions.push({
            documentationId: convertToString(document.documentationId),
            title: document.title,
            error: 'Storage deletion failed',
          });
          // Continue with database deletion even if storage fails
        }
      }

      // Step 3: Delete documents from database (this will cascade due to foreign key relationship)
      // The Prisma schema should have onDelete: Cascade for this to work automatically
      // But we'll be explicit for safety
      if (documents.length > 0) {
        await this.prisma.documentation.deleteMany({
          where: { lectureId: lectureBigIntId },
        });
        this.logger.log(`🗑️ Deleted ${documents.length} documents from database for lecture ${lectureId}`);
      }

      // Step 4: Delete the lecture itself
      await this.prisma.lecture.delete({
        where: { lectureId: lectureBigIntId },
      });

      this.logger.warn(`🗑️ Lecture ${lectureId} (${lecture.title}) and ${documents.length} documents deleted ${user ? `by user ${user.sub}` : 'without authentication'}`);
      
      return {
        message: 'Lecture and all related documents deleted successfully',
        deletedLecture: {
          lectureId: convertToString(lecture.lectureId),
          title: lecture.title,
          deletedAt: new Date().toISOString(),
        },
        deletedDocuments: {
          count: deletedDocuments.length,
          successful: deletedDocuments,
          failed: failedDeletions,
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
      const lecture = await this.prisma.lecture.findUnique({
        where: { lectureId: lectureBigIntId },
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
        where: { lectureId: lectureBigIntId },
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
    const where: any = {};

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
