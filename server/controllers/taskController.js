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

// ─── Tasks ────────────────────────────────────────────────────────────────────

/**
 * GET /api/projects/:projectId/tasks
 * Supports ?status=, ?assignee_id=, ?priority=, ?overdue=true
 */
const getTasks = async (req, res) => {
  try {
    const { status, assignee_id, priority, overdue } = req.query;

    let query = supabaseAdmin
      .from('tasks_detail')   // view: tasks + assignee name + project name
      .select('*')
      .eq('project_id', req.params.projectId)
      .order('position')
      .order('created_at');

    if (status)      query = query.eq('status', status);
    if (assignee_id) query = query.eq('assignee_id', assignee_id);
    if (priority)    query = query.eq('priority', priority);
    if (overdue === 'true') {
      query = query.lt('due_date', new Date().toISOString().split('T')[0])
                   .neq('status', 'done');
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.json({ tasks: data });
  } catch (err) {
    console.error('[getTasks]', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

/**
 * GET /api/tasks/my
 * All tasks assigned to current user, across all projects
 */
const getMyTasks = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('tasks_detail')
      .select('*')
      .eq('assignee_id', req.profile.id)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ tasks: data });
  } catch (err) {
    console.error('[getMyTasks]', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

/**
 * GET /api/projects/:projectId/tasks/:id
 */
const getTask = async (req, res) => {
  try {
    const { data: task, error } = await supabaseAdmin
      .from('tasks_detail')
      .select('*')
      .eq('id', req.params.id)
      .eq('project_id', req.params.projectId)
      .single();

    if (error || !task) return res.status(404).json({ error: 'Task not found' });

    // Fetch comments
    const { data: comments } = await supabaseAdmin
      .from('task_comments')
      .select(`*, author:profiles(id, full_name, avatar_url)`)
      .eq('task_id', task.id)
      .order('created_at');

    res.json({ task: { ...task, comments: comments || [] } });
  } catch (err) {
    console.error('[getTask]', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

/**
 * POST /api/projects/:projectId/tasks
 */
const createTask = async (req, res) => {
  try {
    const { title, description, assignee_id, status, priority, due_date } = req.body;
    const { projectId } = req.params;

    // Get next position
    const { count } = await supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        title,
        description,
        project_id:  projectId,
        creator_id:  req.profile.id,
        assignee_id: assignee_id || null,
        status:      status   || 'todo',
        priority:    priority || 'medium',
        due_date:    due_date || null,
        position:    count || 0
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await logActivity({
      projectId,
      taskId:  task.id,
      actorId: req.profile.id,
      action:  'task.created',
      meta:    { title, assignee_id, priority }
    });

    res.status(201).json({ task });
  } catch (err) {
    console.error('[createTask]', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

/**
 * PATCH /api/projects/:projectId/tasks/:id
 * General update — title, description, priority, due_date, assignee_id
 */
const updateTask = async (req, res) => {
  try {
    const { title, description, assignee_id, priority, due_date, position } = req.body;
    const updates = {};
    if (title       !== undefined) updates.title       = title;
    if (description !== undefined) updates.description = description;
    if (priority    !== undefined) updates.priority    = priority;
    if (due_date    !== undefined) updates.due_date    = due_date;
    if (position    !== undefined) updates.position    = position;
    if (assignee_id !== undefined) updates.assignee_id = assignee_id;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', req.params.id)
      .eq('project_id', req.params.projectId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await logActivity({
      projectId: req.params.projectId,
      taskId:    req.params.id,
      actorId:   req.profile.id,
      action:    'task.updated',
      meta:      updates
    });

    res.json({ task: data });
  } catch (err) {
    console.error('[updateTask]', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

/**
 * PATCH /api/projects/:projectId/tasks/:id/status
 * Dedicated status-change endpoint (assignee can call this)
 * Body: { status }
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['todo', 'in_progress', 'in_review', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(422).json({ error: 'Invalid status' });
    }

    // Fetch current task for before/after logging
    const { data: current } = await supabaseAdmin
      .from('tasks')
      .select('status, assignee_id, creator_id')
      .eq('id', req.params.id)
      .single();

    // Members can only update tasks assigned to them
    const isAdmin   = req.profile.role === 'admin';
    const isManager = req.projectMember?.role === 'manager';
    const isOwner   = current?.assignee_id === req.profile.id ||
                      current?.creator_id  === req.profile.id;

    if (!isAdmin && !isManager && !isOwner) {
      return res.status(403).json({ error: 'You can only update your own tasks' });
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({ status })
      .eq('id', req.params.id)
      .eq('project_id', req.params.projectId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await logActivity({
      projectId: req.params.projectId,
      taskId:    req.params.id,
      actorId:   req.profile.id,
      action:    'task.status_changed',
      meta:      { from: current.status, to: status }
    });

    res.json({ task: data });
  } catch (err) {
    console.error('[updateTaskStatus]', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

/**
 * DELETE /api/projects/:projectId/tasks/:id
 */
const deleteTask = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', req.params.id)
      .eq('project_id', req.params.projectId);

    if (error) return res.status(400).json({ error: error.message });

    await logActivity({
      projectId: req.params.projectId,
      actorId:   req.profile.id,
      action:    'task.deleted',
      meta:      { task_id: req.params.id }
    });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('[deleteTask]', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// ─── Comments ─────────────────────────────────────────────────────────────────

/**
 * POST /api/projects/:projectId/tasks/:id/comments
 */
const addComment = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(422).json({ error: 'Comment body is required' });

    const { data, error } = await supabaseAdmin
      .from('task_comments')
      .insert({ task_id: req.params.id, author_id: req.profile.id, body })
      .select(`*, author:profiles(id, full_name, avatar_url)`)
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({ comment: data });
  } catch (err) {
    console.error('[addComment]', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

/**
 * DELETE /api/projects/:projectId/tasks/:taskId/comments/:commentId
 */
const deleteComment = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('task_comments')
      .delete()
      .eq('id', req.params.commentId)
      .eq('author_id', req.profile.id);   // can only delete own

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('[deleteComment]', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

/**
 * GET /api/dashboard
 * Returns stats for the current user's dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.profile.id;
    const isAdmin = req.profile.role === 'admin';

    // Projects this user is involved in
    let projectIds = [];
    if (isAdmin) {
      const { data } = await supabaseAdmin.from('projects').select('id');
      projectIds = (data || []).map(p => p.id);
    } else {
      const { data } = await supabaseAdmin
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);
      projectIds = (data || []).map(p => p.project_id);
    }

    const today = new Date().toISOString().split('T')[0];

    // Task stats across all user's projects
    const { data: allTasks } = await supabaseAdmin
      .from('tasks')
      .select('id, status, due_date, assignee_id, project_id')
      .in('project_id', projectIds.length ? projectIds : ['none']);

    const tasks = allTasks || [];

    const stats = {
      total:       tasks.length,
      todo:        tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      in_review:   tasks.filter(t => t.status === 'in_review').length,
      done:        tasks.filter(t => t.status === 'done').length,
      overdue:     tasks.filter(t => t.due_date < today && t.status !== 'done').length,
      my_tasks:    tasks.filter(t => t.assignee_id === userId).length,
    };

    // Recent tasks (assigned to me)
    const { data: myTasks } = await supabaseAdmin
      .from('tasks_detail')
      .select('*')
      .eq('assignee_id', userId)
      .neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5);

    // Overdue tasks
    const { data: overdueTasks } = await supabaseAdmin
      .from('tasks_detail')
      .select('*')
      .in('project_id', projectIds.length ? projectIds : ['none'])
      .lt('due_date', today)
      .neq('status', 'done')
      .order('due_date')
      .limit(5);

    // Project stats
    const { data: projectStats } = await supabaseAdmin
      .from('project_task_stats')
      .select('*')
      .in('project_id', projectIds.length ? projectIds : ['none']);

    res.json({
      stats,
      my_tasks:      myTasks      || [],
      overdue_tasks: overdueTasks || [],
      project_stats: projectStats || []
    });
  } catch (err) {
    console.error('[getDashboard]', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};

module.exports = {
  getTasks, getMyTasks, getTask, createTask, updateTask,
  updateTaskStatus, deleteTask, addComment, deleteComment, getDashboard
};
