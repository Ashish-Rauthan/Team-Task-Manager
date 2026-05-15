import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';

const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };
const STATUS_CLASS = { todo: 'badge-todo', in_progress: 'badge-progress', in_review: 'badge-review', done: 'badge-done' };
const PRIORITY_CLASS = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', urgent: 'badge-urgent' };

function StatCard({ value, label, color, icon }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="stat-value" style={{ color }}>{value}</span>
        <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>{icon}</span>
      </div>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function TaskRow({ task }) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  return (
    <Link to={`/projects/${task.project_id}/tasks/${task.id}`} style={{ display: 'block' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid var(--border)',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {task.project_name}
          </div>
        </div>
        <span className={`badge ${STATUS_CLASS[task.status] || 'badge-todo'}`}>
          {STATUS_LABEL[task.status]}
        </span>
        <span className={`badge ${PRIORITY_CLASS[task.priority] || 'badge-medium'}`}>
          {task.priority}
        </span>
        {task.due_date && (
          <span style={{ fontSize: '0.75rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {isOverdue ? '⚠ ' : ''}{format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksAPI.dashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  const s = data?.stats || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.875rem' }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <StatCard value={s.total       || 0} label="Total Tasks"    color="var(--text-secondary)" icon="◫" />
        <StatCard value={s.in_progress || 0} label="In Progress"    color="var(--info)"           icon="◈" />
        <StatCard value={s.in_review   || 0} label="In Review"      color="var(--warning)"        icon="◉" />
        <StatCard value={s.done        || 0} label="Completed"      color="var(--success)"        icon="✓" />
        <StatCard value={s.overdue     || 0} label="Overdue"        color="var(--danger)"         icon="⚠" />
        <StatCard value={s.my_tasks    || 0} label="Assigned to Me" color="var(--accent)"         icon="◎" />
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* My tasks */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>My Tasks</h2>
            <Link to="/my-tasks" style={{ fontSize: '0.8125rem', color: 'var(--accent-light)' }}>View all →</Link>
          </div>
          {data?.my_tasks?.length ? (
            data.my_tasks.map(t => <TaskRow key={t.id} task={t} />)
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <span className="empty-state-icon">✓</span>
              <p style={{ fontSize: '0.875rem' }}>No pending tasks</p>
            </div>
          )}
        </div>

        {/* Overdue tasks */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
              ⚠ Overdue
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
              {data?.overdue_tasks?.length || 0} tasks
            </span>
          </div>
          {data?.overdue_tasks?.length ? (
            data.overdue_tasks.map(t => <TaskRow key={t.id} task={t} />)
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <span className="empty-state-icon">🎉</span>
              <p style={{ fontSize: '0.875rem' }}>Nothing overdue!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}