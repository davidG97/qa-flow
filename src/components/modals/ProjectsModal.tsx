import { useState, useEffect } from 'react';
import { apiService, ProjectDTO, FlowNode, FlowEdge, ProjectConfig } from '../../services/api';
import { 
  FiFolder, 
  FiX, 
  FiPlus, 
  FiTrash2, 
  FiDownload, 
  FiUpload,
  FiClock,
  FiEdit2,
  FiSave,
  FiRefreshCw
} from 'react-icons/fi';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNodes: FlowNode[];
  currentEdges: FlowEdge[];
  currentConfig?: ProjectConfig;
  onLoadProject: (nodes: FlowNode[], edges: FlowEdge[], config?: ProjectConfig, projectId?: string) => void;
}

type ViewMode = 'list' | 'create' | 'edit';

const ProjectsModal = ({ 
  isOpen, 
  onClose, 
  currentNodes, 
  currentEdges, 
  currentConfig,
  onLoadProject 
}: ProjectsModalProps) => {
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProject, setSelectedProject] = useState<ProjectDTO | null>(null);
  
  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [saveCurrentFlow, setSaveCurrentFlow] = useState(true);

  // Load projects on open
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getProjects();
      setProjects(data);
    } catch (err) {
      setError('Error loading projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const newProject = await apiService.createProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        nodes: saveCurrentFlow ? currentNodes : [],
        edges: saveCurrentFlow ? currentEdges : [],
        config: saveCurrentFlow ? currentConfig : undefined,
      });

      setProjects(prev => [newProject, ...prev]);
      setProjectName('');
      setProjectDescription('');
      setViewMode('list');
      
      // If saving current flow, notify that we're working with this project
      if (saveCurrentFlow) {
        onLoadProject(newProject.nodes, newProject.edges, newProject.config, newProject.id);
      }
    } catch (err) {
      setError('Error creating project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updatedProject = await apiService.updateProject(selectedProject.id, {
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        nodes: saveCurrentFlow ? currentNodes : selectedProject.nodes,
        edges: saveCurrentFlow ? currentEdges : selectedProject.edges,
        config: saveCurrentFlow ? currentConfig : selectedProject.config,
      });

      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      setSelectedProject(null);
      setProjectName('');
      setProjectDescription('');
      setViewMode('list');
    } catch (err) {
      setError('Error updating project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError('Error deleting project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProject = (project: ProjectDTO) => {
    onLoadProject(project.nodes, project.edges, project.config, project.id);
    onClose();
  };

  const handleEditProject = (project: ProjectDTO) => {
    setSelectedProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || '');
    setSaveCurrentFlow(false);
    setViewMode('edit');
  };

  const handleSaveCurrentToProject = async (project: ProjectDTO) => {
    setLoading(true);
    setError(null);
    try {
      const updatedProject = await apiService.updateProject(project.id, {
        nodes: currentNodes,
        edges: currentEdges,
        config: currentConfig,
      });
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      setError(null);
      // Show success message briefly
      setError('✅ Project saved successfully');
      setTimeout(() => setError(null), 2000);
    } catch (err) {
      setError('Error saving to project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const resetForm = () => {
    setProjectName('');
    setProjectDescription('');
    setSaveCurrentFlow(true);
    setSelectedProject(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content projects-modal" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '700px', maxHeight: '80vh' }}
      >
        <div className="modal-header">
          <h2 className="flex items-center gap-2">
            <FiFolder size={20} />
            {viewMode === 'list' && 'Projects'}
            {viewMode === 'create' && 'New Project'}
            {viewMode === 'edit' && 'Edit Project'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ overflow: 'auto', maxHeight: 'calc(80vh - 120px)' }}>
          {error && (
            <div className={`error-message ${error.startsWith('✅') ? 'success' : ''}`} style={{ 
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              background: error.startsWith('✅') 
                ? 'rgba(34, 197, 94, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)',
              color: error.startsWith('✅') ? '#22c55e' : '#ef4444',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <button 
                  className="toolbar-btn success"
                  onClick={() => { resetForm(); setViewMode('create'); }}
                >
                  <FiPlus size={14} />
                  <span>New Project</span>
                </button>
                <button 
                  className="toolbar-btn"
                  onClick={loadProjects}
                  disabled={loading}
                >
                  <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {loading && projects.length === 0 ? (
                <div className="text-center py-8 text-dark-500">
                  Loading projects...
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <FiFolder size={48} className="mx-auto mb-4 text-dark-600" />
                  <p className="text-dark-500 mb-4">No saved projects</p>
                  <button 
                    className="toolbar-btn success"
                    onClick={() => { resetForm(); setViewMode('create'); }}
                  >
                    <FiPlus size={14} />
                    <span>Create first project</span>
                  </button>
                </div>
              ) : (
                <div className="projects-list">
                  {projects.map(project => (
                    <div key={project.id} className="project-card">
                      <div className="project-info">
                        <h3 className="project-name">{project.name}</h3>
                        {project.description && (
                          <p className="project-description">{project.description}</p>
                        )}
                        <div className="project-meta">
                          <span className="flex items-center gap-1">
                            <FiClock size={12} />
                            {formatDate(project.updatedAt)}
                          </span>
                          <span className="project-stats">
                            {project.nodes.length} nodes · {project.edges.length} connections
                          </span>
                        </div>
                      </div>
                      <div className="project-actions">
                        <button 
                          className="action-btn primary"
                          onClick={() => handleLoadProject(project)}
                          title="Load project"
                        >
                          <FiDownload size={16} />
                        </button>
                        <button 
                          className="action-btn"
                          onClick={() => handleSaveCurrentToProject(project)}
                          title="Save current flow to this project"
                          disabled={loading}
                        >
                          <FiUpload size={16} />
                        </button>
                        <button 
                          className="action-btn"
                          onClick={() => handleEditProject(project)}
                          title="Edit project"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button 
                          className="action-btn danger"
                          onClick={() => handleDeleteProject(project.id)}
                          title="Delete project"
                          disabled={loading}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Create/Edit View */}
          {(viewMode === 'create' || viewMode === 'edit') && (
            <div className="project-form">
              <div className="form-group">
                <label>Project name *</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="My test project"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)}
                  placeholder="Project description..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={saveCurrentFlow}
                    onChange={e => setSaveCurrentFlow(e.target.checked)}
                  />
                  <span>
                    {viewMode === 'create' 
                      ? 'Save current canvas flow' 
                      : 'Update with current canvas flow'}
                  </span>
                </label>
                <span className="form-hint">
                  {saveCurrentFlow 
                    ? `Will save ${currentNodes.length} nodes and ${currentEdges.length} connections`
                    : viewMode === 'edit' 
                      ? 'Will keep existing project flow'
                      : 'Will create an empty project'}
                </span>
              </div>

              <div className="form-actions">
                <button 
                  className="toolbar-btn"
                  onClick={() => { resetForm(); setViewMode('list'); }}
                >
                  Cancel
                </button>
                <button 
                  className="toolbar-btn success"
                  onClick={viewMode === 'create' ? handleCreateProject : handleUpdateProject}
                  disabled={loading || !projectName.trim()}
                >
                  <FiSave size={14} />
                  <span>{loading ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsModal;
