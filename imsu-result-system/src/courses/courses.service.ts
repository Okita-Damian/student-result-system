import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

const COURSE_LEVELS = [100, 200, 300, 400, 500, 600, 700];

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase().replace(/[\s-]/g, '');
  }

  private getLevelFromCode(code: string): number {
    const normalizedCode = this.normalizeCode(code);
    const match = normalizedCode.match(/[0-9]+/);

    if (!match) {
      throw new BadRequestException(
        'Course code must contain a numeric identifier.',
      );
    }

    const level = Number(match[0][0]) * 100;

    if (!COURSE_LEVELS.includes(level)) {
      throw new BadRequestException(
        'Course code must begin with a valid level digit from 1 to 9.',
      );
    }

    return level;
  }

  private validateLevel(code: string, selectedLevel: number): void {
    if (!COURSE_LEVELS.includes(selectedLevel)) {
      throw new BadRequestException('Invalid academic level.');
    }

    const courseLevel = this.getLevelFromCode(code);

    if (courseLevel !== selectedLevel) {
      throw new BadRequestException(
        `Course code ${code} is for ${courseLevel} Level, but you selected ${selectedLevel} Level. Please select the correct academic level.`,
      );
    }
  }

  async create(dto: CreateCourseDto) {
    const code = this.normalizeCode(dto.code);

    this.validateLevel(code, dto.level);

    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    const existingCourse = await this.prisma.course.findFirst({
      where: {
        departmentId: dto.departmentId,
        code,
      },
      select: { id: true },
    });

    if (existingCourse) {
      throw new ConflictException(
        'This course code already exists in the department.',
      );
    }

    try {
      return await this.prisma.course.create({
        data: {
          title: dto.title.trim(),
          code,
          departmentId: dto.departmentId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This course code already exists in the department.',
        );
      }

      throw error;
    }
  }

  async findAll(departmentId?: string, level?: number) {
    if (level !== undefined && !COURSE_LEVELS.includes(level)) {
      throw new BadRequestException('Invalid academic level.');
    }

    if (departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true },
      });

      if (!department) {
        throw new NotFoundException('Department not found.');
      }
    }

    const courses = await this.prisma.course.findMany({
      where: departmentId ? { departmentId } : undefined,
      orderBy: { code: 'asc' },
    });

    if (level === undefined) {
      return courses;
    }

    // Filter by the academic level encoded in each course code.
    return courses.filter((course) => {
      try {
        return this.getLevelFromCode(course.code) === level;
      } catch {
        // Do not return legacy course codes that do not follow the rule.
        return false;
      }
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    const existingCourse = await this.findOne(id);

    const code = dto.code ? this.normalizeCode(dto.code) : existingCourse.code;

    // Validate against the submitted level, or the existing code's level.
    const selectedLevel =
      dto.level ?? this.getLevelFromCode(existingCourse.code);

    this.validateLevel(code, selectedLevel);

    const departmentId = dto.departmentId ?? existingCourse.departmentId;

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true },
      });

      if (!department) {
        throw new NotFoundException('Department not found.');
      }
    }

    const duplicate = await this.prisma.course.findFirst({
      where: {
        departmentId,
        code,
        NOT: { id },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException(
        'This course code already exists in the department.',
      );
    }

    try {
      return await this.prisma.course.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && {
            title: dto.title.trim(),
          }),
          code,
          departmentId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This course code already exists in the department.',
        );
      }

      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    try {
      return await this.prisma.course.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'This course cannot be deleted because it is referenced by other records.',
        );
      }

      throw error;
    }
  }
}
