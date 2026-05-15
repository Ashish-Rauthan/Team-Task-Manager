import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tasksAPI, projectsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format, isPast, parseISO } from 'date-fns';

const COLUMNS = [
  { key: 'todo',        label: 'To Do',      color: 'var(--text-muted)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--info)' },
  { key: 'in_review',   label: 'In Review',   color: 'var(--warning)' },
  { key: 'done',        label: 'Done',        color: 'var(--success)' },
];

const PRIORITY_COLOR = { low: 'var(--priority-low)', medium: 'var(--priority-medium)', high: 'var(--priority-high)', urgent: 'var(--priority-urgent)' };

function TaskCard({ task, onStatusChange, projectId }) {
  const [changing, setChanging] = useState(false);
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';

  const nextStatus = { todo: 'in_progress', in_progress: 'in_review', in_review: 'done', done: 'todo' };
  const nextLabel  = { todo: 'Start →', in_progress: 'Review →', in_review: 'Done →', done: 'Reopen' };

  const advance = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setChanging(true);
    try {
      await tasksAPI.updateStatus(projectId, task.id, nextStatus[task.status]);
      onStatusChange(task.id, nextStatus[task.status]);
    } catch { toast.error('Failed to update status'); }
    finally { setChanging(false); }
  };

  return (
    <Link to={`/projects/${projectId}/tasks/${task.id}`}>
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${PRIORITY_COLOR[task.priority] || 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: 14,
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      >
        <div style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.4 }}>{task.title}</div>

        {task.description && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {task.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
              background: PRIORITY_COLOR[task.priority] + '20',
              color: PRIORITY_COLOR[task.priority],
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>{task.priority}</span>
            {task.due_date && (
              <span style={{ fontSize: '0.7rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                {isOverdue ? '⚠ ' : ''}{format(parseISO(task.due_date), 'MMM d')}
              </span>
            )}
          </div>

          {task.assignee_name && (
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-dim)',
              color: 'var(--accent-light)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700,
              flexShrink: 0,
            }}>
              {task.assignee_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
          )}
        </div>

        <button onClick={advance} disabled={changing} style={{
          width: '100%', padding: '5px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-active)', color: 'var(--text-secondary)',
          fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.15s',
          border: '1px solid var(--border)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent-light)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          {changing ? '...' : nextLabel[task.status]}
        </button>
      </div>
    </Link>
  );
}

function CreateTaskModal({ projectId, members, onClose, onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '', description: '', assignee_id: '', status: 'todo', priority: 'medium', due_date: ''
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, assignee_id: form.assignee_id || undefined, due_date: form.due_date || undefined };
      const res = await tasksAPI.create(projectId, payload);
      toast.success('Task created!');
      onCreated(res.data.task);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create task');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">New Task</h2>
          <button className="btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="Task title..."
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="Add details..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="form-input form-select" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.user?.id} value={m.user?.id}>{m.user?.full_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage({ myTasks }) {
  const { projectId } = useParams();
  const { isManager } = useAuth();
  const [tasks,   setTasks]   = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (myTasks) {
          const res = await tasksAPI.myTasks();
          setTasks(res.data.tasks || []);
        } else {
          const [tRes, mRes] = await Promise.all([
            tasksAPI.list(projectId),
            projectsAPI.getMembers(projectId),
          ]);
          setTasks(tRes.data.tasks || []);
          setMembers(mRes.data.members || []);
        }
      } catch { toast.error('Failed to load tasks'); }
      finally { setLoading(false); }
    };
    load();
  }, [projectId, myTasks]);

  const handleStatusChange = (taskId, newStatus) => {
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const filtered = tasks.filter(t =>
    (!filterStatus   || t.status   === filterStatus) &&
    (!filterPriority || t.priority === filterPriority)
  );

  const byStatus = (status) => filtered.filter(t => t.status === status);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          {!myTasks && projectId && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              <Link to={`/projects/${projectId}`} style={{ color: 'var(--text-muted)' }}>← Project</Link>
            </div>
          )}
          <h1 className="page-title">{myTasks ? 'My Tasks' : 'Task Board'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="form-input form-select" style={{ width: 140 }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>
          <select className="form-input form-select" style={{ width: 140 }}
            value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          {!myTasks && isManager && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + New Task
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
        {COLUMNS.map(col => {
          const colTasks = byStatus(col.key);
          return (
            <div key={col.key}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 12, padding: '8px 4px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontWeight: 700, fontSize: '0.8125rem', textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: col.color }}>
                  {col.label}
                </span>
                <span style={{
                  marginLeft: 'auto', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: 99,
                  fontSize: '0.7rem', fontWeight: 700, padding: '1px 7px',
                  color: 'var(--text-muted)',
                }}>{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 80 }}>
                {colTasks.length === 0 ? (
                  <div style={{
                    border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
                    padding: '20px', textAlign: 'center', color: 'var(--text-muted)',
                    fontSize: '0.8125rem',
                  }}>
                    No tasks
                  </div>
                ) : colTasks.map(t => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    projectId={t.project_id || projectId}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <CreateTaskModal
          projectId={projectId}
          members={members}
          onClose={() => setShowModal(false)}
          onCreated={t => setTasks(prev => [t, ...prev])}
        />
      )}
    </div>
  );
}