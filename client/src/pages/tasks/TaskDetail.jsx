import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tasksAPI, projectsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { format, isPast, parseISO } from 'date-fns';

const STATUS_OPTS = [
  { value: 'todo',        label: 'To Do',       color: 'var(--text-muted)' },
  { value: 'in_progress', label: 'In Progress',  color: 'var(--info)'    },
  { value: 'in_review',   label: 'In Review',    color: 'var(--warning)' },
  { value: 'done',        label: 'Done',         color: 'var(--success)' },
];
const PRIORITY_OPTS = ['low','medium','high','urgent'];
const PRIORITY_COLOR = { low: 'var(--priority-low)', medium: 'var(--priority-medium)', high: 'var(--priority-high)', urgent: 'var(--priority-urgent)' };

export default function TaskDetail() {
  const { projectId, taskId } = useParams();
  const { user, isAdmin }     = useAuth();
  const navigate = useNavigate();

  const [task,    setTask]    = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    Promise.all([
      tasksAPI.get(projectId, taskId),
      projectsAPI.getMembers(projectId),
    ]).then(([tRes, mRes]) => {
      setTask(tRes.data.task);
      setEditForm({
        title:       tRes.data.task.title,
        description: tRes.data.task.description || '',
        priority:    tRes.data.task.priority,
        due_date:    tRes.data.task.due_date || '',
        assignee_id: tRes.data.task.assignee_id || '',
      });
      setMembers(mRes.data.members || []);
    }).catch(() => toast.error('Failed to load task'))
      .finally(() => setLoading(false));
  }, [projectId, taskId]);

  const changeStatus = async (status) => {
    try {
      await tasksAPI.updateStatus(projectId, taskId, status);
      setTask(t => ({ ...t, status }));
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await tasksAPI.update(projectId, taskId, {
        ...editForm,
        assignee_id: editForm.assignee_id || null,
        due_date:    editForm.due_date    || null,
      });
      setTask(t => ({ ...t, ...res.data.task }));
      setEditing(false);
      toast.success('Task updated');
    } catch { toast.error('Failed to update task'); }
    finally { setSaving(false); }
  };

  const deleteTask = async () => {
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      await tasksAPI.delete(projectId, taskId);
      toast.success('Task deleted');
      navigate(`/projects/${projectId}/tasks`);
    } catch { toast.error('Failed to delete task'); }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const res = await tasksAPI.addComment(projectId, taskId, comment);
      setTask(t => ({ ...t, comments: [...(t.comments || []), res.data.comment] }));
      setComment('');
    } catch { toast.error('Failed to post comment'); }
    finally { setPosting(false); }
  };

  const deleteComment = async (cid) => {
    try {
      await tasksAPI.deleteComment(projectId, taskId, cid);
      setTask(t => ({ ...t, comments: t.comments.filter(c => c.id !== cid) }));
    } catch { toast.error('Failed to delete comment'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner spinner-lg" /></div>;
  if (!task)   return <div className="empty-state"><p>Task not found</p></div>;

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  const statusOpt = STATUS_OPTS.find(s => s.value === task.status);
  const canEdit   = isAdmin || task.creator_id === user?.id ||
    members.some(m => m.user?.id === user?.id && m.role === 'manager');

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', gap: 6 }}>
        <Link to={`/projects/${projectId}`} style={{ color: 'var(--text-muted)' }}>Project</Link>
        <span>›</span>
        <Link to={`/projects/${projectId}/tasks`} style={{ color: 'var(--text-muted)' }}>Tasks</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-secondary)' }}>{task.title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            {!editing ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.3 }}>
                    {task.title}
                  </h1>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
                      <button className="btn btn-danger btn-sm"    onClick={deleteTask}>Delete</button>
                    </div>
                  )}
                </div>
                <p style={{ color: task.description ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontSize: '0.875rem', lineHeight: 1.7 }}>
                  {task.description || 'No description provided.'}
                </p>
              </>
            ) : (
              <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-input form-select" value={editForm.priority}
                      onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                      {PRIORITY_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assignee</label>
                    <select className="form-input form-select" value={editForm.assignee_id}
                      onChange={e => setEditForm(f => ({ ...f, assignee_id: e.target.value }))}>
                      <option value="">Unassigned</option>
                      {members.map(m => <option key={m.user?.id} value={m.user?.id}>{m.user?.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-input" value={editForm.due_date}
                      onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <span className="spinner" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Status changer */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>
              Status
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUS_OPTS.map(s => (
                <button key={s.value} onClick={() => changeStatus(s.value)} style={{
                  padding: '7px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 600,
                  border: `1px solid ${task.status === s.value ? s.color : 'var(--border)'}`,
                  background: task.status === s.value ? s.color + '20' : 'var(--bg-elevated)',
                  color: task.status === s.value ? s.color : 'var(--text-secondary)',
                  transition: 'all 0.15s', cursor: 'pointer',
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>
              Comments ({task.comments?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              {(task.comments || []).length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No comments yet</p>
              )}
              {(task.comments || []).map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  <Avatar name={c.author?.full_name} size="avatar-sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{c.author?.full_name}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {format(new Date(c.created_at), 'MMM d, HH:mm')}
                        </span>
                        {c.author_id === user?.id && (
                          <button onClick={() => deleteComment(c.id)} style={{ fontSize: '0.7rem', color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none' }}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={postComment} style={{ display: 'flex', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%' }}>
                <Avatar name={user?.full_name} size="avatar-sm" />
                <textarea className="form-input flex-1" placeholder="Add a comment..."
                  value={comment} onChange={e => setComment(e.target.value)}
                  style={{ minHeight: 60, resize: 'none' }} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={posting || !comment.trim()}
                style={{ alignSelf: 'flex-end' }}>
                {posting ? '...' : 'Post'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['Status',   <span style={{ color: statusOpt?.color, fontWeight: 600 }}>{statusOpt?.label}</span>],
            ['Priority', <span style={{ color: PRIORITY_COLOR[task.priority], fontWeight: 600, textTransform: 'capitalize' }}>{task.priority}</span>],
            ['Assignee', task.assignee_name
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar name={task.assignee_name} size="avatar-sm" /><span style={{ fontSize: '0.875rem' }}>{task.assignee_name}</span></div>
              : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
            ],
            ['Due Date', task.due_date
              ? <span style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                  {isOverdue ? '⚠ ' : ''}{format(parseISO(task.due_date), 'MMMM d, yyyy')}
                </span>
              : <span style={{ color: 'var(--text-muted)' }}>Not set</span>
            ],
            ['Created',  format(new Date(task.created_at), 'MMM d, yyyy')],
            ['Updated',  format(new Date(task.updated_at), 'MMM d, yyyy')],
          ].map(([label, value]) => (
            <div key={label} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ fontSize: '0.875rem' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}