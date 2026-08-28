import { sendMail } from '../config/mailer.js';

export const sendOtpEmail = async (email, otp) => {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || '15';
  const subject = `${otp} is your CloudBox security code`;
  
  const text = `Your CloudBox verification code is: ${otp}\nThis code will expire in ${expiryMinutes} minutes.\nIf you did not request this code, please ignore this email.`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 40px 20px; }
        .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .logo { font-size: 24px; font-weight: 700; color: #2563eb; letter-spacing: -0.5px; margin-bottom: 24px; }
        .title { font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
        .desc { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
        .otp-box { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb; background: #eff6ff; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; border: 1px border #bfdbfe; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">CloudBox</div>
        <div class="title">Verify your email address</div>
        <div class="desc">Welcome to CloudBox! Enter the following 6-digit security code to complete your signup:</div>
        <div class="otp-box">${otp}</div>
        <div class="desc">This verification code expires in <strong>${expiryMinutes} minutes</strong>.</div>
        <div class="footer">If you didn't request this email, you can safely ignore it.</div>
      </div>
    </body>
    </html>
  `;

  return await sendMail({ to: email, subject, text, html });
};
