import React, { useEffect, useState } from 'react';
import { authAPI } from '../../api';
import { Avatar } from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ROLE_STYLE = {
  admin:   { bg: 'var(--danger-dim)',   color: 'var(--danger)'   },
  manager: { bg: 'var(--accent-dim)',   color: 'var(--accent)'   },
  member:  { bg: 'var(--bg-container-high)', color: 'var(--text-secondary)' },
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    authAPI.listUsers()
      .then(res => setUsers(res.data.users || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const changeRole = async (userId, role) => {
    setUpdating(userId);
    try {
      await authAPI.updateUserRole(userId, role);
      setUsers(us => us.map(u => u.id === userId ? { ...u, role } : u));
      toast.success('Role updated');
    } catch { toast.error('Failed to update role'); }
    finally   { setUpdating(null); }
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
            Manage roles and access for your workspace.
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
              style={{ width: 260, paddingLeft: 38, borderRadius: 'var(--radius-full)' }}
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span style={{
            fontSize: '0.7rem', color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', background: 'var(--bg-container-high)',
            padding: '4px 10px', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-medium)', whiteSpace: 'nowrap',
          }}>
            {filtered.length} users
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 150px 160px',
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-container-low)',
          }}>
            {['User', 'Email', 'Joined', 'Role'].map(h => (
              <span key={h} style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-mono)',
              }}>{h}</span>
            ))}
          </div>

          {filtered.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 150px 160px',
                padding: '14px 20px',
                alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {/* User */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={u.full_name} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
                    {u.full_name}
                  </div>
                  {u.id === me?.id && (
                    <span style={{
                      fontSize: '0.6rem',
                      color: 'var(--accent)',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                    }}>You</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                {u.email}
              </span>

              {/* Joined */}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {format(new Date(u.created_at), 'MMM d, yyyy')}
              </span>

              {/* Role */}
              {u.id === me?.id ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.7rem', fontWeight: 700,
                  background: ROLE_STYLE[u.role]?.bg,
                  color: ROLE_STYLE[u.role]?.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid transparent',
                }}>
                  {u.role}
                </span>
              ) : (
                <select
                  value={u.role}
                  disabled={updating === u.id}
                  onChange={e => changeRole(u.id, e.target.value)}
                  style={{
                    background: ROLE_STYLE[u.role]?.bg,
                    color: ROLE_STYLE[u.role]?.color,
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-full)',
                    padding: '4px 28px 4px 12px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    appearance: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontFamily: 'var(--font-mono)',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                  }}
                >
                  <option value="member">member</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="empty-state" style={{ padding: '48px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', opacity: 0.3 }}>group</span>
              <p>No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}