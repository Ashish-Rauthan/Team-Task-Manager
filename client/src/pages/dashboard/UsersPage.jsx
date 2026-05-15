import React, { useEffect, useState } from 'react';
import { authAPI } from '../../api';
import { Avatar } from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ROLE_STYLE = {
  admin:   { bg: 'var(--danger-dim)',  color: 'var(--danger)'        },
  manager: { bg: 'var(--accent-dim)',  color: 'var(--accent-light)'  },
  member:  { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)'},
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
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
    finally { setUpdating(null); }
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input className="form-input" style={{ width: 260 }} placeholder="Search users..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {filtered.length} users
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 140px 140px',
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <span>User</span>
            <span>Email</span>
            <span>Joined</span>
            <span>Role</span>
          </div>

          {filtered.map((u, i) => (
            <div key={u.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 140px 140px',
              padding: '14px 20px', alignItems: 'center',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {/* User */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={u.full_name} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{u.full_name}</div>
                  {u.id === me?.id && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-light)' }}>You</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{u.email}</span>

              {/* Joined */}
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {format(new Date(u.created_at), 'MMM d, yyyy')}
              </span>

              {/* Role */}
              {u.id === me?.id ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '4px 12px',
                  borderRadius: 99, fontSize: '0.75rem', fontWeight: 700,
                  background: ROLE_STYLE[u.role]?.bg, color: ROLE_STYLE[u.role]?.color,
                  textTransform: 'capitalize',
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
                    border: '1px solid var(--border)',
                    borderRadius: 99, padding: '4px 12px',
                    fontSize: '0.75rem', fontWeight: 700,
                    cursor: 'pointer', appearance: 'none',
                    textTransform: 'capitalize',
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
              <span className="empty-state-icon">◎</span>
              <p>No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}