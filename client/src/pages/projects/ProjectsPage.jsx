import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#3b82f6','#ef4444'];

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
          <button className="btn-ghost btn-icon" onClick={onClose}>✕</button>
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
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: form.color === c ? '3px solid white' : '3px solid transparent',
                    boxShadow: form.color === c ? '0 0 0 2px ' + c : 'none',
                    transition: 'all 0.15s',
                  }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Project'}
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
      <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = project.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; }}
      >
        {/* Color strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: project.color }} />
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: project.color, flexShrink: 0,
            }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.name}
            </h3>
          </div>
          {project.description && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 14,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {project.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar name={project.owner?.full_name} size="avatar-sm" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {project.owner?.full_name}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    projectsAPI.list()
      .then(res => setProjects(res.data.projects || []))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Project
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <span className="empty-state-icon">◫</span>
          <h3 style={{ fontWeight: 600 }}>No projects yet</h3>
          <p style={{ fontSize: '0.875rem' }}>Create your first project to get started</p>
          {isManager && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + New Project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
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