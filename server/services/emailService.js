/**
 * Email service: send via Resend API (HTTPS, works on Render) or fallback to Nodemailer SMTP.
 * - Prefer Resend: set RESEND_API_KEY on Render (no SMTP/DNS issues).
 * - RESEND_FROM should be a verified sender like "Palma <noreply@palma.ps>".
 */

import nodemailer from 'nodemailer';

const RESEND_API = 'https://api.resend.com/emails';

/** Send via Resend API (HTTPS). Works on Render without SMTP/DNS. */
async function sendViaResend(to, subject, text, html) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;
  const defaultFrom = 'Palma <noreply@palma.ps>';
  const from = (process.env.RESEND_FROM || defaultFrom).trim();
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) {
    console.error('[emailService] Resend send error: no recipients provided');
    return { success: false, error: { message: 'No recipients provided' } };
  }
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Palma-Marketplace/1.0',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html: html || (text ? text.replace(/\n/g, '<br>') : ''),
        text: text || (html ? html.replace(/<[^>]*>/g, '') : ''),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[emailService] Resend API error:', res.status, data);
      return { success: false, error: { message: data?.message || `Resend ${res.status}` } };
    }
    console.log('[emailService] Resend sent to', to, subject);
    return { success: true };
  } catch (err) {
    console.error('[emailService] Resend fetch error:', err.message);
    return { success: false, error: err };
  }
}

function getTransporter() {
  const host = process.env.EMAIL_HOST?.trim();
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER?.trim();
  const pass = (process.env.EMAIL_PASS || '').trim();
  if (!host || !user || !pass) return null;
  const secure = port === 465;
  const tlsReject = process.env.SMTP_STRICT_TLS === 'true';
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    ...(secure && !tlsReject ? { tls: { rejectUnauthorized: false } } : {}),
  });
}

/**
 * Send an email. Tries Resend first if RESEND_API_KEY set; on failure or when not set, uses SMTP (EMAIL_*).
 * @returns {Promise<{ success: boolean, error?: object }>}
 */
async function sendEmail(to, subject, text, html) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) {
    console.error('[emailService] sendEmail error: no recipients provided');
    return { success: false, error: { message: 'No recipients provided' } };
  }

  if (process.env.RESEND_API_KEY) {
    const res = await sendViaResend(recipients, subject, text, html);
    if (res && res.success) return res;
    console.warn('[emailService] Resend failed or not configured, trying SMTP:', res?.error?.message || 'no result');
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.error('[emailService] SMTP not configured: set EMAIL_HOST, EMAIL_USER, EMAIL_PASS (and optionally EMAIL_PORT, EMAIL_FROM) on Render.');
    return { success: false, error: { message: 'Email not configured' } };
  }
  try {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'Palma <info@palma.ps>';
    console.log('[emailService] Sending via SMTP to', recipients.join(', '));
    await transporter.sendMail({
      from: from.trim(),
      to: recipients,
      subject,
      text: text || (html ? html.replace(/<[^>]*>/g, '') : ''),
      html: html || undefined,
    });
    console.log('[emailService] SMTP sent successfully to', recipients.join(', '));
    return { success: true };
  } catch (err) {
    console.error('[emailService] SMTP error:', err.code || err.message, err.message);
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
