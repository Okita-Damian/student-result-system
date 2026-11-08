import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  ConflictException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  Prisma,
  ResultSource,
  ResultStatus,
  UserRole,
} from '../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateResultSheetDto } from './dto/create-result-sheet.dto';
import { ListResultSheetsQueryDto } from './dto/list-result-sheet-query.dto';
import { MyResultSheetsQueryDto } from './dto/my-result-sheet-query-dto';
import { ListAdminPublishedResultsQueryDto } from './dto/list-admin-published-results-query.dto';
import type { UploadedImageFile } from './interfaces/uploaded-image-file.interface';

import { createHash, randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface VerifiedImage {
  extension: 'jpg' | 'png';
  mimeType: 'image/jpeg' | 'image/png';
}

@Injectable()
export class ResultSheetsService {
  private readonly logger = new Logger(ResultSheetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    const cloudName = configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary credentials are missing from the environment.',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  async create(
    dto: CreateResultSheetDto,
    uploadedById: string,
    file: UploadedImageFile,
  ) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('An image file is required.');
    }

    if (file.buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('The image must not exceed 10 MB.');
    }

    if (file.size !== file.buffer.length) {
      throw new BadRequestException('Invalid image file size.');
    }

    const verifiedImage = this.verifyImage(file);
    const title = dto.title.trim();

    if (!title) {
      throw new BadRequestException('Title cannot be empty.');
    }

    const uploader = await this.prisma.user.findUnique({
      where: { id: uploadedById },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!uploader || !uploader.isActive) {
      throw new NotFoundException('Active uploading user was not found.');
    }

    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
      select: {
        id: true,
        facultyId: true,
        isActive: true,
      },
    });

    if (
      !department ||
      !department.isActive ||
      department.facultyId !== dto.facultyId
    ) {
      throw new BadRequestException(
        'The department must be active and belong to the selected faculty.',
      );
    }

    const faculty = await this.prisma.faculty.findUnique({
      where: { id: dto.facultyId },
      select: { id: true },
    });

    if (!faculty) {
      throw new BadRequestException('Faculty was not found.');
    }

    const academicSession = await this.prisma.academicSession.findUnique({
      where: { id: dto.academicSessionId },
      select: { id: true },
    });

    if (!academicSession) {
      throw new BadRequestException('Academic session was not found.');
    }

    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
        select: {
          id: true,
          departmentId: true,
        },
      });

      if (!course || course.departmentId !== department.id) {
        throw new BadRequestException(
          'The course must belong to the selected department.',
        );
      }
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    // A random identifier prevents filenames from being predictable.
    const publicId = `imsu-result-sheets/${randomUUID()}`;

    let uploadedPublicId: string | undefined;

    try {
      const uploaded = await new Promise<{
        public_id: string;
        bytes: number;
        format: string;
      }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'image',
            type: 'authenticated',
            overwrite: false,
            unique_filename: false,
            use_filename: false,
          },
          (error, result) => {
            if (error) {
              const uploadError = new Error('Cloudinary image upload failed.');
              uploadError.cause = error;
              reject(uploadError);
              return;
            }

            if (!result) {
              reject(new Error('Cloudinary returned no upload result.'));
              return;
            }

            resolve({
              public_id: result.public_id,
              bytes: result.bytes,
              format: result.format,
            });
          },
        );

        uploadStream.on('error', (streamError: Error) => {
          reject(
            streamError instanceof Error
              ? streamError
              : new Error('Cloudinary upload stream failed.'),
          );
        });

        uploadStream.end(file.buffer);
      });

      uploadedPublicId = uploaded.public_id;

      const isStudent = uploader.role === UserRole.STUDENT;

      const source = isStudent ? ResultSource.STUDENT : ResultSource.ADMIN;

      const status = isStudent ? ResultStatus.PUBLISHED : ResultStatus.DRAFT;

      const publishedAt = isStudent ? new Date() : null;

      const result = await this.prisma.resultSheet.create({
        data: {
          title,
          facultyId: dto.facultyId,
          departmentId: dto.departmentId,
          academicSessionId: dto.academicSessionId,
          semester: dto.semester,
          level: dto.level,
          courseId: dto.courseId,
          originalFilename: basename(
            file.originalname.replace(/\\/g, '/'),
          ).slice(0, 255),
          storageKey: uploaded.public_id,
          mimeType: verifiedImage.mimeType,
          fileSize: BigInt(uploaded.bytes),
          checksum,
          uploadedById: uploader.id,
          source,
          status,
          publishedAt,
        },
        select: {
          id: true,
          title: true,
          originalFilename: true,
          mimeType: true,
          fileSize: true,
          semester: true,
          level: true,
          source: true,
          status: true,
          facultyId: true,
          departmentId: true,
          academicSessionId: true,
          courseId: true,
          uploadedById: true,
          createdAt: true,
        },
      });

      // Convert BigInt to string because JSON cannot serialize BigInt.
      return {
        ...result,
        fileSize: result.fileSize.toString(),
      };
    } catch (error) {
      // If the database write fails after upload, remove the cloud object.
      if (uploadedPublicId) {
        try {
          await cloudinary.uploader.destroy(uploadedPublicId, {
            resource_type: 'image',
            type: 'authenticated',
            invalidate: true,
          });
        } catch (cleanupError) {
          this.logger.error(
            `Failed to clean up Cloudinary object ${uploadedPublicId}.`,
            cleanupError instanceof Error ? cleanupError.stack : undefined,
          );
        }
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        'Result-sheet image upload failed.',
        error instanceof Error ? error.stack : undefined,
      );

      throw new ServiceUnavailableException(
        'Unable to upload the result-sheet image. Please try again.',
      );
    }
  }

  private verifyImage(file: UploadedImageFile): VerifiedImage {
    const buffer = file.buffer;
    const filename = basename(file.originalname.replace(/\\/g, '/'));
    const extension = filename.split('.').pop()?.toLowerCase();

    // JPEG signature: FF D8 FF
    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    const isPng =
      buffer.length >= pngSignature.length &&
      buffer.subarray(0, pngSignature.length).equals(pngSignature);

    if (isJpeg) {
      if (
        !['jpg', 'jpeg'].includes(extension ?? '') ||
        file.mimetype !== 'image/jpeg'
      ) {
        throw new BadRequestException(
          'The JPEG file extension or MIME type is invalid.',
        );
      }

      return {
        extension: 'jpg',
        mimeType: 'image/jpeg',
      };
    }

    if (isPng) {
      if (extension !== 'png' || file.mimetype !== 'image/png') {
        throw new BadRequestException(
          'The PNG file extension or MIME type is invalid.',
        );
      }

      return {
        extension: 'png',
        mimeType: 'image/png',
      };
    }

    // PDFs, GIFs, WebP and all other formats are rejected.
    throw new BadRequestException(
      'Only JPG, JPEG and PNG images are accepted. PDF files are not allowed.',
    );
  }

  async findAll(query: ListResultSheetsQueryDto) {
    const {
      page,
      limit,
      departmentId,
      facultyId,
      academicSessionId,
      semester,
      level,
      status,
    } = query;

    const where: Prisma.ResultSheetWhereInput = {
      ...(departmentId && { departmentId }),
      ...(facultyId && { facultyId }),
      ...(academicSessionId && { academicSessionId }),
      ...(semester && { semester }),
      ...(level !== undefined && { level }),
      ...(status && { status }),
    };

    const skip = (page - 1) * limit;

    const [resultSheets, total] = await this.prisma.$transaction([
      this.prisma.resultSheet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          originalFilename: true,
          mimeType: true,
          fileSize: true,
          semester: true,
          level: true,
          source: true,
          status: true,
          facultyId: true,
          departmentId: true,
          academicSessionId: true,
          courseId: true,
          uploadedById: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
        },
      }),
      this.prisma.resultSheet.count({ where }),
    ]);

    return {
      data: resultSheets.map((sheet) => ({
        ...sheet,
        fileSize: sheet.fileSize.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const resultSheet = await this.prisma.resultSheet.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        originalFilename: true,
        mimeType: true,
        fileSize: true,
        semester: true,
        level: true,
        source: true,
        status: true,
        facultyId: true,
        departmentId: true,
        academicSessionId: true,
        courseId: true,
        uploadedById: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
      },
    });

    if (!resultSheet) {
      throw new NotFoundException('Result sheet was not found.');
    }

    return {
      ...resultSheet,
      fileSize: resultSheet.fileSize.toString(),
    };
  }

  async publish(id: string) {
    const resultSheet = await this.prisma.resultSheet.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!resultSheet) {
      throw new NotFoundException('Result sheet was not found.');
    }

    if (resultSheet.status !== ResultStatus.DRAFT) {
      throw new ConflictException(
        `Only draft result sheets can be published. Current status: ${resultSheet.status}.`,
      );
    }

    // Update only if the result sheet is still a draft.
    // This prevents two concurrent requests from publishing it twice.
    const updated = await this.prisma.resultSheet.updateMany({
      where: {
        id,
        status: ResultStatus.DRAFT,
      },
      data: {
        status: ResultStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      throw new ConflictException(
        'The result sheet has already been changed. Refresh and try again.',
      );
    }

    return this.findOne(id);
  }

  async archive(id: string) {
    const resultSheet = await this.prisma.resultSheet.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!resultSheet) {
      throw new NotFoundException('Result sheet was not found.');
    }

    if (resultSheet.status !== ResultStatus.PUBLISHED) {
      throw new ConflictException(
        `Only published result sheets can be archived. Current status: ${resultSheet.status}.`,
      );
    }

    // Update only if the result sheet is still published.
    const updated = await this.prisma.resultSheet.updateMany({
      where: {
        id,
        status: ResultStatus.PUBLISHED,
      },
      data: {
        status: ResultStatus.ARCHIVED,
      },
    });

    if (updated.count === 0) {
      throw new ConflictException(
        'The result sheet has already been changed. Refresh and try again.',
      );
    }

    return this.findOne(id);
  }

  async findMyResults(userId: string, query: MyResultSheetsQueryDto) {
    const {
      page = 1,
      limit = 10,
      academicSessionId,
      semester,
      level,
      courseId,
      title,
    } = query;

    // Ownership is mandatory; query filters can only narrow these results.
    const where: Prisma.ResultSheetWhereInput = {
      uploadedById: userId,
      source: ResultSource.STUDENT,
      ...(academicSessionId && { academicSessionId }),
      ...(semester && { semester }),
      ...(level !== undefined && { level }),
      ...(courseId && { courseId }),
      ...(title?.trim() && {
        title: {
          contains: title.trim(),
          mode: 'insensitive',
        },
      }),
    };

    const skip = (page - 1) * limit;

    const [resultSheets, total] = await this.prisma.$transaction([
      this.prisma.resultSheet.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          originalFilename: true,
          mimeType: true,
          fileSize: true,
          semester: true,
          level: true,
          source: true,
          status: true,
          facultyId: true,
          departmentId: true,
          academicSessionId: true,
          courseId: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.resultSheet.count({ where }),
    ]);

    return {
      data: resultSheets.map((sheet) => ({
        ...sheet,
        fileSize: sheet.fileSize.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublishedAdminResults(query: ListAdminPublishedResultsQueryDto) {
    const {
      page = 1,
      limit = 10,
      facultyId,
      departmentId,
      academicSessionId,
      semester,
      level,
      courseId,
      title,
    } = query;

    // Always restrict results to published sheets uploaded by admins.
    // Client-supplied filters cannot override these restrictions.
    const where: Prisma.ResultSheetWhereInput = {
      source: ResultSource.ADMIN,
      status: ResultStatus.PUBLISHED,

      ...(facultyId && { facultyId }),
      ...(departmentId && { departmentId }),
      ...(academicSessionId && { academicSessionId }),
      ...(semester && { semester }),
      ...(level !== undefined && { level }),
      ...(courseId && { courseId }),

      ...(title?.trim() && {
        title: {
          contains: title.trim(),
          mode: 'insensitive',
        },
      }),
    };

    const skip = (page - 1) * limit;

    const [resultSheets, total] = await this.prisma.$transaction([
      this.prisma.resultSheet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          originalFilename: true,
          mimeType: true,
          fileSize: true,
          semester: true,
          level: true,
          source: true,
          status: true,
          facultyId: true,
          departmentId: true,
          academicSessionId: true,
          courseId: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      this.prisma.resultSheet.count({ where }),
    ]);

    return {
      data: resultSheets.map((sheet) => ({
        ...sheet,
        fileSize: sheet.fileSize.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
