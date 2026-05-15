const { supabase, supabaseAdmin } = require('../db/supabase');

/**
 * requireAuth
 * -----------
 * Verifies the Bearer JWT from the Authorization header.
 * Attaches req.user  (Supabase auth user)
 *          req.profile (profiles row — includes global role)
 *          req.token   (raw JWT — used to build user-scoped Supabase client)
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch profile (includes global role)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Profile not found' });
    }

    req.user    = user;
    req.profile = profile;
    req.token   = token;

    next();
  } catch (err) {
    console.error('[requireAuth]', err);
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = { requireAuth };
