import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS = ['#5850ec','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#3b82f6','#ef4444'];

function ProjectModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ name: '', description: '', color: COLORS[0] });
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
            <input className="form-input" placeholder="e.g. Website Redesign"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="What is this project about?"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', background: c,
                    border: form.color === c ? '3px solid white' : '3px solid transparent',
                    boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                  }} />
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

function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project.id}`}>
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.25s',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.10)';
          e.currentTarget.style.borderColor = project.color + '60';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.borderColor = '';
        }}
      >
        {/* Color strip */}
        <div style={{ height: 4, background: project.color }} />

        <div style={{ padding: '18px 20px' }}>
          {/* Status badge + color dot */}
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
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {format(new Date(project.created_at), 'MMM d')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const { isManager } = useAuth();
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    projectsAPI.list()
      .then(res => setProjects(res.data.projects || []))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
          {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {showModal && (
        <ProjectModal
          onClose={() => setShowModal(false)}
          onCreated={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </div>
  );
}