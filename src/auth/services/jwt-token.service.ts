import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtTokenService {
  constructor(private readonly configService: ConfigService) {}

  sign(payload: any, options?: any) {
    const defaultExpiresIn =
      this.configService.get<number>('JWT_EXPIRES_IN_SECONDS') || 3600;

    // Merge the provided options with default options
    const mergedOptions = {
      expiresIn: defaultExpiresIn,
    };

    const secret = this.configService.get<string>('JWT_SECRET');

    return jwt.sign(payload, secret, mergedOptions);
  }

  verify(token: string): any {
    const secret = this.configService.get<string>('JWT_SECRET');
    return jwt.verify(token, secret);
  }

  decode(token: string): any {
    return jwt.decode(token);
  }
}
