import { ApiProperty } from '@nestjs/swagger';

export class MerchantBasicResponse {
  @ApiProperty({
    description: 'Merchant name',
    example: 'Merchant Name',
  })
  name: string;

  @ApiProperty({
    description: 'Merchant email',
    example: 'merchant@example.com',
  })
  email: string;
}

export class MerchantsListResponse {
  @ApiProperty({
    description: 'List of merchants',
    type: [MerchantBasicResponse],
  })
  merchants: MerchantBasicResponse[];

  @ApiProperty({
    description: 'Total number of merchants',
    example: 10,
  })
  total: number;
}
