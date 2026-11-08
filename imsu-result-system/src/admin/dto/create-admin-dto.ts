import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @Length(2, 100)
  fullName!: string;

  @ApiProperty({ example: 'admin@imsu.edu.ng' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'StrongAdminPassword123!',
    minLength: 12,
    writeOnly: true,
  })
  @IsString()
  @MinLength(12)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Password must contain an uppercase letter, a lowercase letter, a number, and a special character.',
  })
  password!: string;
}
