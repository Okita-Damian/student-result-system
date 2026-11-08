import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { IsIn } from 'class-validator';

import { Type } from 'class-transformer';

import { Semester } from '../../generated/prisma/client';

export class CreateResultSheetDto {
  @ApiProperty({
    example: 'CSC 101 First Semester Result',
    description: 'Title used to identify the uploaded result sheet.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the faculty.',
  })
  @IsUUID()
  facultyId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID of the department.',
  })
  @IsUUID()
  departmentId!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'UUID of the academic session.',
  })
  @IsUUID()
  academicSessionId!: string;

  @ApiProperty({
    enum: Semester,
    example: Semester.FIRST,
    description: 'Semester covered by the result sheet.',
  })
  @IsEnum(Semester)
  semester!: Semester;

  @ApiPropertyOptional({
    example: 200,
    enum: [100, 200, 300, 400, 500, 600, 700],
    description: 'Academic level of the result sheet.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([100, 200, 300, 400, 500, 600, 700])
  level?: number;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440003',
    description: 'UUID of the course, when the sheet is course-specific.',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;
}
