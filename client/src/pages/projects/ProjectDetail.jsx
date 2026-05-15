import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectsAPI, authAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ROLE_BADGE = {
  manager: { bg: 'var(--accent-dim)', color: 'var(--accent-light)' },
  member:  { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
};

function AddMemberModal({ projectId, existingIds, onClose, onAdded }) {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole]     = useState('member');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authAPI.listUsers()
      .then(res => setUsers((res.data.users || []).filter(u => !existingIds.includes(u.id))))
      .catch(() => toast.error('Failed to load users'));
  }, [existingIds]);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const add = async (userId) => {
    setLoading(true);
    try {
      const res = await projectsAPI.addMember(projectId, { user_id: userId, role });
      toast.success('Member added!');
      onAdded(res.data.member);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Member</h2>
          <button className="btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input className="form-input flex-1" placeholder="Search users..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input form-select" style={{ width: 120 }}
            value={role} onChange={e => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: 20 }}>
              No users found
            </div>
          )}
          {filtered.map(u => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px',
              borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
            onClick={() => !loading && add(u.id)}
            >
              <Avatar name={u.full_name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{u.full_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-light)' }}>+ Add</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { isAdmin, isManager, user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('overview');
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    Promise.all([
      projectsAPI.get(projectId),
      projectsAPI.getActivity(projectId),
    ]).then(([projRes, actRes]) => {
      setProject(projRes.data.project);
      setActivity(actRes.data.activity || []);
    }).catch(() => toast.error('Failed to load project'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const removeMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await projectsAPI.removeMember(projectId, memberId);
      setProject(p => ({ ...p, project_members: p.project_members.filter(m => m.id !== memberId) }));
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  };

  const isProjectManager = isAdmin ||
    project?.project_members?.some(m => m.user?.id === user?.id && m.role === 'manager');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner spinner-lg" /></div>;
  if (!project) return <div className="empty-state"><p>Project not found</p></div>;

  const TABS = ['overview', 'members', 'activity'];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <Link to="/projects" style={{ color: 'var(--text-muted)' }}>Projects</Link>
          <span>›</span>
          <span style={{ color: 'var(--text-primary)' }}>{project.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: project.color }} />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800 }}>
              {project.name}
            </h1>
          </div>
          <Link to={`/projects/${projectId}/tasks`} className="btn btn-primary">
            View Tasks →
          </Link>
        </div>
        {project.description && (
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '0.875rem', maxWidth: 560 }}>
            {project.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', fontSize: '0.875rem', fontWeight: 500,
            color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            textTransform: 'capitalize', transition: 'all 0.15s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Owner',   project.owner?.full_name],
                ['Created', format(new Date(project.created_at), 'MMMM d, yyyy')],
                ['Members', `${project.project_members?.length || 0} people`],
                ['Status',  project.is_archived ? 'Archived' : 'Active'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16 }}>Team</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(project.project_members || []).slice(0,5).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={m.user?.full_name} size="avatar-sm" />
                  <span style={{ flex: 1, fontSize: '0.875rem' }}>{m.user?.full_name}</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                    background: ROLE_BADGE[m.role]?.bg, color: ROLE_BADGE[m.role]?.color,
                  }}>{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              Team Members ({project.project_members?.length || 0})
            </h3>
            {isProjectManager && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddMember(true)}>
                + Add Member
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(project.project_members || []).map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 8px', borderRadius: 'var(--radius-md)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <Avatar name={m.user?.full_name} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.user?.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.user?.email}</div>
                </div>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                  background: ROLE_BADGE[m.role]?.bg, color: ROLE_BADGE[m.role]?.color,
                }}>{m.role}</span>
                {isProjectManager && m.user?.id !== user?.id && (
                  <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.id)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity tab */}
      {tab === 'activity' && (
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 20 }}>Activity Log</h3>
          {activity.length === 0 ? (
            <div className="empty-state"><span className="empty-state-icon">◎</span><p>No activity yet</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {activity.map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', gap: 12, padding: '12px 0',
                  borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <Avatar name={a.actor?.full_name} size="avatar-sm" />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.actor?.full_name} </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {a.action.replace('.', ' ').replace('_', ' ')}
                    </span>
                    {a.meta?.title && <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}> "{a.meta.title}"</span>}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {format(new Date(a.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddMember && (
        <AddMemberModal
          projectId={projectId}
          existingIds={(project.project_members || []).map(m => m.user?.id)}
          onClose={() => setShowAddMember(false)}
          onAdded={m => setProject(p => ({ ...p, project_members: [...p.project_members, m] }))}
        />
      )}
    </div>
  );
}