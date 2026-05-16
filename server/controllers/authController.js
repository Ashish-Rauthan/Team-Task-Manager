const { supabase, supabaseAdmin } = require('../db/supabase');

/**
 * POST /api/auth/signup
 */
const signup = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    const role = 'member'; // always member — admin assigns roles via UsersPage

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id:         data.user.id,
        email:      data.user.email,
        full_name,
        role
      },
      session: data.session
    });
  } catch (err) {
    console.error('[signup]', err);
    res.status(500).json({ error: 'Signup failed' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return res.json({
      message:       'Login successful',
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      user:          profile
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    await supabase.auth.signOut();
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('[logout]', err);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * GET /api/auth/me
 */
const me = async (req, res) => {
  try {
    res.json({ user: req.profile });
  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/**
 * PATCH /api/auth/me
 */
const updateMe = async (req, res) => {
  try {
    const { full_name, avatar_url } = req.body;

    const updates = {};
    if (full_name)  updates.full_name  = full_name;
    if (avatar_url) updates.avatar_url = avatar_url;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.profile.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ user: data });
  } catch (err) {
    console.error('[updateMe]', err);
    res.status(500).json({ error: 'Profile update failed' });
  }
};

/**
 * GET /api/auth/users   [admin only]
 */
const listUsers = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ users: data });
  } catch (err) {
    console.error('[listUsers]', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * PATCH /api/auth/users/:id/role   [admin only]
 * Only allows promoting/demoting between member and manager.
 * Admin role can only be set directly in the database.
 */
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id }   = req.params;

    if (!['manager', 'member'].includes(role)) {
      return res.status(422).json({ error: 'Invalid role. Only member or manager can be assigned.' });
    }

    // Prevent admin from demoting themselves
    if (id === req.profile.id) {
      return res.status(403).json({ error: 'You cannot change your own role.' });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ user: data });
  } catch (err) {
    console.error('[updateUserRole]', err);
    res.status(500).json({ error: 'Role update failed' });
  }
};

module.exports = { signup, login, logout, me, updateMe, listUsers, updateUserRole };