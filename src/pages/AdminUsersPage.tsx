import { useState, useEffect, SubmitEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  FiPlus, FiTrash2, FiEdit2, FiX, FiAlertCircle,
  FiArrowLeft, FiShield, FiUser
} from 'react-icons/fi';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'USER' | 'ADMIN'>('USER');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setFormEmail('');
    setFormName('');
    setFormPassword('');
    setFormRole('USER');
    setShowModal(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setFormEmail(u.email);
    setFormName(u.name || '');
    setFormPassword('');
    setFormRole(u.role as 'USER' | 'ADMIN');
    setShowModal(true);
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingUser) {
        await apiService.updateUser(editingUser.id, {
          email: formEmail,
          name: formName,
          role: formRole,
          ...(formPassword ? { password: formPassword } : {}),
        });
      } else {
        if (!formPassword) {
          setError('Password is required for new users');
          return;
        }
        await apiService.createUser({
          email: formEmail,
          name: formName,
          password: formPassword,
          role: formRole,
        });
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiService.deleteUser(id);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting user');
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US');

  return (
    <div className="app-container" style={{ flexDirection: 'column' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
      }}>
        <Link to="/projects" className="btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
          <FiArrowLeft size={16} />
        </Link>
        <FiShield size={20} style={{ color: 'var(--color-accent)' }} />
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', flex: 1 }}>
          User Management
        </h1>
        <button className="btn-primary" onClick={openCreate}>
          <FiPlus size={16} />
          <span>New user</span>
        </button>
      </header>

      <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1rem', marginBottom: '1rem',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '0.5rem', color: '#fca5a5', fontSize: '0.875rem',
          }}>
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--color-dark-500)', textAlign: 'center', padding: '4rem' }}>
            Loading users...
          </div>
        ) : (
          <div style={{
            background: 'rgba(30, 41, 59, 0.3)',
            border: '1px solid rgba(51, 65, 85, 0.4)',
            borderRadius: '0.75rem',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.5)' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderTop: '1px solid rgba(51, 65, 85, 0.3)' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiUser size={14} style={{ color: 'var(--color-dark-500)' }} />
                        {u.name || '-'}
                        {u.id === currentUser?.id && (
                          <span style={{
                            fontSize: '0.625rem', fontWeight: 600,
                            background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc',
                            padding: '0.125rem 0.375rem', borderRadius: '9999px',
                          }}>You</span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
                        background: u.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(52, 211, 153, 0.1)',
                        color: u.role === 'ADMIN' ? '#a5b4fc' : '#34d399',
                      }}>
                        {u.role === 'ADMIN' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td style={tdStyle}>{formatDate(u.createdAt)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.375rem 0.5rem' }}
                          onClick={() => openEdit(u)}
                          title="Edit"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.375rem 0.5rem', color: '#ef4444' }}
                            onClick={() => handleDelete(u.id)}
                            title="Delete"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-dark-500)' }}>
                      No registered users
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} role="none">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '28rem' }} role="none">
            <div className="modal-header">
              <h2>{editingUser ? 'Edit user' : 'New user'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>
                  Email{''}
                  <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Name{''}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Password {editingUser ? <span style={{ color: 'var(--color-dark-500)' }}>(leave blank to keep unchanged)</span> : <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required={!editingUser}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Role{''}
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as 'USER' | 'ADMIN')}
                  style={inputStyle}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Save changes' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.875rem 1.25rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'var(--color-dark-400)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.875rem 1.25rem',
  fontSize: '0.875rem',
  color: 'var(--color-dark-200)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--color-dark-400)',
  marginBottom: '0.375rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  background: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(51, 65, 85, 0.4)',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  color: '#f1f5f9',
  outline: 'none',
};
