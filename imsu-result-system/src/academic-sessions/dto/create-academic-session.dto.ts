import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsOptional,
} from 'class-validator';

export class CreateAcademicSessionDto {
  @ApiProperty({
    example: '2025/2026',
    description: 'Unique academic session name.',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  name!: string;

  @ApiProperty({ example: 2025, description: 'Starting year.' })
  @IsInt()
  @Min(1900)
  @Max(2200)
  startYear!: number;

  @ApiProperty({ example: 2026, description: 'Ending year.' })
  @IsInt()
  @Min(1901)
  @Max(2201)
  endYear!: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this is the active academic session.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
