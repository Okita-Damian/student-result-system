import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';
import { ListAcademicSessionsQueryDto } from './dto/list-academic-session-query.dto';

@Injectable()
export class AcademicSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateYears(startYear: number, endYear: number): void {
    if (endYear <= startYear) {
      throw new BadRequestException(
        'The ending year must be greater than the starting year.',
      );
    }
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'An academic session with this name already exists.',
      );
    }

    throw error;
  }

  async create(dto: CreateAcademicSessionDto) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException('Academic session name cannot be empty.');
    }

    this.validateYears(dto.startYear, dto.endYear);

    try {
      if (dto.isActive) {
        return await this.prisma.$transaction(async (tx) => {
          await tx.academicSession.updateMany({
            where: { isActive: true },
            data: { isActive: false },
          });

          return tx.academicSession.create({
            data: {
              name,
              startYear: dto.startYear,
              endYear: dto.endYear,
              isActive: true,
            },
          });
        });
      }

      return await this.prisma.academicSession.create({
        data: {
          name,
          startYear: dto.startYear,
          endYear: dto.endYear,
          isActive: false,
        },
      });
    } catch (error: unknown) {
      return this.handlePrismaError(error);
    }
  }

  async findAll(query: ListAcademicSessionsQueryDto) {
    const { page = 1, limit = 10, name, startYear, endYear } = query;

    const where: Prisma.AcademicSessionWhereInput = {
      ...(name?.trim()
        ? {
            name: {
              contains: name.trim(),
              mode: 'insensitive',
            },
          }
        : {}),

      ...(startYear !== undefined ? { startYear } : {}),

      ...(endYear !== undefined ? { endYear } : {}),
    };

    const skip = (page - 1) * limit;

    const [sessions, total] = await this.prisma.$transaction([
      this.prisma.academicSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          startYear: 'desc',
        },
      }),

      this.prisma.academicSession.count({
        where,
      }),
    ]);

    return {
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const session = await this.prisma.academicSession.findUnique({
      where: { id },
      include: {
        _count: {
          select: { resultSheets: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Academic session not found.');
    }

    return session;
  }

  async update(id: string, dto: UpdateAcademicSessionDto) {
    const existing = await this.prisma.academicSession.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Academic session not found.');
    }

    const name = dto.name?.trim();

    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Academic session name cannot be empty.');
    }

    const startYear = dto.startYear ?? existing.startYear;
    const endYear = dto.endYear ?? existing.endYear;

    this.validateYears(startYear, endYear);

    const data = {
      ...(name !== undefined && { name }),
      ...(dto.startYear !== undefined && { startYear }),
      ...(dto.endYear !== undefined && { endYear }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    try {
      if (dto.isActive === true) {
        return await this.prisma.$transaction(async (tx) => {
          await tx.academicSession.updateMany({
            where: {
              isActive: true,
              id: { not: id },
            },
            data: { isActive: false },
          });

          return tx.academicSession.update({
            where: { id },
            data,
          });
        });
      }

      return await this.prisma.academicSession.update({
        where: { id },
        data,
      });
    } catch (error: unknown) {
      return this.handlePrismaError(error);
    }
  }

  async remove(id: string) {
    const session = await this.prisma.academicSession.findUnique({
      where: { id },
      include: {
        _count: {
          select: { resultSheets: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Academic session not found.');
    }

    if (session._count.resultSheets > 0) {
      throw new ConflictException(
        'This academic session cannot be deleted because result sheets are associated with it.',
      );
    }

    await this.prisma.academicSession.delete({
      where: { id },
    });

    return {
      message: 'Academic session deleted successfully.',
    };
  }
}
