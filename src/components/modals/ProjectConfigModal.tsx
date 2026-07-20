import { useState, useEffect } from 'react';
import { FiX, FiSettings, FiCpu, FiRefreshCw, FiClock, FiAlertTriangle, FiMonitor } from 'react-icons/fi';
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
            Project Configuration
          </h2>
          <button className="modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Parallelism Section */}
          <div className="config-section">
            <h3 className="config-section-title">
              <FiCpu size={16} />
              Execution and Parallelism
            </h3>
            
            <div className="config-field">
              <label>Execution Mode</label>
              <select
                value={localConfig.executionMode}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  executionMode: e.target.value as ProjectConfig['executionMode']
                })}
              >
                <option value="default">Default (files in parallel)</option>
                <option value="parallel">Parallel (all tests)</option>
                <option value="serial">Serial (sequential)</option>
              </select>
              <span className="config-hint">
                Defines how tests run within each file
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
                Number of parallel processes (recommended: CPU cores)
              </span>
            </div>

          </div>

          {/* Retries and Timeouts Section */}
          <div className="config-section">
            <h3 className="config-section-title">
              <FiRefreshCw size={16} />
              Retries and Limits
            </h3>

            <div className="config-field">
              <label>Retries on failure</label>
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
                Number of retries when a test fails (0 = no retries)
              </span>
            </div>

            <div className="config-field">
              <label>
                <FiAlertTriangle size={14} className="inline mr-1" />
                Maximum Failures
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
                Stop execution after N failures (0 = no limit)
              </span>
            </div>
          </div>

          {/* Timeouts Section */}
          <div className="config-section">
            <h3 className="config-section-title">
              <FiClock size={16} />
              Timeouts
            </h3>

            <div className="config-field">
              <label>Timeout per test (ms)</label>
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
                Maximum wait time per test ({localConfig.timeout / 1000}s)
              </span>
            </div>
          </div>

          {/* Visualization Section */}
          <div className="config-section">
            <h3 className="config-section-title">
              <FiMonitor size={16} />
              Real-Time View
            </h3>

            <div className="config-field">
              <label>CDP URL (optional)</label>
              <input
                type="text"
                placeholder="http://localhost:9222"
                value={localConfig.cdpUrl || ''}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  cdpUrl: e.target.value
                })}
              />
              <span className="config-hint">
                Connect to a Chrome with --remote-debugging-port=9222 to view execution in your browser
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleReset}>
            Reset Values
          </button>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectConfigModal;
