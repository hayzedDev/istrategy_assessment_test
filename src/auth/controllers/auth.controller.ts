import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from '../services';
import { LoginDto } from '../dto/auth.dto';

import { AuthenticationGuard } from '../guards';
import {
  LoginResponse,
  LogoutResponse,
  MerchantsListResponse,
} from 'src/common/responses';
import { Request } from 'express';

@ApiTags('Auth')
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: 'Common unauthorized response for all protected endpoints',
})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: LoginResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successful',
    type: LogoutResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiBearerAuth() // Using the default bearer auth configuration
  @UseGuards(AuthenticationGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request): Promise<LogoutResponse> {
    return this.authService.logout(req.headers?.authorization);
  }

  @ApiOperation({ summary: 'Get all merchants' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns basic information about all merchants',
    type: MerchantsListResponse,
  })
  @Get('merchants')
  async getAllMerchants(): Promise<MerchantsListResponse> {
    return this.authService.getAllMerchants();
  }
}
