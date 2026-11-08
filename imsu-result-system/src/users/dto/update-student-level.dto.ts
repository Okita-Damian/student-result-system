import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt } from 'class-validator';

export class UpdateStudentLevelDto {
  @ApiProperty({
    description: 'The student academic level',
    example: 200,
    enum: [100, 200, 300, 400, 500, 600, 700],
  })
  @IsInt()
  @IsIn([100, 200, 300, 400, 500, 600, 700])
  level!: number;
}
