import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFacultyDto {
  @ApiProperty({
    example: 'Faculty of Engineering',
    description: 'Name of the faculty.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'ENG',
    description: 'Unique faculty code.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({
    example: 'Engineering and technology programmes.',
    description: 'Description of the faculty.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
