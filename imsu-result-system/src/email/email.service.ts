import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

import { emailVerificationTemplate } from './tamplates/email-verification.template';
import { passwordResetTemplate } from './tamplates/password-reset.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly verificationTtlMinutes: number;
  private readonly brevo: BrevoClient;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    const senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL');
    const senderName = this.configService.get<string>('BREVO_SENDER_NAME');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationTtlMinutes = Number(
      this.configService.get('EMAIL_VERIFICATION_TOKEN_TTL_MINUTES', '30'),
    );

    if (
      !Number.isInteger(verificationTtlMinutes) ||
      verificationTtlMinutes < 1
    ) {
      throw new Error(
        'EMAIL_VERIFICATION_TOKEN_TTL_MINUTES must be a positive integer.',
      );
    }

    this.verificationTtlMinutes = verificationTtlMinutes;

    if (!apiKey || !senderEmail || !senderName || !frontendUrl) {
      throw new Error(
        'Missing required Brevo email configuration in environment variables.',
      );
    }

    this.brevo = new BrevoClient({
      apiKey,
      timeoutInSeconds: 15,
      maxRetries: 2,
    });

    this.senderEmail = senderEmail;
    this.senderName = senderName;
    this.frontendUrl = frontendUrl.replace(/\/+$/, '');
  }

  async sendVerificationEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<void> {
    const verificationUrl = new URL('/verify-email', `${this.frontendUrl}/`);

    verificationUrl.searchParams.set('token', token);

    const { htmlContent, textContent } = emailVerificationTemplate(
      fullName,
      verificationUrl.toString(),
      this.verificationTtlMinutes,
    );

    await this.sendEmail({
      email,
      subject: 'Verify your IMSU Result System account',
      htmlContent,
      textContent,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<void> {
    const resetUrl = new URL('/reset-password', `${this.frontendUrl}/`);

    resetUrl.searchParams.set('token', token);

    const { htmlContent, textContent } = passwordResetTemplate(
      fullName,
      resetUrl.toString(),
      this.verificationTtlMinutes,
    );

    await this.sendEmail({
      email,
      subject: 'Reset your IMSU Result System password',
      htmlContent,
      textContent,
    });
  }

  private async sendEmail(options: {
    email: string;
    subject: string;
    htmlContent: string;
    textContent: string;
  }): Promise<void> {
    try {
      await this.brevo.transactionalEmails.sendTransacEmail({
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [{ email: options.email }],
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent,
      });
    } catch {
      // Do not log API credentials, message contents, or magic-link tokens.
      this.logger.error('Failed to send a transactional email through Brevo.');

      throw new InternalServerErrorException(
        'Unable to send the email. Please try again later.',
      );
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return entities[character];
    });
  }
}
