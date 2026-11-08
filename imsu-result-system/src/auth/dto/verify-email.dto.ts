import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'The 64-character token from the verification email.',
    example: 'a'.repeat(64),
  })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message:
      'Verification token must be a valid 64-character hexadecimal string.',
  })
  token!: string;
}
