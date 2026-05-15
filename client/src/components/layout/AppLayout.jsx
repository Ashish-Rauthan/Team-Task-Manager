import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { to: '/projects',  icon: '◫', label: 'Projects'  },
  { to: '/my-tasks',  icon: '◈', label: 'My Tasks'  },
];

const Avatar = ({ name, size = '' }) => {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
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
        width: collapsed ? 64 : 'var(--sidebar-w)',
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          height: 'var(--header-h)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', flexShrink: 0,
          }}>⬡</div>
          {!collapsed && (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', whiteSpace: 'nowrap' }}>
              TaskFlow
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 'var(--radius-md)',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-active)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            })}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = ''; }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
              {!collapsed && <span style={{ fontSize: '0.875rem' }}>{label}</span>}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink to="/users" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 'var(--radius-md)',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-active)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            })}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>◎</span>
              {!collapsed && <span style={{ fontSize: '0.875rem' }}>Users</span>}
            </NavLink>
          )}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="btn-ghost"
          style={{ margin: '8px', borderRadius: 'var(--radius-md)', justifyContent: 'center', padding: 10 }}
        >
          {collapsed ? '›' : '‹'}
        </button>

        {/* User card */}
        <div style={{
          padding: '12px 10px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <Avatar name={user?.full_name} />
          {!collapsed && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user?.role}
              </div>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="btn-ghost btn-icon" title="Logout" style={{ padding: 6 }}>
              ⏻
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-base)' }}>
        <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}