import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailVerificationCleanupService {
  private readonly logger = new Logger(EmailVerificationCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpiredUnverifiedAccounts(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const result = await this.prisma.user.deleteMany({
        where: {
          emailVerifiedAt: null,
          createdAt: {
            lte: cutoff,
          },
          role: 'STUDENT',
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Deleted ${result.count} unverified student account(s) older than 24 hours.`,
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to delete expired unverified accounts: ${message}`,
      );
    }
  }
}
