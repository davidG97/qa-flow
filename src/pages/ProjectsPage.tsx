import { useState, useEffect, useCallback, SubmitEvent } from 'react';
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
  
  // Form state for project creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  // Filter projects when search term changes
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
      setError('Error loading projects. Check your connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('Project name is required');
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

      // Navigate directly to new project editor
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      setError('Error creating project');
      console.error(err);
      setCreating(false);
    }
  };

  const handleDeleteProject = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await apiService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Error deleting project');
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
        return `${diffMins} min ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    
    return date.toLocaleDateString('en-US', {
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
          <p className="projects-subtitle">Visual automated testing editor with Playwright</p>
          
          {/* Quick stats */}
          {!loading && projects.length > 0 && (
            <div className="quick-stats">
              <div className="stat">
                <FiFolder size={14} />
                <span>{projects.length} projects</span>
              </div>
              <div className="stat">
                <FiBox size={14} />
                <span>{totalNodes} nodes</span>
              </div>
              <div className="stat">
                <FiGitBranch size={14} />
                <span>{totalEdges} connections</span>
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
                  <span>Users</span>
                </Link>
                <Link to="/admin/projects" className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                  <FiLayers size={14} />
                  <span>Projects</span>
                </Link>
              </>
            )}
            <button className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }} onClick={logout}>
              <FiLogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </header>

      <main className="projects-main">
        <div className="projects-container">
          <div className="projects-toolbar">
            <h2>
              <FiFolder size={20} />
              My Projects
              {filteredProjects.length !== projects.length && (
                <span className="results-count">({filteredProjects.length} of {projects.length})</span>
              )}
            </h2>
            <div className="projects-toolbar-actions">
              {/* Search */}
              <div className="search-wrapper">
                <FiSearch size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search projects..."
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
                title="Reload list"
              >
                <FiRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateForm(true)}
              >
                <FiPlus size={18} />
                <span>New Project</span>
              </button>
            </div>
          </div>

          {/* Error banner mejorado */}
          {error && (
            <div className="error-banner">
              <FiAlertCircle size={18} />
              <span>{error}</span>
              <button onClick={() => setError(null)} title="Close">
                <FiX size={16} />
              </button>
            </div>
          )}

          {/* Improved creation form */}
          {showCreateForm && (
            <div className="create-project-card">
              <form onSubmit={handleCreateProject}>
                <div className="form-header">
                  <FiZap size={20} className="form-icon" />
                  <h3>Create new project</h3>
                </div>
                <div className="form-field">
                  <label htmlFor="project-name">Project name <span className="required">*</span></label>
                  <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="E.g.: Login Tests, Checkout Flow..."
                    autoFocus
                    disabled={creating}
                    maxLength={100}
                  />
                  <span className="field-hint">{projectName.length}/100 characters</span>
                </div>
                <div className="form-field">
                  <label htmlFor="project-description">Description <span className="optional">(optional)</span></label>
                  <textarea
                    id="project-description"
                    value={projectDescription}
                    onChange={e => setProjectDescription(e.target.value)}
                    placeholder="Describe the purpose of this test project..."
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
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={creating || !projectName.trim()}
                  >
                    {creating ? (
                      <>
                        <FiRefreshCw size={16} className="animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <FiPlay size={16} />
                        <span>Create and open</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Projects list */}
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
              <h3>Start your first project</h3>
              <p>Create a project to design automated tests visually. Drag nodes, connect them, and run your tests.</p>
              <button 
                className="btn-primary large"
                onClick={() => setShowCreateForm(true)}
              >
                <FiPlus size={20} />
                <span>Create first project</span>
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="projects-empty">
              <div className="empty-icon">
                <FiSearch size={48} />
              </div>
              <h3>No results</h3>
              <p>No projects found matching "{searchTerm}"</p>
              <button 
                className="btn-secondary"
                onClick={clearSearch}
              >
                Clear search
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
                          {project.nodes.length} nodes
                        </span>
                        <span className="stat-badge">
                          <FiGitBranch size={10} />
                          {project.edges.length} connections
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
                        title="Open in editor"
                      >
                        <FiPlay size={14} />
                        <span>Open</span>
                      </button>
                      <button 
                        className={`btn-action delete ${deleteConfirm === project.id ? 'confirm' : ''}`}
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        title={deleteConfirm === project.id ? 'Click to confirm deletion' : 'Delete project'}
                      >
                        <FiTrash2 size={14} />
                        {deleteConfirm === project.id && <span>Sure?</span>}
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
