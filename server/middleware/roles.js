const { supabaseAdmin } = require('../db/supabase');

/**
 * requireRole(...roles)
 * ─────────────────────
 * Checks req.profile.role (global role) against the allowed list.
 * Must be used AFTER requireAuth.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.profile) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!roles.includes(req.profile.role)) {
    return res.status(403).json({
      error: `Access denied. Required role: ${roles.join(' or ')}`
    });
  }
  next();
};

/**
 * requireProjectRole(...roles)
 * ────────────────────────────
 * Checks the user's role within a specific project (project_members.role).
 * Reads project_id from req.params.projectId OR req.params.id.
 * Global admins always pass, and get a synthetic projectMember attached.
 *
 * Always attaches req.projectMember so downstream controllers can read it.
 */
const requireProjectRole = (...roles) => async (req, res, next) => {
  try {
    if (!req.profile) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const projectId = req.params.projectId || req.params.id;

    // Global admins bypass project-level checks but still get projectMember attached
    if (req.profile.role === 'admin') {
      // Attach their actual member row if it exists, otherwise a synthetic one
      const { data: member } = await supabaseAdmin
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', req.profile.id)
        .single();

      req.projectMember = member || { role: 'manager' }; // admins treated as manager
      return next();
    }

    const { data: member, error } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', req.profile.id)
      .single();

    if (error || !member) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    if (!roles.includes(member.role)) {
      return res.status(403).json({
        error: `Project role required: ${roles.join(' or ')}`
      });
    }

    req.projectMember = member;
    next();
  } catch (err) {
    console.error('[requireProjectRole]', err);
    res.status(500).json({ error: 'Role check failed' });
  }
};

/**
 * requireProjectMembership
 * ────────────────────────
 * Ensures the user is a member of the project (any role).
 * Also attaches req.projectMember for downstream use.
 */
const requireProjectMembership = async (req, res, next) => {
  try {
    if (!req.profile) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const projectId = req.params.projectId || req.params.id;

    // Global admins always have access
    if (req.profile.role === 'admin') {
      const { data: member } = await supabaseAdmin
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', req.profile.id)
        .single();

      req.projectMember = member || { role: 'manager' };
      return next();
    }

    const { data: member, error } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', req.profile.id)
      .single();

    if (error || !member) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    req.projectMember = member;
    next();
  } catch (err) {
    console.error('[requireProjectMembership]', err);
    res.status(500).json({ error: 'Role check failed' });
  }
};

module.exports = { requireRole, requireProjectRole, requireProjectMembership };