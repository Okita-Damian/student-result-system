import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ListDepartmentsQueryDto } from './dto/list-department-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async CreateDepartment(dto: CreateDepartmentDto) {
    const name = dto.name.trim();
    const code = dto.code?.trim();

    if (!name || (dto.code !== undefined && !code)) {
      throw new ConflictException(
        'Department name and any supplied code must not be empty.',
      );
    }

    const faculty = await this.prisma.faculty.findUnique({
      where: { id: dto.facultyId },
      select: { id: true },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found.');
    }

    try {
      return await this.prisma.department.create({
        data: {
          name,
          facultyId: faculty.id,
          ...(code ? { code } : {}),
        },
        include: {
          faculty: true,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A department with this name or code already exists in this faculty.',
        );
      }

      throw error;
    }
  }

  async findAll(query: ListDepartmentsQueryDto) {
    const { page = 1, limit = 10, name, code, facultyId } = query;

    const where: Prisma.DepartmentWhereInput = {
      ...(name?.trim()
        ? {
            name: {
              contains: name.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(code?.trim()
        ? {
            code: {
              contains: code.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(facultyId ? { facultyId } : {}),
    };

    const skip = (page - 1) * limit;

    const [departments, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          faculty: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              courses: true,
              resultSheets: true,
            },
          },
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    return {
      data: departments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async FindOneDepartment(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        faculty: true,
        courses: {
          orderBy: { title: 'asc' },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    return department;
  }

  async UpdateDepartment(id: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    const name = dto.name?.trim();
    const code = dto.code?.trim();

    if (dto.name !== undefined && !name) {
      throw new ConflictException('Department name cannot be empty.');
    }

    if (dto.code !== undefined && !code) {
      throw new ConflictException('Department code cannot be empty.');
    }

    if (dto.facultyId !== undefined) {
      const faculty = await this.prisma.faculty.findUnique({
        where: { id: dto.facultyId },
        select: { id: true },
      });

      if (!faculty) {
        throw new NotFoundException('Faculty not found.');
      }
    }

    try {
      return await this.prisma.department.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(code !== undefined ? { code } : {}),
          ...(dto.facultyId !== undefined ? { facultyId: dto.facultyId } : {}),
        },
        include: {
          faculty: true,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A department with this name or code already exists in this faculty.',
        );
      }

      throw error;
    }
  }

  async RemoveDepartment(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            courses: true,
            resultSheets: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    if (department._count.courses > 0 || department._count.resultSheets > 0) {
      throw new ConflictException(
        'Cannot delete a department that has courses or result sheets.',
      );
    }

    return this.prisma.department.delete({
      where: { id },
    });
  }
}
