/**
 * Public merchant/user profile for profile page display.
 * No auth required. Returns public fields only (no email).
 */

import { supabase } from '../config/supabaseClient.js';
import logger from '../utils/logger.js';

async function getPublicProfile(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Profile id required' });

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, name, role, city, bio, profile_image, logo_url, company_name, is_approved')
      .eq('id', id)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let merchantProfile = null;
    if (user.role === 'MERCHANT') {
      const { data: mp } = await supabase
        .from('merchant_profiles')
        .select('business_name, business_description, logo_url, city, phone')
        .eq('user_id', id)
        .single();
      merchantProfile = mp;
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        city: user.city,
        bio: user.bio,
        profile_image: user.profile_image,
        logoUrl: user.logo_url,
        companyName: user.company_name,
        isApproved: user.is_approved,
      },
      merchantProfile: merchantProfile ? {
        business_name: merchantProfile.business_name,
        business_description: merchantProfile.business_description,
        logo_url: merchantProfile.logo_url,
        city: merchantProfile.city,
        phone: merchantProfile.phone,
      } : null,
    });
  } catch (err) {
    logger.error('getPublicProfile unexpected', { message: err.message });
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

export { getPublicProfile };
