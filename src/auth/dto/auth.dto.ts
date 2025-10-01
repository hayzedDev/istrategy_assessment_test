import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'User email',
    example: 'admin@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.toLowerCase()?.trim())
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
}
