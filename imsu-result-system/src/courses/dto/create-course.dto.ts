import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Introduction to Programming' })
  @IsString()
  @Length(2, 150)
  title!: string;

  @ApiProperty({
    example: 'CSC101',
    description:
      'The first digit of the numeric part must match the selected level.',
  })
  @IsString()
  @Matches(/^[A-Za-z]{2,10}[- ]?[1-9][0-9]{2,3}$/, {
    message: 'Course code must look like CSC101 or MTH202.',
  })
  code!: string;

  @ApiProperty({ example: '105038f8-4195-4018-9e16-faf9bbb9f5dc' })
  @IsUUID()
  departmentId!: string;

  @ApiProperty({
    example: 100,
    enum: [100, 200, 300, 400, 500, 600, 700],
    description: 'Used to validate the course code; not stored separately.',
  })
  @IsInt()
  @IsIn([100, 200, 300, 400, 500, 600, 700])
  level!: number;
}
