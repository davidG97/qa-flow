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

  // Cargar proyectos al abrir
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
      setError('Error cargando proyectos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError('El nombre del proyecto es requerido');
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
      
      // Si guardamos el flujo actual, notificar que estamos trabajando con este proyecto
      if (saveCurrentFlow) {
        onLoadProject(newProject.nodes, newProject.edges, newProject.config, newProject.id);
      }
    } catch (err) {
      setError('Error creando proyecto');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject || !projectName.trim()) {
      setError('El nombre del proyecto es requerido');
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
      setError('Error actualizando proyecto');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError('Error eliminando proyecto');
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
      // Mostrar mensaje de éxito brevemente
      setError('✅ Proyecto guardado correctamente');
      setTimeout(() => setError(null), 2000);
    } catch (err) {
      setError('Error guardando en proyecto');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
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
            {viewMode === 'list' && 'Proyectos'}
            {viewMode === 'create' && 'Nuevo Proyecto'}
            {viewMode === 'edit' && 'Editar Proyecto'}
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

          {/* Vista de Lista */}
          {viewMode === 'list' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <button 
                  className="toolbar-btn success"
                  onClick={() => { resetForm(); setViewMode('create'); }}
                >
                  <FiPlus size={14} />
                  <span>Nuevo Proyecto</span>
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
                  Cargando proyectos...
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <FiFolder size={48} className="mx-auto mb-4 text-dark-600" />
                  <p className="text-dark-500 mb-4">No hay proyectos guardados</p>
                  <button 
                    className="toolbar-btn success"
                    onClick={() => { resetForm(); setViewMode('create'); }}
                  >
                    <FiPlus size={14} />
                    <span>Crear primer proyecto</span>
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
                            {project.nodes.length} nodos · {project.edges.length} conexiones
                          </span>
                        </div>
                      </div>
                      <div className="project-actions">
                        <button 
                          className="action-btn primary"
                          onClick={() => handleLoadProject(project)}
                          title="Cargar proyecto"
                        >
                          <FiDownload size={16} />
                        </button>
                        <button 
                          className="action-btn"
                          onClick={() => handleSaveCurrentToProject(project)}
                          title="Guardar flujo actual en este proyecto"
                          disabled={loading}
                        >
                          <FiUpload size={16} />
                        </button>
                        <button 
                          className="action-btn"
                          onClick={() => handleEditProject(project)}
                          title="Editar proyecto"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button 
                          className="action-btn danger"
                          onClick={() => handleDeleteProject(project.id)}
                          title="Eliminar proyecto"
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

          {/* Vista de Crear/Editar */}
          {(viewMode === 'create' || viewMode === 'edit') && (
            <div className="project-form">
              <div className="form-group">
                <label>Nombre del proyecto *</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="Mi proyecto de pruebas"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Descripción (opcional)</label>
                <textarea
                  value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)}
                  placeholder="Descripción del proyecto..."
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
                      ? 'Guardar el flujo actual del canvas' 
                      : 'Actualizar con el flujo actual del canvas'}
                  </span>
                </label>
                <span className="form-hint">
                  {saveCurrentFlow 
                    ? `Se guardarán ${currentNodes.length} nodos y ${currentEdges.length} conexiones`
                    : viewMode === 'edit' 
                      ? 'Se mantendrá el flujo existente del proyecto'
                      : 'Se creará un proyecto vacío'}
                </span>
              </div>

              <div className="form-actions">
                <button 
                  className="toolbar-btn"
                  onClick={() => { resetForm(); setViewMode('list'); }}
                >
                  Cancelar
                </button>
                <button 
                  className="toolbar-btn success"
                  onClick={viewMode === 'create' ? handleCreateProject : handleUpdateProject}
                  disabled={loading || !projectName.trim()}
                >
                  <FiSave size={14} />
                  <span>{loading ? 'Guardando...' : 'Guardar'}</span>
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
