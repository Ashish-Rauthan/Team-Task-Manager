import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tasksAPI, projectsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { format, isPast, parseISO } from 'date-fns';

const STATUS_OPTS = [
  { value: 'todo',        label: 'To Do',      color: '#94a3b8' },
  { value: 'in_progress', label: 'In Progress', color: 'var(--info)'    },
  { value: 'in_review',   label: 'In Review',   color: 'var(--warning)' },
  { value: 'done',        label: 'Done',        color: 'var(--success)' },
];
const PRIORITY_OPTS  = ['low', 'medium', 'high', 'urgent'];
const PRIORITY_COLOR = {
  low:    'var(--priority-low)',
  medium: 'var(--priority-medium)',
  high:   'var(--priority-high)',
  urgent: 'var(--priority-urgent)',
};

function MetaChip({ label, children }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{
        fontSize: '0.65rem', color: 'var(--text-muted)',
        fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 8,
        fontFamily: 'var(--font-mono)',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>{children}</div>
    </div>
  );
}

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
      const t = tRes.data.task;
      setTask(t);
      setEditForm({
        title:       t.title,
        description: t.description || '',
        priority:    t.priority,
        due_date:    t.due_date || '',
        assignee_id: t.assignee_id || '',
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  );
  if (!task) return <div className="empty-state"><p>Task not found</p></div>;

  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  const statusOpt = STATUS_OPTS.find(s => s.value === task.status);
  const canEdit   = isAdmin || task.creator_id === user?.id ||
    members.some(m => m.user?.id === user?.id && m.role === 'manager');

  return (
    <div style={{ maxWidth: 840 }}>
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom: 20 }}>
        <Link to={`/projects/${projectId}`}>Project</Link>
        <span className="sep">›</span>
        <Link to={`/projects/${projectId}/tasks`}>Tasks</Link>
        <span className="sep">›</span>
        <span className="current" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20, alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Main card */}
          <div className="card">
            {!editing ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: PRIORITY_COLOR[task.priority],
                        display: 'inline-block', flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: PRIORITY_COLOR[task.priority],
                        fontFamily: 'var(--font-mono)',
                      }}>{task.priority} priority</span>
                    </div>
                    <h1 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.375rem', fontWeight: 800,
                      lineHeight: 1.3, letterSpacing: '-0.02em',
                    }}>
                      {task.title}
                    </h1>
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                        <span className="material-symbols-outlined icon-sm">edit</span>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={deleteTask}>
                        <span className="material-symbols-outlined icon-sm">delete</span>
                      </button>
                    </div>
                  )}
                </div>
                <p style={{
                  color: task.description ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontSize: '0.9375rem', lineHeight: 1.7,
                  borderTop: '1px solid var(--border)', paddingTop: 14,
                }}>
                  {task.description || 'No description provided.'}
                </p>
              </>
            ) : (
              <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem' }}>Edit Task</span>
                </div>
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
            <h3 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 14, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Update Status
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUS_OPTS.map(s => (
                <button key={s.value} onClick={() => changeStatus(s.value)} style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem', fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  border: `1px solid ${task.status === s.value ? s.color : 'var(--border-medium)'}`,
                  background: task.status === s.value ? `${s.color}18` : 'var(--bg-container-low)',
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
            <h3 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 18, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Comments ({task.comments?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 20 }}>
              {(task.comments || []).length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No comments yet. Be the first to comment.</p>
              )}
              {(task.comments || []).map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                  <Avatar name={c.author?.full_name} size="avatar-sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{c.author?.full_name}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {format(new Date(c.created_at), 'MMM d, HH:mm')}
                        </span>
                        {c.author_id === user?.id && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 2 }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          >
                            <span className="material-symbols-outlined icon-sm">close</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{
                      background: 'var(--bg-container-low)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                    }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input */}
            <div style={{
              background: 'var(--bg-container-low)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Avatar name={user?.full_name} size="avatar-sm" />
                <textarea
                  className="form-input"
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, minHeight: 48, resize: 'none', fontSize: '0.875rem' }}
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      postComment(e);
                    }
                  }}
                />
              </div>
              {comment.trim() && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button
                    onClick={postComment}
                    className="btn btn-primary btn-sm"
                    disabled={posting || !comment.trim()}
                  >
                    {posting ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : (
                      <>
                        <span className="material-symbols-outlined icon-sm">send</span>
                        Post
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MetaChip label="Status">
            <span style={{ color: statusOpt?.color, fontWeight: 700 }}>{statusOpt?.label}</span>
          </MetaChip>

          <MetaChip label="Priority">
            <span style={{ color: PRIORITY_COLOR[task.priority], fontWeight: 700, textTransform: 'capitalize' }}>
              {task.priority}
            </span>
          </MetaChip>

          <MetaChip label="Assignee">
            {task.assignee_name ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={task.assignee_name} size="avatar-sm" />
                <span>{task.assignee_name}</span>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
            )}
          </MetaChip>

          <MetaChip label="Due Date">
            {task.due_date ? (
              <span style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>
                {isOverdue && <span className="material-symbols-outlined icon-sm" style={{ verticalAlign: 'middle', marginRight: 4 }}>alarm</span>}
                {format(parseISO(task.due_date), 'MMM d, yyyy')}
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Not set</span>
            )}
          </MetaChip>

          <MetaChip label="Created">
            <span style={{ color: 'var(--text-secondary)' }}>{format(new Date(task.created_at), 'MMM d, yyyy')}</span>
          </MetaChip>

          <MetaChip label="Updated">
            <span style={{ color: 'var(--text-secondary)' }}>{format(new Date(task.updated_at), 'MMM d, yyyy')}</span>
          </MetaChip>
        </div>
      </div>
    </div>
  );
}