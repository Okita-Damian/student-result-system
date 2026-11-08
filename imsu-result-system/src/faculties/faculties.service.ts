import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';
import { ListFacultiesQueryDto } from './dto/list-faculty-query.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class FacultiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFacultyDto) {
    const name = dto.name.trim();
    const code = dto.code?.trim();

    try {
      return await this.prisma.faculty.create({
        data: {
          name,
          ...(code ? { code } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A faculty with this name or code already exists.',
        );
      }

      throw error;
    }
  }

  async findAll(query: ListFacultiesQueryDto) {
    const { page = 1, limit = 10, name, code, description } = query;

    const where: Prisma.FacultyWhereInput = {
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
      ...(description?.trim()
        ? {
            description: {
              contains: description.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [faculties, total] = await this.prisma.$transaction([
      this.prisma.faculty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              departments: true,
            },
          },
        },
      }),
      this.prisma.faculty.count({ where }),
    ]);

    return {
      data: faculties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      include: {
        departments: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found.');
    }

    return faculty;
  }

  async update(id: string, dto: UpdateFacultyDto) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found.');
    }

    const name = dto.name?.trim();
    const code = dto.code?.trim();
    const description = dto.description?.trim();

    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Faculty name cannot be empty.');
    }

    if (dto.code !== undefined && !code) {
      throw new BadRequestException('Faculty code cannot be empty.');
    }

    if (dto.description !== undefined && !description) {
      throw new BadRequestException('Faculty description cannot be empty.');
    }

    try {
      return await this.prisma.faculty.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(code !== undefined ? { code } : {}),
          ...(description !== undefined ? { description } : {}),
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A faculty with this name or code already exists.',
        );
      }

      throw error;
    }
  }

  async remove(id: string) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            departments: true,
            resultSheets: true,
          },
        },
      },
    });

    if (!faculty) throw new NotFoundException('Faculty  not found');

    if (faculty._count.departments > 0 || faculty._count.resultSheets > 0)
      throw new ConflictException(
        'Cannot delete a faculty that has a department or results',
      );
    return this.prisma.faculty.delete({ where: { id } });
  }
}
