import { ApiProperty } from '@nestjs/swagger';

export class LoginResponse {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Id of the merchant',
    example: '"06e8d362-8937-48e2-8b32-bcbd4f063219"',
  })
  merchantId: string;

  @ApiProperty({
    description: 'Merchant email',
    example: 'merchant@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Merchant name',
    example: 'Merchant User',
  })
  name: string;
}

export class LogoutResponse {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Logout message',
    example: 'You have been successfully logged out',
  })
  message: string;
}
