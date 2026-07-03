import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService, ProjectDTO } from '../services/api';
import {
  FiLayers, FiArrowLeft, FiTrash2, FiAlertCircle,
  FiFolder, FiUsers, FiClock
} from 'react-icons/fi';

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando proyectos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este proyecto?')) return;
    try {
      await apiService.deleteProject(id);
      loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando proyecto');
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
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
          Administración de Proyectos
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--color-dark-400)', fontSize: '0.875rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FiFolder size={14} /> {projects.length} proyectos
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FiLayers size={14} /> {totalNodes} nodos
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
            Cargando proyectos...
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
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Propietario</th>
                  <th style={thStyle}>Miembros</th>
                  <th style={thStyle}>Nodos</th>
                  <th style={thStyle}>Actualizado</th>
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
                          {owner?.user.name || owner?.user.email || 'Sin propietario'}
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
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.375rem 0.5rem', color: '#ef4444' }}
                          onClick={() => handleDelete(p.id)}
                          title="Eliminar proyecto"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-dark-500)' }}>
                      No hay proyectos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
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
