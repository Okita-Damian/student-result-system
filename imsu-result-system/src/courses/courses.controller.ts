import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { UserRole } from '../generated/prisma/client';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@ApiTags('Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a course (admin only)' })
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List courses, optionally filtered by department and level',
  })
  @ApiQuery({
    name: 'departmentId',
    required: false,
    description: 'Filter by department UUID',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: [100, 200, 300, 400, 500, 600, 700],
    description: 'Filter by academic level',
  })
  findAll(
    @Query('departmentId') departmentId?: string,
    @Query('level') level?: string,
  ) {
    if (departmentId && !/^[0-9a-f-]{36}$/i.test(departmentId)) {
      throw new BadRequestException('Invalid department ID.');
    }

    let parsedLevel: number | undefined;

    if (level !== undefined) {
      parsedLevel = Number(level);

      if (![100, 200, 300, 400, 500, 600, 700].includes(parsedLevel)) {
        throw new BadRequestException(
          'Level must be one of 100, 200, 300, 400, 500, 600, or 700.',
        );
      }
    }

    return this.coursesService.findAll(departmentId, parsedLevel);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a course (admin only)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a course (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.remove(id);
  }
}
