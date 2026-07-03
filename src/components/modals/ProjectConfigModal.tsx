import { useState, useEffect } from 'react';
import { FiX, FiSettings, FiCpu, FiRefreshCw, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { ProjectConfig, defaultProjectConfig } from '../../types/nodes';

interface ProjectConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProjectConfig;
  onSave: (config: ProjectConfig) => void;
}

const ProjectConfigModal = ({ isOpen, onClose, config, onSave }: ProjectConfigModalProps) => {
  const [localConfig, setLocalConfig] = useState<ProjectConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig(defaultProjectConfig);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="flex items-center gap-2">
            <FiSettings size={20} />
            Configuración del Proyecto
          </h2>
          <button className="modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Sección de Paralelismo */}
          <div className="config-section">
            <h3 className="config-section-title">
              <FiCpu size={16} />
              Ejecución y Paralelismo
            </h3>
            
            <div className="config-field">
              <label>Modo de Ejecución</label>
              <select
                value={localConfig.executionMode}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  executionMode: e.target.value as ProjectConfig['executionMode']
                })}
              >
                <option value="default">Por defecto (archivos en paralelo)</option>
                <option value="parallel">Paralelo (todos los tests)</option>
                <option value="serial">Serial (secuencial)</option>
              </select>
              <span className="config-hint">
                Define cómo se ejecutan los tests dentro de cada archivo
              </span>
            </div>

            <div className="config-field">
              <label>Workers</label>
              <input
                type="number"
                min="1"
                max="32"
                value={localConfig.workers}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  workers: Math.max(1, parseInt(e.target.value) || 1)
                })}
              />
              <span className="config-hint">
                Número de procesos paralelos (recomendado: núcleos de CPU)
              </span>
            </div>

          </div>

          {/* Sección de Reintentos y Timeouts */}
          <div className="config-section">
            <h3 className="config-section-title">
              <FiRefreshCw size={16} />
              Reintentos y Límites
            </h3>

            <div className="config-field">
              <label>Reintentos en fallo</label>
              <input
                type="number"
                min="0"
                max="10"
                value={localConfig.retries}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  retries: Math.max(0, parseInt(e.target.value) || 0)
                })}
              />
              <span className="config-hint">
                Número de reintentos cuando un test falla (0 = sin reintentos)
              </span>
            </div>

            <div className="config-field">
              <label>
                <FiAlertTriangle size={14} className="inline mr-1" />
                Máximo de Fallos
              </label>
              <input
                type="number"
                min="0"
                value={localConfig.maxFailures}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  maxFailures: Math.max(0, parseInt(e.target.value) || 0)
                })}
              />
              <span className="config-hint">
                Detener ejecución después de N fallos (0 = sin límite)
              </span>
            </div>
          </div>

          {/* Sección de Timeouts */}
          <div className="config-section">
            <h3 className="config-section-title">
              <FiClock size={16} />
              Timeouts
            </h3>

            <div className="config-field">
              <label>Timeout por test (ms)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={localConfig.timeout}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  timeout: Math.max(1000, parseInt(e.target.value) || 30000)
                })}
              />
              <span className="config-hint">
                Tiempo máximo de espera por test ({localConfig.timeout / 1000}s)
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleReset}>
            Restaurar Valores
          </button>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSave}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectConfigModal;
