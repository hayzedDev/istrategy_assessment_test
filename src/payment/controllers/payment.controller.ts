import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  HttpStatus,
  UseGuards,
  Headers,
  Ip,
  Req,
  Query,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  getSchemaPath,
} from '@nestjs/swagger';
import { PaymentService } from '../services';
import {
  CreatePaymentDto,
  PaginationDto,
  PaymentResponseDto,
  UpdatePaymentStatusDto,
} from '../dto';
import { Payment } from '../entities';
import { AuthenticationGuard } from '../../auth/guards';
import { RequestWithMerchant } from '../../common/interfaces';
import {
  PaginatedResponse,
  PaymentMethodsListResponse,
} from '../../common/responses';

@ApiTags('Payments')
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: 'Common unauthorized response for all protected endpoints',
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: 'Internal server error',
})
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Initialize a payment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The payment has been successfully initialized.',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthenticationGuard)
  @Post()
  async initializePayment(
    @Req() req: RequestWithMerchant,
    @Body() createPaymentDto: CreatePaymentDto,
    @Ip() ip: string,
  ): Promise<Payment> {
    // Add IP address to payment metadata
    if (!createPaymentDto.metadata) createPaymentDto.metadata = {};
    createPaymentDto.metadata.ipAddress = ip;

    // Use the merchant ID from the request object that was set by the AuthenticationGuard
    return this.paymentService.initializePayment(
      req.merchant.id,
      createPaymentDto,
    );
  }

  @ApiOperation({ summary: 'Get payment methods for logged in merchant' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all payment methods for the logged in merchant.',
    type: PaymentMethodsListResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthenticationGuard)
  @Get('payment-methods')
  async getMerchantPaymentMethods(
    @Req() req: RequestWithMerchant,
  ): Promise<PaymentMethodsListResponse> {
    return this.paymentService.getMerchantPaymentMethods(req.merchant);
  }

  @ApiOperation({ summary: 'Get all payments for a merchant' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns paginated payments for a merchant.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(PaymentResponseDto) },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            pageCount: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthenticationGuard)
  @Get('merchant')
  async getMerchantPayments(
    @Req() req: RequestWithMerchant,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    return this.paymentService.getMerchantPaymentsPaginated(
      req.merchant,
      paginationDto.page,
      paginationDto.limit,
    );
  }

  @ApiOperation({ summary: 'Get payment by reference' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns payment details by reference.',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthenticationGuard)
  @Get(':reference')
  async getPaymentByReference(
    @Req() req: RequestWithMerchant,
    @Param('reference') reference: string,
  ): Promise<Payment> {
    const payment = await this.paymentService.getPaymentByReference(
      reference,
      req.merchant.id,
    );

    return payment;
  }
}
