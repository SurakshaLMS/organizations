import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentationDto } from './dto/create-documentation.dto';
import { UpdateDocumentationDto } from './dto/update-documentation.dto';

/**
 * SIMPLE DOCUMENTATION SERVICE FOR PDF URL MANAGEMENT
 * 
 * Features:
 * - Basic CRUD operations for documentation
 * - PDF URL validation
 * - Lecture association
 * - Simple error handling
 */
@Injectable()
export class DocumentationService {
  constructor(private prisma: PrismaService) {}

  /**
   * CREATE DOCUMENTATION
   */
  async create(createDocumentationDto: CreateDocumentationDto) {
    const { lectureId, title, description, content, docUrl } = createDocumentationDto;
    
    // Convert lectureId to BigInt
    const lectureBigIntId = BigInt(lectureId);
    
    // Validate that the lecture exists
    const lecture = await this.prisma.lecture.findUnique({
      where: { lectureId: lectureBigIntId },
    });

    if (!lecture) {
      throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
    }

    // Validate PDF URL if provided
    if (docUrl && !this.isValidUrl(docUrl)) {
      throw new BadRequestException('Invalid PDF URL format');
    }

    return this.prisma.documentation.create({
      data: {
        lectureId: lectureBigIntId,
        title,
        description,
        content,
        docUrl,
      },
      include: {
        lecture: {
          select: {
            lectureId: true,
            title: true,
            causeId: true,
          },
        },
      },
    });
  }

  /**
   * GET ALL DOCUMENTATION
   */
  async findAll(lectureId?: string) {
    const where = lectureId ? { lectureId: BigInt(lectureId) } : {};

    return this.prisma.documentation.findMany({
      where,
      include: {
        lecture: {
          select: {
            lectureId: true,
            title: true,
            causeId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * GET DOCUMENTATION BY ID
   */
  async findOne(id: string) {
    const docBigIntId = BigInt(id);
    
    const documentation = await this.prisma.documentation.findUnique({
      where: { documentationId: docBigIntId },
      include: {
        lecture: {
          select: {
            lectureId: true,
            title: true,
            causeId: true,
          },
        },
      },
    });

    if (!documentation) {
      throw new NotFoundException(`Documentation with ID ${id} not found`);
    }

    return documentation;
  }

  /**
   * GET DOCUMENTATION BY LECTURE ID
   */
  async findByLecture(lectureId: string) {
    const lectureBigIntId = BigInt(lectureId);
    
    // Validate that the lecture exists
    const lecture = await this.prisma.lecture.findUnique({
      where: { lectureId: lectureBigIntId },
    });

    if (!lecture) {
      throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
    }

    return this.prisma.documentation.findMany({
      where: { lectureId: lectureBigIntId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * UPDATE DOCUMENTATION
   */
  async update(id: string, updateDocumentationDto: UpdateDocumentationDto) {
    const docBigIntId = BigInt(id);
    
    // Check if documentation exists
    const existingDoc = await this.prisma.documentation.findUnique({
      where: { documentationId: docBigIntId },
    });

    if (!existingDoc) {
      throw new NotFoundException(`Documentation with ID ${id} not found`);
    }

    // Validate PDF URL if provided
    if (updateDocumentationDto.docUrl && !this.isValidUrl(updateDocumentationDto.docUrl)) {
      throw new BadRequestException('Invalid PDF URL format');
    }

    return this.prisma.documentation.update({
      where: { documentationId: docBigIntId },
      data: updateDocumentationDto,
      include: {
        lecture: {
          select: {
            lectureId: true,
            title: true,
            causeId: true,
          },
        },
      },
    });
  }

  /**
   * DELETE DOCUMENTATION
   */
  async remove(id: string) {
    const docBigIntId = BigInt(id);
    
    // Check if documentation exists
    const existingDoc = await this.prisma.documentation.findUnique({
      where: { documentationId: docBigIntId },
    });

    if (!existingDoc) {
      throw new NotFoundException(`Documentation with ID ${id} not found`);
    }

    return this.prisma.documentation.delete({
      where: { documentationId: docBigIntId },
    });
  }

  /**
   * GET DOCUMENTATION STATISTICS FOR A LECTURE
   */
  async getDocumentationStats(lectureId: string) {
    const lectureBigIntId = BigInt(lectureId);
    
    const stats = await this.prisma.documentation.aggregate({
      where: { lectureId: lectureBigIntId },
      _count: {
        documentationId: true,
      },
    });

    return {
      totalDocuments: stats._count.documentationId,
      lectureId,
    };
  }

  /**
   * SEARCH DOCUMENTATION BY TITLE OR CONTENT
   */
  async searchDocumentation(query: string, lectureId?: string) {
    const where: any = {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { content: { contains: query } },
      ],
    };

    if (lectureId) {
      where.lectureId = BigInt(lectureId);
    }

    return this.prisma.documentation.findMany({
      where,
      include: {
        lecture: {
          select: {
            lectureId: true,
            title: true,
            causeId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * VALIDATE URL FORMAT
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
