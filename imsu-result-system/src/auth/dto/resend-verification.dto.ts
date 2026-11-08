import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'student@example.com',
    description: 'Email address used during registration.',
  })
  @IsEmail()
  email!: string;
}
