import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'The 64-character token from the password-reset email.',
    example: 'a'.repeat(64),
  })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'Reset token must be a valid 64-character hexadecimal string.',
  })
  token!: string;

  @ApiProperty({
    description: 'The new password for the account.',
    minLength: 8,
    maxLength: 72,
    writeOnly: true,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
