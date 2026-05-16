import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectsAPI, authAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ROLE_BADGE = {
  manager: { bg: 'var(--accent-dim)',        color: 'var(--accent)'         },
  member:  { bg: 'var(--bg-container-high)', color: 'var(--text-secondary)' },
};

// ── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({ projectId, existingIds, onClose, onAdded }) {
  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [role,    setRole]    = useState('member');
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
          <button className="btn-ghost btn-icon" onClick={onClose}>
            <span className="material-symbols-outlined icon-sm">close</span>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span className="material-symbols-outlined icon-sm" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }}>search</span>
            <input
              className="form-input"
              placeholder="Search users..."
              style={{ paddingLeft: 38 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-input form-select"
            style={{ width: 130 }}
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <option value="member">Member</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: 20 }}>
              No users available to add
            </div>
          )}
          {filtered.map(u => (
            <div
              key={u.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 10px',
                borderRadius: 'var(--radius-md)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
              onClick={() => !loading && add(u.id)}
            >
              <Avatar name={u.full_name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{u.full_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.email}</div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--accent)',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}>+ Add</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteProjectModal({ projectName, onConfirm, onClose, loading }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--danger)' }}>
            <span
              className="material-symbols-outlined icon-sm"
              style={{ marginRight: 8, verticalAlign: 'middle' }}
            >warning</span>
            Delete Project
          </h2>
          <button className="btn-ghost btn-icon" onClick={onClose} disabled={loading}>
            <span className="material-symbols-outlined icon-sm">close</span>
          </button>
        </div>

        <div style={{
          background: 'var(--danger-dim)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: 20,
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            You are about to permanently delete{' '}
            <strong style={{ color: 'var(--text-primary)' }}>"{projectName}"</strong>.
            This will also delete all tasks, comments, and activity logs.
            <strong style={{ color: 'var(--danger)', display: 'block', marginTop: 8 }}>
              This action cannot be undone.
            </strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: 'var(--danger)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
            }}
          >
            {loading ? (
              <span className="spinner" style={{ borderTopColor: '#fff' }} />
            ) : (
              <>
                <span className="material-symbols-outlined icon-sm">delete_forever</span>
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { projectId }                    = useParams();
  const { isAdmin, isManager, user }     = useAuth();
  const navigate                         = useNavigate();

  const [project,         setProject]         = useState(null);
  const [activity,        setActivity]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [tab,             setTab]             = useState('overview');
  const [showAddMember,   setShowAddMember]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading,   setDeleteLoading]   = useState(false);

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

  // A user is a project manager if they have the manager role in project_members,
  // OR if they are a global admin (admins can do everything).
  const isProjectManager =
    isAdmin ||
    project?.project_members?.some(
      m => m.user?.id === user?.id && m.role === 'manager'
    );

  const removeMember = async (memberId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await projectsAPI.removeMember(projectId, memberId);
      setProject(p => ({
        ...p,
        project_members: p.project_members.filter(m => m.id !== memberId),
      }));
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await projectsAPI.delete(projectId);
      toast.success(`Project "${project.name}" deleted`);
      navigate('/projects');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete project');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner spinner-lg" />
    </div>
  );
  if (!project) return <div className="empty-state"><p>Project not found</p></div>;

  const TABS = ['overview', 'members', 'activity'];

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom: 20 }}>
        <Link to="/projects">Projects</Link>
        <span className="sep">›</span>
        <span className="current">{project.name}</span>
      </nav>

      {/* Project header card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: 24,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ height: 4, background: project.color }} />
        <div style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: project.color, flexShrink: 0,
              }} />
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
              }}>
                {project.name}
              </h1>
              <span style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontFamily: 'var(--font-mono)',
                background: `${project.color}15`,
                color: project.color,
              }}>
                {project.is_archived ? 'Archived' : 'Active'}
              </span>
            </div>
            {project.description && (
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9375rem',
                maxWidth: 560,
                lineHeight: 1.6,
              }}>
                {project.description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
            <Link
              to={`/projects/${projectId}/tasks`}
              className="btn btn-primary"
            >
              <span className="material-symbols-outlined icon-sm">task_alt</span>
              View Tasks
            </Link>

            {/* Admin-only: Delete project */}
            {isAdmin && (
              <button
                className="btn btn-danger"
                onClick={() => setShowDeleteModal(true)}
                title="Delete this project permanently"
              >
                <span className="material-symbols-outlined icon-sm">delete</span>
                Delete Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab-item ${tab === t ? 'active' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              marginBottom: 20,
              fontSize: '0.9375rem',
            }}>
              Project Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                ['Owner',   project.owner?.full_name],
                ['Created', format(new Date(project.created_at), 'MMMM d, yyyy')],
                ['Members', `${project.project_members?.length || 0} people`],
                ['Status',  project.is_archived ? 'Archived' : 'Active'],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    {label}
                  </span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              marginBottom: 20,
              fontSize: '0.9375rem',
            }}>
              Team ({project.project_members?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(project.project_members || []).slice(0, 6).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={m.user?.full_name} />
                  <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                    {m.user?.full_name}
                  </span>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    padding: '3px 10px', borderRadius: 'var(--radius-full)',
                    background: ROLE_BADGE[m.role]?.bg,
                    color: ROLE_BADGE[m.role]?.color,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    fontFamily: 'var(--font-mono)',
                  }}>{m.role}</span>
                </div>
              ))}
              {(project.project_members?.length || 0) > 6 && (
                <button
                  className="btn-ghost"
                  style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginTop: 4 }}
                  onClick={() => setTab('members')}
                >
                  View all {project.project_members.length} members →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Members tab ── */}
      {tab === 'members' && (
        <div className="card">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem' }}>
              Team Members
              <span style={{
                marginLeft: 10,
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-container-high)',
                color: 'var(--text-muted)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-medium)',
              }}>
                {project.project_members?.length || 0}
              </span>
            </h3>

            {/* Add Member: visible to project managers (includes admins) */}
            {isProjectManager && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddMember(true)}
              >
                <span className="material-symbols-outlined icon-sm">person_add</span>
                Add Member
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(project.project_members || []).map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 10px',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <Avatar name={m.user?.full_name} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {m.user?.full_name}
                    {m.user?.id === user?.id && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: '0.6rem',
                        color: 'var(--accent)',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        fontWeight: 700,
                      }}>You</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {m.user?.email}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  padding: '3px 10px', borderRadius: 'var(--radius-full)',
                  background: ROLE_BADGE[m.role]?.bg,
                  color: ROLE_BADGE[m.role]?.color,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {m.role}
                </span>

                {/* Remove button: project managers can remove others (not themselves) */}
                {isProjectManager && m.user?.id !== user?.id && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeMember(m.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {(project.project_members || []).length === 0 && (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2rem', opacity: 0.3 }}>group</span>
                <p style={{ fontSize: '0.875rem' }}>No members yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Activity tab ── */}
      {tab === 'activity' && (
        <div className="card">
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            marginBottom: 20,
            fontSize: '0.9375rem',
          }}>
            Activity Log
          </h3>
          {activity.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', opacity: 0.3 }}>history</span>
              <p>No activity yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activity.map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', gap: 14, padding: '14px 0',
                  borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <Avatar name={a.actor?.full_name} size="avatar-sm" />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {a.actor?.full_name}{' '}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {a.action.replace('.', ' ').replace(/_/g, ' ')}
                    </span>
                    {a.meta?.title && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {' '}"{a.meta.title}"
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {format(new Date(a.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add member modal */}
      {showAddMember && (
        <AddMemberModal
          projectId={projectId}
          existingIds={(project.project_members || []).map(m => m.user?.id)}
          onClose={() => setShowAddMember(false)}
          onAdded={m => setProject(p => ({
            ...p,
            project_members: [...p.project_members, m],
          }))}
        />
      )}

      {/* Delete project modal */}
      {showDeleteModal && (
        <DeleteProjectModal
          projectName={project.name}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onClose={() => !deleteLoading && setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}