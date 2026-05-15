const { supabaseAdmin } = require('../db/supabase');

// ─── helpers ─────────────────────────────────────────────────────────────────

const logActivity = async ({ projectId, taskId, actorId, action, meta }) => {
  await supabaseAdmin.from('activity_log').insert({
    project_id: projectId,
    task_id:    taskId,
    actor_id:   actorId,
    action,
    meta
  });
};

// ─── Projects ─────────────────────────────────────────────────────────────────

/**
 * GET /api/projects
 * Admin → all projects. Others → only projects they're members of.
 */
const getProjects = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('projects')
      .select(`
        *,
        owner:profiles!projects_owner_id_fkey(id, full_name, avatar_url),
        project_members(count)
      `)
      .order('created_at', { ascending: false });

    // Non-admins: filter to their projects
    if (req.profile.role !== 'admin') {
      const { data: memberRows } = await supabaseAdmin
        .from('project_members')
        .select('project_id')
        .eq('user_id', req.profile.id);

      const ids = (memberRows || []).map(r => r.project_id);

      // Also include projects they own
      query = query.or(
        `owner_id.eq.${req.profile.id},id.in.(${ids.length ? ids.join(',') : 'null'})`
      );
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.json({ projects: data });
  } catch (err) {
    console.error('[getProjects]', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

/**
 * GET /api/projects/:id
 */
const getProject = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        owner:profiles!projects_owner_id_fkey(id, full_name, avatar_url, email),
        project_members(
          id, role, joined_at,
          user:profiles(id, full_name, avatar_url, email)
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Project not found' });

    res.json({ project: data });
  } catch (err) {
    console.error('[getProject]', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

/**
 * POST /api/projects
 */
const createProject = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({ name, description, color, owner_id: req.profile.id })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Auto-add creator as manager
    await supabaseAdmin.from('project_members').insert({
      project_id: project.id,
      user_id:    req.profile.id,
      role:       'manager'
    });

    await logActivity({
      projectId: project.id,
      actorId:   req.profile.id,
      action:    'project.created',
      meta:      { name }
    });

    res.status(201).json({ project });
  } catch (err) {
    console.error('[createProject]', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

/**
 * PATCH /api/projects/:id
 */
const updateProject = async (req, res) => {
  try {
    const { name, description, color, is_archived } = req.body;
    const updates = {};
    if (name        !== undefined) updates.name        = name;
    if (description !== undefined) updates.description = description;
    if (color       !== undefined) updates.color       = color;
    if (is_archived !== undefined) updates.is_archived = is_archived;

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await logActivity({
      projectId: req.params.id,
      actorId:   req.profile.id,
      action:    'project.updated',
      meta:      updates
    });

    res.json({ project: data });
  } catch (err) {
    console.error('[updateProject]', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

/**
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('[deleteProject]', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// ─── Project Members ──────────────────────────────────────────────────────────

/**
 * GET /api/projects/:projectId/members
 */
const getMembers = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('project_members')
      .select(`
        id, role, joined_at,
        user:profiles(id, full_name, avatar_url, email, role)
      `)
      .eq('project_id', req.params.projectId)
      .order('joined_at');

    if (error) return res.status(400).json({ error: error.message });

    res.json({ members: data });
  } catch (err) {
    console.error('[getMembers]', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

/**
 * POST /api/projects/:projectId/members
 * Body: { user_id, role }
 */
const addMember = async (req, res) => {
  try {
    const { user_id, role = 'member' } = req.body;
    const { projectId } = req.params;

    // Check user exists
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('id', user_id)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data, error } = await supabaseAdmin
      .from('project_members')
      .insert({ project_id: projectId, user_id, role })
      .select(`id, role, joined_at, user:profiles(id, full_name, avatar_url, email)`)
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'User is already a member' });
      }
      return res.status(400).json({ error: error.message });
    }

    await logActivity({
      projectId,
      actorId: req.profile.id,
      action:  'member.added',
      meta:    { user_id, role, user_name: user.full_name }
    });

    res.status(201).json({ member: data });
  } catch (err) {
    console.error('[addMember]', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

/**
 * PATCH /api/projects/:projectId/members/:memberId
 * Body: { role }
 */
const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['manager', 'member'].includes(role)) {
      return res.status(422).json({ error: 'Role must be manager or member' });
    }

    const { data, error } = await supabaseAdmin
      .from('project_members')
      .update({ role })
      .eq('id', req.params.memberId)
      .eq('project_id', req.params.projectId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ member: data });
  } catch (err) {
    console.error('[updateMemberRole]', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

/**
 * DELETE /api/projects/:projectId/members/:memberId
 */
const removeMember = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('id', req.params.memberId)
      .eq('project_id', req.params.projectId);

    if (error) return res.status(400).json({ error: error.message });

    await logActivity({
      projectId: req.params.projectId,
      actorId:   req.profile.id,
      action:    'member.removed',
      meta:      { member_id: req.params.memberId }
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('[removeMember]', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

/**
 * GET /api/projects/:projectId/activity
 */
const getActivity = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('activity_log')
      .select(`*, actor:profiles(id, full_name, avatar_url)`)
      .eq('project_id', req.params.projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ activity: data });
  } catch (err) {
    console.error('[getActivity]', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

module.exports = {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getMembers, addMember, updateMemberRole, removeMember, getActivity
};
