function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function emailVerificationTemplate(
  fullName: string,
  verificationUrl: string,
  expiresInMinutes: number,
) {
  const safeName = escapeHtml(fullName);
  const safeUrl = escapeHtml(verificationUrl);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Your Email</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#222;">
        <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:8px;overflow:hidden;">
          <div style="background:#123b66;color:#ffffff;padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;">IMSU Result System</h1>
          </div>

          <div style="padding:30px;">
            <h2 style="margin-top:0;">Verify your email address</h2>

            <p>Hello ${safeName},</p>

            <p>
              Thank you for registering with the IMSU Result System.
              Please verify your email address to activate your account for login.
            </p>

            <p style="text-align:center;margin:30px 0;">
              <a
                href="${safeUrl}"
                style="display:inline-block;background:#123b66;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:5px;font-weight:bold;"
              >
                Verify Email
              </a>
            </p>

            <p>If the button does not work, copy and paste this link into your browser:</p>

            <p style="overflow-wrap:anywhere;">
              <a href="${safeUrl}">${safeUrl}</a>
            </p>

            <p>This link expires in ${expiresInMinutes} minutes.</p>

            <p>
              If you did not create this account, you can ignore this email.
            </p>

            <p>Regards,<br />IMSU Result System Team</p>
          </div>

          <div style="padding:16px;text-align:center;background:#eef1f5;font-size:12px;color:#666;">
            This is an automated email. Please do not reply.
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
IMSU Result System — Verify Your Email

Hello ${fullName},

Thank you for registering with the IMSU Result System.
Verify your email address to activate your account for login.

Open this link to verify your email:
${verificationUrl}

This link expires in ${expiresInMinutes} minutes.

If you did not create this account, you can ignore this email.

Regards,
IMSU Result System Team
  `.trim();

  return { htmlContent, textContent };
}
