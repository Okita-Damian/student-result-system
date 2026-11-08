import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListAcademicSessionsQueryDto {
  @ApiPropertyOptional({
    type: 'integer',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    type: 'integer',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    example: '2025/2026',
    description: 'Search academic sessions by name.',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  name?: string;

  @ApiPropertyOptional({
    type: 'integer',
    example: 2025,
    description: 'Filter by starting year.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2200)
  startYear?: number;

  @ApiPropertyOptional({
    type: 'integer',
    example: 2026,
    description: 'Filter by ending year.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1901)
  @Max(2201)
  endYear?: number;
}
