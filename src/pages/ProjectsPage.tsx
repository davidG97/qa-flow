import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService, ProjectDTO } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiFolder, 
  FiPlus, 
  FiTrash2, 
  FiClock,
  FiRefreshCw,
  FiPlay,
  FiLayers,
  FiSearch,
  FiX,
  FiAlertCircle,
  FiBox,
  FiGitBranch,
  FiZap,
  FiLogOut,
  FiUser,
  FiShield
} from 'react-icons/fi';

// Componente Skeleton para loading
const ProjectSkeleton = () => (
  <div className="project-card skeleton">
    <div className="project-card-content">
      <div className="skeleton-icon" />
      <div className="skeleton-info">
        <div className="skeleton-title" />
        <div className="skeleton-description" />
        <div className="skeleton-stats" />
      </div>
    </div>
    <div className="skeleton-footer">
      <div className="skeleton-meta" />
      <div className="skeleton-actions" />
    </div>
  </div>
);

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Form state para crear proyecto
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  // Filtrar proyectos cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredProjects(projects.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      ));
    } else {
      setFilteredProjects(projects);
    }
  }, [searchTerm, projects]);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getProjects();
      setProjects(data);
    } catch (err) {
      setError('Error cargando proyectos. Verifica tu conexión.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('El nombre del proyecto es requerido');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const newProject = await apiService.createProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        nodes: [],
        edges: [],
      });

      // Navegar directamente al editor del nuevo proyecto
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      setError('Error creando proyecto');
      console.error(err);
      setCreating(false);
    }
  };

  const handleDeleteProject = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      // Auto-cancelar después de 3 segundos
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await apiService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Error eliminando proyecto');
      console.error(err);
    }
  }, [deleteConfirm]);

  const handleOpenProject = (id: string) => {
    navigate(`/projects/${id}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `hace ${diffMins} min`;
      }
      return `hace ${diffHours}h`;
    } else if (diffDays === 1) {
      return 'ayer';
    } else if (diffDays < 7) {
      return `hace ${diffDays} días`;
    }
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const clearSearch = () => setSearchTerm('');

  const totalNodes = projects.reduce((acc, p) => acc + p.nodes.length, 0);
  const totalEdges = projects.reduce((acc, p) => acc + p.edges.length, 0);

  return (
    <div className="projects-page">
      <header className="projects-header">
        <div className="projects-header-content">
          <div className="projects-logo">
            <img src="/logo.png" alt="QA Flow" width="48" height="48" style={{ borderRadius: '0.5rem' }} />
            <h1>QA Flow</h1>
          </div>
          <p className="projects-subtitle">Editor visual de pruebas automatizadas con Playwright</p>
          
          {/* Quick stats */}
          {!loading && projects.length > 0 && (
            <div className="quick-stats">
              <div className="stat">
                <FiFolder size={14} />
                <span>{projects.length} proyectos</span>
              </div>
              <div className="stat">
                <FiBox size={14} />
                <span>{totalNodes} nodos</span>
              </div>
              <div className="stat">
                <FiGitBranch size={14} />
                <span>{totalEdges} conexiones</span>
              </div>
            </div>
          )}
        </div>

        {/* User bar */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 1rem',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(51, 65, 85, 0.4)',
            borderRadius: '0.75rem',
            marginTop: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-dark-200)', fontSize: '0.875rem' }}>
              <FiUser size={14} style={{ color: 'var(--color-accent)' }} />
              <span>{user.name || user.email}</span>
              {isAdmin && (
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700,
                  background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc',
                  padding: '0.125rem 0.375rem', borderRadius: '9999px',
                }}>ADMIN</span>
              )}
            </div>
            {isAdmin && (
              <>
                <Link to="/admin/users" className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                  <FiShield size={14} />
                  <span>Usuarios</span>
                </Link>
                <Link to="/admin/projects" className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                  <FiLayers size={14} />
                  <span>Proyectos</span>
                </Link>
              </>
            )}
            <button className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }} onClick={logout}>
              <FiLogOut size={14} />
              <span>Salir</span>
            </button>
          </div>
        )}
      </header>

      <main className="projects-main">
        <div className="projects-container">
          <div className="projects-toolbar">
            <h2>
              <FiFolder size={20} />
              Mis Proyectos
              {filteredProjects.length !== projects.length && (
                <span className="results-count">({filteredProjects.length} de {projects.length})</span>
              )}
            </h2>
            <div className="projects-toolbar-actions">
              {/* Search */}
              <div className="search-wrapper">
                <FiSearch size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar proyectos..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <button className="search-clear" onClick={clearSearch}>
                    <FiX size={14} />
                  </button>
                )}
              </div>
              
              <button 
                className="btn-icon"
                onClick={loadProjects}
                disabled={loading}
                title="Recargar lista"
              >
                <FiRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateForm(true)}
              >
                <FiPlus size={18} />
                <span>Nuevo Proyecto</span>
              </button>
            </div>
          </div>

          {/* Error banner mejorado */}
          {error && (
            <div className="error-banner">
              <FiAlertCircle size={18} />
              <span>{error}</span>
              <button onClick={() => setError(null)} title="Cerrar">
                <FiX size={16} />
              </button>
            </div>
          )}

          {/* Formulario de creación mejorado */}
          {showCreateForm && (
            <div className="create-project-card">
              <form onSubmit={handleCreateProject}>
                <div className="form-header">
                  <FiZap size={20} className="form-icon" />
                  <h3>Crear nuevo proyecto</h3>
                </div>
                <div className="form-field">
                  <label htmlFor="project-name">Nombre del proyecto <span className="required">*</span></label>
                  <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="Ej: Login Tests, Checkout Flow..."
                    autoFocus
                    disabled={creating}
                    maxLength={100}
                  />
                  <span className="field-hint">{projectName.length}/100 caracteres</span>
                </div>
                <div className="form-field">
                  <label htmlFor="project-description">Descripción <span className="optional">(opcional)</span></label>
                  <textarea
                    id="project-description"
                    value={projectDescription}
                    onChange={e => setProjectDescription(e.target.value)}
                    placeholder="Describe el propósito de este proyecto de pruebas..."
                    rows={3}
                    disabled={creating}
                    maxLength={500}
                  />
                </div>
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      setProjectName('');
                      setProjectDescription('');
                    }}
                    disabled={creating}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={creating || !projectName.trim()}
                  >
                    {creating ? (
                      <>
                        <FiRefreshCw size={16} className="animate-spin" />
                        <span>Creando...</span>
                      </>
                    ) : (
                      <>
                        <FiPlay size={16} />
                        <span>Crear y abrir</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de proyectos */}
          {loading && projects.length === 0 ? (
            <div className="projects-grid">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <ProjectSkeleton key={i} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="projects-empty">
              <div className="empty-icon">
                <FiFolder size={48} />
              </div>
              <h3>Comienza tu primer proyecto</h3>
              <p>Crea un proyecto para diseñar pruebas automatizadas de forma visual. Arrastra nodos, conéctalos y ejecuta tus tests.</p>
              <button 
                className="btn-primary large"
                onClick={() => setShowCreateForm(true)}
              >
                <FiPlus size={20} />
                <span>Crear primer proyecto</span>
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="projects-empty">
              <div className="empty-icon">
                <FiSearch size={48} />
              </div>
              <h3>Sin resultados</h3>
              <p>No se encontraron proyectos que coincidan con "{searchTerm}"</p>
              <button 
                className="btn-secondary"
                onClick={clearSearch}
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="projects-grid">
              {filteredProjects.map((project, index) => (
                <button 
                  key={project.id} 
                  className="project-card"
                  onClick={() => handleOpenProject(project.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenProject(project.id)}
                  tabIndex={0}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="project-card-content">
                    <div className="project-card-icon">
                      <FiFolder size={28} />
                    </div>
                    <div className="project-card-info">
                      <h3 className="project-card-title" title={project.name}>
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="project-card-description" title={project.description}>
                          {project.description}
                        </p>
                      )}
                      <div className="project-card-stats">
                        <span className="stat-badge">
                          <FiBox size={10} />
                          {project.nodes.length} nodos
                        </span>
                        <span className="stat-badge">
                          <FiGitBranch size={10} />
                          {project.edges.length} conexiones
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="project-card-footer">
                    <div className="project-card-meta">
                      <span className="project-date" title={new Date(project.updatedAt).toLocaleString()}>
                        <FiClock size={12} />
                        {formatDate(project.updatedAt)}
                      </span>
                      <span className="project-id">#{project.id.substring(0, 8)}</span>
                    </div>
                    <div className="project-card-actions">
                      <button 
                        className="btn-action open"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(project.id);
                        }}
                        title="Abrir en el editor"
                      >
                        <FiPlay size={14} />
                        <span>Abrir</span>
                      </button>
                      <button 
                        className={`btn-action delete ${deleteConfirm === project.id ? 'confirm' : ''}`}
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        title={deleteConfirm === project.id ? 'Clic para confirmar eliminación' : 'Eliminar proyecto'}
                      >
                        <FiTrash2 size={14} />
                        {deleteConfirm === project.id && <span>¿Seguro?</span>}
                      </button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProjectsPage;
