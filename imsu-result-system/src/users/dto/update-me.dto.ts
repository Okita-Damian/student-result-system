import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({
    example: 'john Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Required when changing your password.',
    minLength: 8,
    writeOnly: true,
  })
  @ValidateIf((dto: UpdateMeDto) => dto.newPassword !== undefined)
  @IsString()
  @MinLength(8)
  currentPassword?: string;

  @ApiPropertyOptional({
    description: 'New password. Requires the current password.',
    minLength: 8,
    writeOnly: true,
  })
  @ValidateIf((dto: UpdateMeDto) => dto.currentPassword !== undefined)
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
