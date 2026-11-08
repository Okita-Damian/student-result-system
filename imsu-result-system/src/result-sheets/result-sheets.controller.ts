import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Query,
  Patch,
  Body,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiConflictResponse } from '@nestjs/swagger';

import type { AuthenticatedRequest } from '../guards/jwt-auth-guard';
import { JwtAuthGuard } from '../guards/jwt-auth-guard';
import { CreateResultSheetDto } from './dto/create-result-sheet.dto';
import { ListResultSheetsQueryDto } from './dto/list-result-sheet-query.dto';
import { MyResultSheetsQueryDto } from './dto/my-result-sheet-query-dto';
import { ListAdminPublishedResultsQueryDto } from './dto/list-admin-published-results-query.dto';
import type { UploadedImageFile } from './interfaces/uploaded-image-file.interface';
import { ResultSheetsService } from './result-sheets.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/generated/prisma/enums';
import { RolesGuard } from 'src/guards/roles.guard';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

@ApiTags('Result Sheets')
@ApiBearerAuth()
@Controller('result-sheets')
@UseGuards(JwtAuthGuard)
export class ResultSheetsController {
  constructor(private readonly resultSheetsService: ResultSheetsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Upload a result-sheet image (student and admin)',
    description:
      'Accepts JPG, JPEG and PNG images up to 10 MB. PDF files are not accepted.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'file',
        'title',
        'facultyId',
        'departmentId',
        'academicSessionId',
        'semester',
      ],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'JPG, JPEG or PNG image, maximum 10 MB.',
        },
        title: { type: 'string', example: '2025/2026 First Semester Result' },
        facultyId: { type: 'string', format: 'uuid' },
        departmentId: { type: 'string', format: 'uuid' },
        academicSessionId: { type: 'string', format: 'uuid' },
        semester: {
          type: 'string',
          enum: ['FIRST', 'SECOND'],
        },
        level: {
          type: 'integer',
          example: 200,
        },
        courseId: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Result-sheet image uploaded successfully.',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid metadata, missing image, unsupported format or file exceeding 10 MB.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
      },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPG, JPEG and PNG images are accepted. PDF files are not allowed.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async uploadResultSheet(
    @Body() dto: CreateResultSheetDto,
    @UploadedFile() file: UploadedImageFile | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException(
        'An image file is required. Accepted formats: JPG, JPEG and PNG.',
      );
    }

    return this.resultSheetsService.create(dto, request.user.sub, file);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List and filter result sheets (admin only)',
  })
  @ApiForbiddenResponse({
    description: 'Only administrators can manage result sheets.',
  })
  findAll(@Query() query: ListResultSheetsQueryDto) {
    return this.resultSheetsService.findAll(query);
  }

  @Get('my-results')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary:
      'Get the authenticated student’s uploaded result sheets(student only)',
    description:
      'Returns only result sheets uploaded by the authenticated student. Supports filtering by academic session, semester, level, course, and title, with pagination.',
  })
  @ApiForbiddenResponse({
    description: 'Only students can access this endpoint.',
  })
  async findMyResults(
    @Req() request: AuthenticatedRequest,
    @Query() query: MyResultSheetsQueryDto,
  ) {
    return this.resultSheetsService.findMyResults(request.user.sub, query);
  }

  @Get('admin-published')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Retrieve published results uploaded by administrators',
    description:
      'Returns only published result sheets uploaded by administrators. Supports filtering and pagination.',
  })
  @ApiForbiddenResponse({
    description: 'Only authenticated students can access this endpoint.',
  })
  async findPublishedAdminResults(
    @Query() query: ListAdminPublishedResultsQueryDto,
  ) {
    return this.resultSheetsService.findPublishedAdminResults(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get a result sheet by ID (admin only)',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.resultSheetsService.findOne(id);
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Publish a draft result sheet (admin only)',
  })
  @ApiConflictResponse({
    description: 'The result sheet is not a draft or has already changed.',
  })
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.resultSheetsService.publish(id);
  }

  @Patch(':id/archive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Archive a published result sheet (admin only)',
  })
  @ApiConflictResponse({
    description: 'The result sheet is not published or has already changed.',
  })
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.resultSheetsService.archive(id);
  }
}
