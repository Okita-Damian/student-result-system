import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Semester } from '../../generated/prisma/client';

export class MyResultSheetsQueryDto {
  @ApiPropertyOptional({
    type: 'integer',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: 'integer',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({
    description: 'Filter by academic session UUID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  academicSessionId?: string;

  @ApiPropertyOptional({ enum: Semester })
  @IsOptional()
  @IsEnum(Semester)
  semester?: Semester;

  @ApiPropertyOptional({
    enum: [100, 200, 300, 400, 500, 600, 700],
    description: 'Filter by student level',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([100, 200, 300, 400, 500, 600, 700])
  level?: number;

  @ApiPropertyOptional({
    description: 'Filter by course UUID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by result title',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}
