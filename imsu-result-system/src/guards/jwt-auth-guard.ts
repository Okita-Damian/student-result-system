import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

interface JwtAccessPayload {
  sub: string;
  role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN';
  tokenType: 'access';
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtAccessPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'A valid Bearer access token is required.',
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException('Access token is missing.');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<Record<string, unknown>>(token);

      if (
        typeof payload.sub !== 'string' ||
        !payload.sub ||
        !['STUDENT', 'ADMIN', 'SUPER_ADMIN'].includes(String(payload.role)) ||
        payload.tokenType !== 'access'
      ) {
        throw new UnauthorizedException('Invalid access token payload.');
      }

      request.user = {
        sub: payload.sub,
        role: payload.role as JwtAccessPayload['role'],
        tokenType: 'access',
        ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
      };

      return true;
    } catch {
      throw new UnauthorizedException(
        'Access token is invalid or has expired.',
      );
    }
  }
}
