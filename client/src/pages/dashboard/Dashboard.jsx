import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';

const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };
const STATUS_CLASS  = { todo: 'badge-todo', in_progress: 'badge-progress', in_review: 'badge-review', done: 'badge-done' };
const PRIORITY_CLASS = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', urgent: 'badge-urgent' };

function StatCard({ value, label, color, icon }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="stat-value" style={{ color }}>{value}</span>
      </div>
      <span className="stat-label">{label}</span>
      <div className="stat-icon-watermark" style={{ color }}>
        <span className="material-symbols-outlined" style={{ fontSize: 'inherit', fontVariationSettings: "'FILL' 1, 'wght' 300" }}>{icon}</span>
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  return (
    <Link to={`/projects/${task.project_id}/tasks/${task.id}`} style={{ display: 'block' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 12px',
          borderRadius: 'var(--radius-md)',
          transition: 'all 0.15s',
          cursor: 'pointer',
          borderLeft: `3px solid var(--priority-${task.priority || 'medium'})`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
            {task.title}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
          <span style={{ fontSize: '0.7rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
            {isOverdue && <span className="material-symbols-outlined icon-sm" style={{ verticalAlign: 'middle', marginRight: 2 }}>warning</span>}
            {format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
    </Link>
  );
}

function SectionCard({ title, action, actionTo, badge, badgeColor, children }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem' }}>
          {title}
          {badge != null && (
            <span style={{
              marginLeft: 10, fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
              background: badgeColor ? `${badgeColor}15` : 'var(--bg-container-high)',
              color: badgeColor || 'var(--text-muted)',
              border: `1px solid ${badgeColor ? `${badgeColor}30` : 'var(--border-medium)'}`,
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              fontWeight: 700,
            }}>{badge}</span>
          )}
        </h2>
        {action && (
          <Link to={actionTo} style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            {action}
          </Link>
        )}
      </div>
      <div style={{ padding: '8px 8px' }}>
        {children}
      </div>
    </div>
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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: 6,
          }}>
            {greeting}, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', fontFamily: 'var(--font-body)' }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")} — Here's what's happening today.
          </p>
        </div>
        <Link to="/projects" className="btn btn-primary" style={{ gap: 8 }}>
          <span className="material-symbols-outlined icon-sm">add</span>
          New Task
        </Link>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <StatCard value={s.total       || 0} label="Total Tasks"    color="var(--text-secondary)" icon="task_alt" />
        <StatCard value={s.in_progress || 0} label="In Progress"    color="var(--info)"           icon="sync" />
        <StatCard value={s.in_review   || 0} label="In Review"      color="var(--warning)"        icon="rate_review" />
        <StatCard value={s.done        || 0} label="Completed"      color="var(--success)"        icon="check_circle" />
        <StatCard value={s.overdue     || 0} label="Overdue"        color="var(--danger)"         icon="alarm" />
        <StatCard value={s.my_tasks    || 0} label="Assigned to Me" color="var(--accent)"         icon="person" />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SectionCard
          title="My Tasks"
          action="View all →"
          actionTo="/my-tasks"
        >
          {data?.my_tasks?.length ? (
            data.my_tasks.slice(0, 6).map(t => <TaskRow key={t.id} task={t} />)
          ) : (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', opacity: 0.3 }}>check_circle</span>
              <p style={{ fontSize: '0.875rem' }}>No pending tasks — you're all caught up!</p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Overdue"
          badge={data?.overdue_tasks?.length || 0}
          badgeColor="var(--danger)"
        >
          {data?.overdue_tasks?.length ? (
            data.overdue_tasks.slice(0, 6).map(t => <TaskRow key={t.id} task={t} />)
          ) : (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', opacity: 0.3 }}>celebration</span>
              <p style={{ fontSize: '0.875rem' }}>Nothing overdue — great work! 🎉</p>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}