/**
 * MFA controller: setup, verify-setup, verify (post-login challenge).
 * Progressive rollout; current login unchanged for users without MFA.
 */

import * as mfaService from '../services/mfaService.js';
import * as authService from '../services/authService.js';
import * as jwtService from '../services/jwtService.js';
import logger from '../utils/logger.js';
import { recordMfaFailure } from '../utils/metrics.js';

async function setup(req, res) {
  try {
    const userId = req.auth && req.auth.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const issuer = (req.body && req.body.issuer) || 'Palma Marketplace';
    const { secret, otpauthUrl, error } = await mfaService.setupMfa(userId, issuer);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'MFA setup failed' });
    }
    return res.status(200).json({
      success: true,
      secret,
      otpauthUrl,
      message: 'Scan QR with authenticator app, then call verify-setup with the code.',
    });
  } catch (err) {
    logger.error('mfa setup unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function verifySetup(req, res) {
  try {
    const userId = req.auth && req.auth.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const code = req.body && (req.body.code || req.body.token);
    if (!code || String(code).trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Valid 6-digit code is required' });
    }
    const { ok, error } = await mfaService.verifyAndEnableMfa(userId, String(code).trim());
    if (!ok) {
      recordMfaFailure('mfa_verify_setup');
      return res.status(400).json({ success: false, error: (error && error.message) || 'Invalid code' });
    }
    return res.status(200).json({ success: true, message: 'MFA enabled' });
  } catch (err) {
    logger.error('mfa verifySetup unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

/**
 * Verify MFA code after login (uses mfaChallengeToken from login response).
 * On success: issue real JWT and set cookie.
 */
async function verify(req, res) {
  try {
    const mfaChallengeToken = req.body && req.body.mfaChallengeToken;
    const code = req.body && (req.body.code || req.body.token);
    if (!mfaChallengeToken) {
      return res.status(400).json({ success: false, error: 'mfaChallengeToken is required' });
    }
    if (!code || String(code).trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Valid 6-digit code is required' });
    }
    const { payload, error: tokenErr } = jwtService.verify(mfaChallengeToken);
    if (tokenErr || !payload || payload.purpose !== 'mfa_challenge') {
      return res.status(401).json({ success: false, error: 'Invalid or expired MFA challenge. Please log in again.' });
    }
    const userId = payload.sub;
    const { ok, error } = await mfaService.verifyMfaCode(userId, String(code).trim());
    if (!ok) {
      recordMfaFailure('mfa_verify');
      return res.status(401).json({ success: false, error: (error && error.message) || 'Invalid code' });
    }
    const { data: user, error: userErr } = await authService.getUserById(userId);
    if (userErr || !user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    const ver = user.token_version ?? 0;
    const token = jwtService.sign({ sub: user.id, email: user.email, role: user.role, ver });
    res.cookie(jwtService.getCookieName(), token, jwtService.getCookieOptions());
    logger.info('mfa verify success', { userId: user.id });
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_email_verified: user.is_email_verified,
        status: user.status,
      },
      token,
      message: 'Logged in',
    });
  } catch (err) {
    logger.error('mfa verify unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function status(req, res) {
  try {
    const userId = req.auth && req.auth.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { enabled, error } = await mfaService.getMfaStatus(userId);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to get MFA status' });
    }
    return res.status(200).json({ success: true, mfa_enabled: enabled });
  } catch (err) {
    logger.error('mfa status unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

async function disable(req, res) {
  try {
    const userId = req.auth && req.auth.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { error } = await mfaService.disableMfa(userId);
    if (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to disable MFA' });
    }
    return res.status(200).json({ success: true, message: 'MFA disabled' });
  } catch (err) {
    logger.error('mfa disable unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { setup, verifySetup, verify, status, disable };
