import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    minLength: 8,
    description: 'Min 8 chars, 1 uppercase, 1 digit, 1 special',
  })
  @MinLength(8)
  @Matches(/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message:
      'newPassword must contain at least one uppercase letter, one number, and one special character',
  })
  newPassword: string;
}
