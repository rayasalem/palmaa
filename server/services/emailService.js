/**
 * Email service: يعتمد على Resend أولاً (RESEND_API_KEY).
 * - احصل على المفتاح: Resend Dashboard → API Keys → Create API Key
 * - ضع المفتاح في متغير البيئة فقط (لا تضعه في الكود):
 *   محلياً: في server/.env كـ RESEND_API_KEY=re_xxxx
 *   على Render: Environment → RESEND_API_KEY
 * - RESEND_FROM: عنوان مرسل من دومين موثّق (مثلاً Palma <noreply@palma.ps>)
 * - إذا لم تضبط RESEND_API_KEY يُستخدم SMTP كاحتياطي.
 */

import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const RESEND_API = 'https://api.resend.com/emails';

/** Send via Resend API (HTTPS). Works on Render without SMTP/DNS. */
async function sendViaResend(to, subject, text, html) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;
  const defaultFrom = 'Palma <noreply@palma.ps>';
  const from = (process.env.RESEND_FROM || defaultFrom).trim();
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) {
    logger.error('emailService Resend send error: no recipients provided');
    return { success: false, error: { message: 'No recipients provided' } };
  }
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
      logger.error('emailService Resend API error', { status: res.status, data });
      return { success: false, error: { message: (data && data.message) || `Resend ${res.status}` } };
    }
    console.log('[emailService] Resend sent to', to, subject);
    return { success: true };
  } catch (err) {
    logger.error('emailService Resend fetch error', { message: err.message });
    return { success: false, error: err };
  }
}

function createTransporter(portOverride) {
  const host = process.env.EMAIL_HOST ? String(process.env.EMAIL_HOST).trim() : '';
  const port = portOverride != null ? portOverride : Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER ? String(process.env.EMAIL_USER).trim() : '';
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
    ...(port === 587 ? { requireTLS: true } : {}),
  });
}

function getTransporter() {
  return createTransporter(undefined);
}

/**
 * Send an email. Tries Resend first if RESEND_API_KEY set; on failure or when not set, uses SMTP (EMAIL_*).
 * @returns {Promise<{ success: boolean, error?: object }>}
 */
async function sendEmail(to, subject, text, html) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) {
    logger.error('emailService sendEmail error: no recipients provided');
    return { success: false, error: { message: 'No recipients provided' } };
  }

  if (process.env.RESEND_API_KEY) {
    const res = await sendViaResend(recipients, subject, text, html);
    if (res && res.success) return res;
    console.warn('[emailService] Resend failed, trying SMTP:', (res.error && res.error.message) || 'no result');
  } else {
    console.warn(
      '[emailService] RESEND_API_KEY not set. Add it in .env or Render Environment (Resend → API Keys) to send emails.'
    );
  }

  const transporter = getTransporter();
  if (!transporter) {
    logger.warn(
      'emailService Email not configured. Set RESEND_API_KEY (Resend → API Keys) in .env or Render Environment.'
    );
    return { success: false, error: { message: 'Email not configured' } };
  }

  const mailOptions = {
    from: (process.env.EMAIL_FROM || process.env.EMAIL_USER || 'Palma <info@palma.ps>').trim(),
    to: recipients,
    subject,
    text: text || (html ? html.replace(/<[^>]*>/g, '') : ''),
    html: html || undefined,
  };

  const configuredPort = Number(process.env.EMAIL_PORT) || 587;
  const trySend = async (trans) => {
    await trans.sendMail(mailOptions);
  };

  try {
    console.log('[emailService] Sending via SMTP to', recipients.join(', '), 'port', configuredPort);
    await trySend(transporter);
    console.log('[emailService] SMTP sent successfully to', recipients.join(', '));
    return { success: true };
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    const isConnectionError =
      /ECONNREFUSED|ETIMEDOUT|ECONNRESET|ENOTFOUND/.test(code) || /timeout|connection|refused/i.test(err.message || '');
    if (isConnectionError && configuredPort === 465) {
      const fallback = createTransporter(587);
      if (fallback) {
        try {
          console.log('[emailService] Port 465 failed, trying port 587 (STARTTLS).');
          await trySend(fallback);
          console.log('[emailService] SMTP sent successfully via port 587 to', recipients.join(', '));
          return { success: true };
        } catch (err2) {
          logger.error('emailService SMTP port 587 also failed', {
            code: err2.code || err2.message,
            message: err2.message,
          });
          return { success: false, error: err2 };
        }
      }
    }
    logger.error('emailService SMTP error', { code: code || err.message, message: err.message });
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

export { sendEmail, getEmailConfirmationTemplate, getPasswordResetTemplate };
