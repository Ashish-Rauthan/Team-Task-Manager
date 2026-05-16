import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/dashboard', icon: 'dashboard',           label: 'Dashboard'  },
  { to: '/projects',  icon: 'folder_open',          label: 'Projects'   },
  { to: '/my-tasks',  icon: 'assignment_turned_in', label: 'My Tasks'   },
];

const Avatar = ({ name, size = '' }) => {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return <div className={`avatar ${size}`}>{initials}</div>;
};

export { Avatar };

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 68 : 'var(--sidebar-w)',
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          height: 'var(--header-h)',
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 18px' : '0 16px',
          borderBottom: '1px solid var(--border)',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: 'var(--shadow-accent)',
          }}>
            <span className="material-symbols-outlined icon-fill" style={{ color: '#fff', fontSize: '20px' }}>bolt</span>
          </div>
          {!collapsed && (
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1.0625rem',
                color: 'var(--accent)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}>TaskFlow</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}>Command Center</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={collapsed ? { justifyContent: 'center', padding: '10px' } : {}}
              title={collapsed ? label : undefined}
            >
              <span className="material-symbols-outlined">{icon}</span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              style={collapsed ? { justifyContent: 'center', padding: '10px' } : {}}
              title={collapsed ? 'Users' : undefined}
            >
              <span className="material-symbols-outlined">group</span>
              {!collapsed && <span>Users</span>}
            </NavLink>
          )}
        </nav>

        {/* Bottom section */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px' }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="btn-ghost"
            style={{ width: '100%', justifyContent: 'center', padding: '8px', borderRadius: 'var(--radius-md)' }}
          >
            <span className="material-symbols-outlined" style={{ transition: 'transform 0.25s' }}>
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* User card */}
        {!collapsed ? (
          <div style={{
            padding: '14px 12px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px',
              background: 'var(--bg-container-low)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}>
              <Avatar name={user?.full_name} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                }}>
                  {user?.full_name}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {user?.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn-ghost btn-icon"
                title="Logout"
                style={{ padding: 6 }}
              >
                <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--text-muted)' }}>logout</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleLogout}
              className="btn-ghost btn-icon"
              title="Logout"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <span className="material-symbols-outlined icon-sm">logout</span>
            </button>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <header className="top-header">
          <div style={{ flex: 1, maxWidth: 440 }}>
            <input
              className="form-input form-search"
              placeholder="Search tasks, projects..."
              style={{ fontSize: '0.875rem', background: 'var(--bg-container-low)', borderColor: 'transparent' }}
            />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-ghost btn-icon" title="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="btn-ghost btn-icon" title="Help">
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-base)' }}>
          <div style={{ padding: '28px 32px', maxWidth: 1440, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}