import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS = ['#5850ec','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#3b82f6','#ef4444'];

// ── Create Project Modal ──────────────────────────────────────────────────────
function ProjectModal({ onClose, onCreated }) {
  const [form, setForm]       = useState({ name: '', description: '', color: COLORS[0] });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await projectsAPI.create(form);
      toast.success('Project created!');
      onCreated(res.data.project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Project</h2>
          <button className="btn-ghost btn-icon" onClick={onClose}>
            <span className="material-symbols-outlined icon-sm">close</span>
          </button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Website Redesign"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              placeholder="What is this project about?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', background: c,
                    border: form.color === c ? '3px solid white' : '3px solid transparent',
                    boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (
                <>
                  <span className="material-symbols-outlined icon-sm">add</span>
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, onDelete, isAdmin }) {
  const [hovered, setHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <Link to={`/projects/${project.id}`}>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${hovered ? project.color + '60' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.25s',
            boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.10)' : 'var(--shadow-sm)',
            transform: hovered ? 'translateY(-4px)' : 'none',
            position: 'relative',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Color strip */}
          <div style={{ height: 4, background: project.color }} />

          <div style={{ padding: '18px 20px' }}>
            {/* Status badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
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

            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
              /* Leave room for delete button when admin */
              paddingRight: isAdmin ? 36 : 0,
            }}>
              {project.name}
            </h3>

            {project.description && (
              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                marginBottom: 16,
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {project.description}
              </p>
            )}

            {/* Footer */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: 14, borderTop: '1px solid var(--border)',
              marginTop: project.description ? 0 : 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={project.owner?.full_name} size="avatar-sm" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {project.owner?.full_name}
                </span>
              </div>
              <span style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {format(new Date(project.created_at), 'MMM d')}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Admin-only delete button — sits above the Link */}
      {isAdmin && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(project.id, project.name);
          }}
          onMouseEnter={() => setDeleteHovered(true)}
          onMouseLeave={() => setDeleteHovered(false)}
          title="Delete project"
          style={{
            position: 'absolute',
            top: 18,
            right: 16,
            zIndex: 2,
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${deleteHovered ? 'rgba(239,68,68,0.4)' : 'var(--border-medium)'}`,
            background: deleteHovered ? 'var(--danger-dim)' : 'var(--bg-surface)',
            color: deleteHovered ? 'var(--danger)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
        </button>
      )}
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ projectName, onConfirm, onClose, loading }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--danger)' }}>
            <span className="material-symbols-outlined icon-sm" style={{ marginRight: 8, verticalAlign: 'middle' }}>warning</span>
            Delete Project
          </h2>
          <button className="btn-ghost btn-icon" onClick={onClose}>
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
            This will also delete all tasks, comments, and activity logs associated with it.
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
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: 'var(--danger)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
            }}
          >
            {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : (
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { isManager, isAdmin } = useAuth();
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [search,     setSearch]     = useState('');

  // Delete flow state
  const [deleteTarget,  setDeleteTarget]  = useState(null);  // { id, name }
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    projectsAPI.list()
      .then(res => setProjects(res.data.projects || []))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Called from card — opens confirm modal
  const handleDeleteRequest = (id, name) => {
    setDeleteTarget({ id, name });
  };

  // Called from confirm modal
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await projectsAPI.delete(deleteTarget.id);
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast.success(`Project "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete project');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
            Manage your workspace initiatives and track team progress.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined icon-sm" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }}>search</span>
            <input
              className="form-input"
              style={{ width: 240, paddingLeft: 38, borderRadius: 'var(--radius-full)' }}
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {isManager && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <span className="material-symbols-outlined icon-sm">add</span>
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Admin info banner */}
      {isAdmin && projects.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          marginBottom: 20,
          background: 'var(--danger-dim)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
          color: 'var(--danger)',
          fontFamily: 'var(--font-mono)',
        }}>
          <span className="material-symbols-outlined icon-sm">admin_panel_settings</span>
          Admin view — you can delete any project using the{' '}
          <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>delete</span>
          {' '}button on each card.
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', opacity: 0.3 }}>folder_open</span>
          <h3 style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            {search ? 'No projects match your search' : 'No projects yet'}
          </h3>
          <p style={{ fontSize: '0.875rem' }}>
            {search ? 'Try a different search term' : 'Create your first project to get started'}
          </p>
          {isManager && !search && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <span className="material-symbols-outlined icon-sm">add</span>
              New Project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              isAdmin={isAdmin}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <ProjectModal
          onClose={() => setShowModal(false)}
          onCreated={p => setProjects(prev => [p, ...prev])}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          projectName={deleteTarget.name}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onClose={() => !deleteLoading && setDeleteTarget(null)}
        />
      )}
    </div>
  );
}