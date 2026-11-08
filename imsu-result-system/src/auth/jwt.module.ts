import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth.module';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_ACCESS_SECRET;

        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_ACCESS_SECRET must contain at least 32 characters.',
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn: '15m',
          },
        };
      },
    }),
    AuthModule,
  ],
  exports: [JwtModule],
})
export class JwtConfigModule {}
