import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tasksAPI, projectsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format, isPast, parseISO } from 'date-fns';

const COLUMNS = [
  { key: 'todo',        label: 'To Do',       color: '#94a3b8' },
  { key: 'in_progress', label: 'In Progress',  color: '#3b82f6' },
  { key: 'in_review',   label: 'In Review',    color: '#F59E0B' },
  { key: 'done',        label: 'Done',         color: '#10B981' },
];

const PRIORITY_COLOR = {
  low:    'var(--priority-low)',
  medium: 'var(--priority-medium)',
  high:   'var(--priority-high)',
  urgent: 'var(--priority-urgent)',
};

function TaskCard({ task, onStatusChange, projectId }) {
  const [changing, setChanging] = useState(false);
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';

  const nextStatus = { todo: 'in_progress', in_progress: 'in_review', in_review: 'done', done: 'todo' };
  const nextLabel  = { todo: 'Start', in_progress: 'Review', in_review: 'Mark Done', done: 'Reopen' };
  const nextIcon   = { todo: 'play_arrow', in_progress: 'rate_review', in_review: 'check', done: 'refresh' };

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
    <Link to={`/projects/${projectId}/tasks/${task.id}`} style={{ display: 'block' }}>
      <div
        className="task-card"
        style={{ borderLeft: `3px solid ${PRIORITY_COLOR[task.priority] || 'var(--border-medium)'}` }}
      >
        <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4, fontFamily: 'var(--font-body)' }}>
          {task.title}
        </div>

        {task.description && (
          <p style={{
            fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {task.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              fontSize: '0.6rem', fontWeight: 700,
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: `${PRIORITY_COLOR[task.priority]}20`,
              color: PRIORITY_COLOR[task.priority],
              textTransform: 'uppercase', letterSpacing: '0.06em',
              fontFamily: 'var(--font-mono)',
            }}>{task.priority}</span>
            {task.due_date && (
              <span style={{
                fontSize: '0.65rem',
                color: isOverdue ? 'var(--danger)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                {isOverdue && <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>alarm</span>}
                {format(parseISO(task.due_date), 'MMM d')}
              </span>
            )}
          </div>

          {task.assignee_name && (
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.5625rem', fontWeight: 800,
              flexShrink: 0,
              border: '2px solid var(--bg-surface)',
            }}>
              {task.assignee_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Advance button */}
        <button
          onClick={advance}
          disabled={changing}
          style={{
            width: '100%', padding: '6px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-container-low)',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem', fontWeight: 600,
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'all 0.15s', fontFamily: 'var(--font-mono)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--accent-dim)';
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.borderColor = 'rgba(88,80,236,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-container-low)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          {changing ? (
            <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{nextIcon[task.status]}</span>
              {nextLabel[task.status]}
            </>
          )}
        </button>
      </div>
    </Link>
  );
}

function CreateTaskModal({ projectId, members, onClose, onCreated }) {
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
          <button className="btn-ghost btn-icon" onClick={onClose}>
            <span className="material-symbols-outlined icon-sm">close</span>
          </button>
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
                {members.map(m => <option key={m.user?.id} value={m.user?.id}>{m.user?.full_name}</option>)}
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
              {loading ? <span className="spinner" /> : (
                <>
                  <span className="material-symbols-outlined icon-sm">add</span>
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage({ myTasks }) {
  const { projectId }  = useParams();
  const { isManager }  = useAuth();
  const [tasks,   setTasks]   = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus,   setFilterStatus]   = useState('');
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          {!myTasks && projectId && (
            <nav className="breadcrumb" style={{ marginBottom: 6 }}>
              <Link to={`/projects/${projectId}`}>← Project</Link>
            </nav>
          )}
          <h1 className="page-title">{myTasks ? 'My Tasks' : 'Task Board'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="form-input form-select"
            style={{ width: 150 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>
          <select
            className="form-input form-select"
            style={{ width: 150 }}
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          {!myTasks && isManager && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <span className="material-symbols-outlined icon-sm">add</span>
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Task count summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {COLUMNS.map(col => {
          const count = byStatus(col.key).length;
          return (
            <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {col.label}
              </span>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                background: 'var(--bg-container-high)', border: '1px solid var(--border-medium)',
                padding: '1px 7px', borderRadius: 'var(--radius-full)', color: 'var(--text-muted)',
              }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Kanban board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
        {COLUMNS.map(col => {
          const colTasks = byStatus(col.key);
          return (
            <div key={col.key}>
              {/* Column header */}
              <div className="kanban-col-header">
                <div className="kanban-col-dot" style={{ background: col.color }} />
                <span className="kanban-col-label" style={{ color: col.color }}>
                  {col.label}
                </span>
                <span className="kanban-col-count">{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 80 }}>
                {colTasks.length === 0 ? (
                  <div style={{
                    border: '1.5px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.8125rem',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    No tasks
                  </div>
                ) : (
                  colTasks.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      projectId={t.project_id || projectId}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
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