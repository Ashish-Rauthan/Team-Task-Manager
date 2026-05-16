const { supabaseAdmin } = require('../db/supabase');

/**
 * requireRole(...roles)
 * ─────────────────────
 * Checks req.profile.role (global role) against the allowed list.
 * Must be used AFTER requireAuth.
 *
 * Usage:
 *   router.delete('/:id', requireAuth, requireRole('admin'), deleteProject)
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
 * Reads project_id from req.params.projectId (or req.params.id for project-level routes).
 * Admins always pass — they can manage any project regardless of membership.
 *
 * Usage:
 *   router.post('/:projectId/members', requireAuth, requireProjectRole('manager'), addMember)
 */
const requireProjectRole = (...roles) => async (req, res, next) => {
  try {
    if (!req.profile) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Admins bypass all project-level role checks
    if (req.profile.role === 'admin') return next();

    const projectId = req.params.projectId || req.params.id;

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
 * Admins are always allowed through.
 * Shorthand for requireProjectRole('manager', 'member').
 */
const requireProjectMembership = requireProjectRole('manager', 'member');

module.exports = { requireRole, requireProjectRole, requireProjectMembership };