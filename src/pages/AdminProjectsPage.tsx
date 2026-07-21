import { useState, useEffect, SubmitEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiService, ProjectDTO } from '../services/api';
import {
  FiLayers, FiArrowLeft, FiTrash2, FiAlertCircle,
  FiFolder, FiUsers, FiClock, FiEdit2, FiX, FiSave
} from 'react-icons/fi';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface EditModalProps {
  project: ProjectDTO;
  users: User[];
  onClose: () => void;
  onSave: (id: string, data: { name: string; description: string; newOwnerId?: string }) => Promise<void>;
}

function EditProjectModal({ project, users, onClose, onSave }: Readonly<EditModalProps>) {
  const currentOwner = project.members?.find(m => m.role === 'OWNER');
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [ownerId, setOwnerId] = useState(currentOwner?.user.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(project.id, {
        name: name.trim(),
        description: description.trim(),
        newOwnerId: ownerId == currentOwner?.user.id ? undefined : ownerId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-dark-800)', borderRadius: '0.75rem',
        width: '100%', maxWidth: '480px', padding: '1.5rem',
        border: '1px solid rgba(51, 65, 85, 0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'white' }}>Edit Project</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-dark-400)', cursor: 'pointer' }}>
            <FiX size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem', marginBottom: '1rem',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '0.5rem', color: '#fca5a5', fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-dark-300)' }}>
              Name *{''}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%', padding: '0.625rem 0.875rem',
                background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(51, 65, 85, 0.5)',
                borderRadius: '0.5rem', color: 'white', fontSize: '0.875rem',
              }}
              placeholder="Project name"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-dark-300)' }}>
              Description{''}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '0.625rem 0.875rem',
                background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(51, 65, 85, 0.5)',
                borderRadius: '0.5rem', color: 'white', fontSize: '0.875rem', resize: 'vertical',
              }}
              placeholder="Optional description"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-dark-300)' }}>
              Owner{''}
            </label>
            <select
              value={ownerId}
              onChange={e => setOwnerId(e.target.value)}
              style={{
                width: '100%', padding: '0.625rem 0.875rem',
                background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(51, 65, 85, 0.5)',
                borderRadius: '0.5rem', color: 'white', fontSize: '0.875rem',
              }}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} {u.role === 'ADMIN' ? '(Admin)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FiSave size={14} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [projectsData, usersData] = await Promise.all([
        apiService.getProjects(),
        apiService.getUsers(),
      ]);
      setProjects(projectsData);
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await apiService.deleteProject(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting project');
    }
  };

  const handleSaveProject = async (id: string, data: { name: string; description: string; newOwnerId?: string }) => {
    await apiService.updateProject(id, data);
    await loadData();
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const totalNodes = projects.reduce((acc, p) => acc + p.nodes.length, 0);

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
        <img src="/logo.png" alt="QA Flow" width="28" height="28" style={{ borderRadius: '0.5rem' }} />
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', flex: 1 }}>
          Project Administration
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--color-dark-400)', fontSize: '0.875rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FiFolder size={14} /> {projects.length} projects
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FiLayers size={14} /> {totalNodes} nodes
          </span>
        </div>
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
            Loading projects...
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
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Owner</th>
                  <th style={thStyle}>Members</th>
                  <th style={thStyle}>Nodes</th>
                  <th style={thStyle}>Updated</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const owner = p.members?.find((m) => m.role === 'OWNER');
                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid rgba(51, 65, 85, 0.3)' }}>
                      <td style={tdStyle}>
                        <Link
                          to={`/projects/${p.id}`}
                          style={{
                            color: 'var(--color-accent)',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: 'var(--color-dark-400)', fontSize: '0.8125rem' }}>
                          {p.description || '-'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FiUsers size={12} style={{ color: 'var(--color-dark-500)' }} />
                          {owner?.user.name || owner?.user.email || 'No owner'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 600,
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: '#a5b4fc', padding: '0.25rem 0.5rem',
                          borderRadius: '0.375rem',
                        }}>
                          {p.members?.length || 0}
                        </span>
                      </td>
                      <td style={tdStyle}>{p.nodes.length}</td>
                      <td style={tdStyle}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-dark-400)', fontSize: '0.8125rem' }}>
                          <FiClock size={12} />
                          {formatDate(p.updatedAt)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.375rem 0.5rem' }}
                            onClick={() => setEditingProject(p)}
                            title="Edit project"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.375rem 0.5rem', color: '#ef4444' }}
                            onClick={() => handleDelete(p.id)}
                            title="Delete project"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-dark-500)' }}>
                      No projects
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          users={users}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveProject}
        />
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
