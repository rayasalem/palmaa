/**
 * Email service: send emails via Nodemailer SMTP.
 * Replace EMAIL_* in .env with your SMTP credentials (e.g. Gmail).
 */

import nodemailer from 'nodemailer';

// Create transporter from env. Replace with your SMTP host (e.g. smtp.gmail.com), port (587), user, pass.
const getTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER?.trim();
  const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '').trim();
  if (!host || !user || !pass) {
    console.warn('[emailService] EMAIL_HOST, EMAIL_USER, EMAIL_PASS required. Set in .env.');
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

/**
 * Send an email. Supports both text and html (prefer html if provided).
 * @param {string} to - Recipient email
 * @param {string} subject - Subject line
 * @param {string} [text] - Plain text body
 * @param {string} [html] - HTML body (optional)
 * @returns {Promise<{ success: boolean, error?: object }>}
 */
async function sendEmail(to, subject, text, html) {
  const transporter = getTransporter();
  if (!transporter) {
    console.error('[emailService] No transporter; skipping send.');
    return { success: false, error: { message: 'Email not configured' } };
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@example.com',
      to,
      subject,
      text: text || (html ? html.replace(/<[^>]*>/g, '') : ''),
      html: html || undefined,
    });
    console.log('[emailService] Sent to', to, subject);
    return { success: true };
  } catch (err) {
    console.error('[emailService] Send error:', err.message);
    return { success: false, error: err };
  }
}

/** Sample HTML template for email confirmation OTP */
function getEmailConfirmationTemplate(otpCode) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Email Confirmation Code</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otpCode}</p>
      <p>Enter this code on the verification page to confirm your email. This code expires in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;
}

/** Sample HTML template for password reset OTP */
function getPasswordResetTemplate(otpCode) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Password Reset Code</h2>
      <p>Your password reset code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otpCode}</p>
      <p>Enter this code and your new password on the reset password page. This code expires in 15 minutes.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    </div>
  `;
}

export {
  sendEmail,
  getEmailConfirmationTemplate,
  getPasswordResetTemplate,
};
