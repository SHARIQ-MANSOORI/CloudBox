import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: (smtpUser && smtpUser !== 'your_smtp_username') ? {
    user: smtpUser,
    pass: smtpPass
  } : undefined
});

export const sendMail = async ({ to, subject, html, text }) => {
  const from = process.env.SMTP_FROM || '"CloudBox Security" <no-reply@cloudbox.app>';

  console.log(`\n==================================================`);
  console.log(`[EMAIL NOTIFICATION SERVICE]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content:\n${text || html}`);
  console.log(`==================================================\n`);

  if (smtpUser && smtpUser !== 'your_smtp_username') {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html
      });
      console.log(`[SMTP Sent] Message ID: ${info.messageId}`);
      return info;
    } catch (err) {
      console.warn(`[SMTP Warning] Real SMTP delivery failed (${err.message}). OTP printed in console above.`);
      return { messageId: 'console-fallback' };
    }
  }

  return { messageId: 'console-fallback' };
};
