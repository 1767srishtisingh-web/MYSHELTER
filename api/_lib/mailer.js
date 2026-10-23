'use strict';

const nodemailer = require('nodemailer');









function getTransporter() {
  const gmailUser = (process.env.GMAIL_USER || '').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || '').replace(/\s+/g, '').trim();

  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });
  }

  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }

  return null;
}












async function sendOtpEmail({ to, code, purpose = 'verification', expiresMinutes = 10 }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[MYSHELTER Email] Live email delivery is inactive (GMAIL_USER and GMAIL_APP_PASSWORD not set in environment).`);
    console.log(`[MYSHELTER Email Simulated] Verification OTP for ${to}: ${code} (${purpose})`);
    return { sent: false, simulated: true };
  }

  const senderUser = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
  const fromAddress = process.env.EMAIL_FROM || `"MYSHELTER" <${senderUser}>`;
  const subject = `Your MYSHELTER Verification Code: ${code}`;

  const textContent = [
    `MYSHELTER Verification Code: ${code}`,
    ``,
    `Use this one-time code to complete your ${purpose === 'login' ? 'login' : 'verification'}:`,
    `${code}`,
    ``,
    `This code will expire in ${expiresMinutes} minutes.`,
    `If you did not request this verification code, please ignore this email.`
  ].join('\n');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MYSHELTER Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e6edf3;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0d1117; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #161b22; border: 1px solid #30363d; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.4);" cellspacing="0" cellpadding="0" border="0">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 16px; text-align: center; border-bottom: 1px solid #21262d;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #58a6ff; letter-spacing: -0.5px;">
                MYSHELTER
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #8b949e; letter-spacing: 0.3px;">
                Secure Room & Hostel Booking
              </p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #f0f6fc; text-align: center;">
                Verification Code
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #8b949e; text-align: center;">
                Enter this 6-digit code to complete your ${purpose === 'login' ? 'account login' : 'verification'}:
              </p>

              <!-- OTP Code Display Box -->
              <div style="background: rgba(88, 166, 255, 0.08); border: 2px dashed #388bfd; border-radius: 12px; padding: 18px; text-align: center; margin: 0 0 24px;">
                <span style="font-family: 'SF Mono', Consolas, Menlo, Monaco, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #58a6ff; display: inline-block;">
                  ${code}
                </span>
              </div>

              <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.5; color: #8b949e; text-align: center;">
                This code expires in <strong style="color: #e6edf3;">${expiresMinutes} minutes</strong>.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #6e7681; text-align: center;">
                If you did not request this email, no further action is required and you can safely disregard it.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0e1116; border-top: 1px solid #21262d; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6e7681;">
                &copy; ${new Date().getFullYear()} MYSHELTER. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: textContent,
      html: htmlContent
    });

    console.log(`[MYSHELTER Email] OTP email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[MYSHELTER Email Error] Failed to send email to ${to}:`, err.message);

    return { sent: false, error: err.message, simulated: true };
  }
}

module.exports = {
  getTransporter,
  sendOtpEmail
};

