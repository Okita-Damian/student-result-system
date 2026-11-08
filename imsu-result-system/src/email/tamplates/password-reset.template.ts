function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function passwordResetTemplate(
  fullName: string,
  resetUrl: string,
  expiresInMinutes: number,
) {
  const safeName = escapeHtml(fullName);
  const safeUrl = escapeHtml(resetUrl);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#222;">
        <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:8px;overflow:hidden;">
          <div style="background:#123b66;color:#ffffff;padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;">IMSU Result System</h1>
          </div>

          <div style="padding:30px;">
            <h2 style="margin-top:0;">Reset your password</h2>

            <p>Hello ${safeName},</p>

            <p>
              We received a request to reset the password for your account.
              Use the button below to choose a new password.
            </p>

            <p style="text-align:center;margin:30px 0;">
              <a
                href="${safeUrl}"
                style="display:inline-block;background:#123b66;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:5px;font-weight:bold;"
              >
                Reset Password
              </a>
            </p>

            <p>If the button does not work, copy and paste this link into your browser:</p>

            <p style="overflow-wrap:anywhere;">
              <a href="${safeUrl}">${safeUrl}</a>
            </p>

            <p>This link expires in ${expiresInMinutes} minutes and can only be used once.</p>

            <p>
              If you did not request a password reset, ignore this email.
              Your password will not change unless the reset link is used.
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
IMSU Result System — Reset Your Password

Hello ${fullName},

We received a request to reset your password.
Open this link to choose a new password:

${resetUrl}

This link expires in ${expiresInMinutes} minutes and can only be used once.

If you did not request a password reset, ignore this email.

Regards,
IMSU Result System Team
  `.trim();

  return { htmlContent, textContent };
}
