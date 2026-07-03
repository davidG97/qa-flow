import { useMemo } from 'react';
import { ExecutionStatus, ExecutionResult, apiService } from '../../services/api';
import { FriendlyError } from '../../utils/errorTranslator';
import { ValidationResult, ValidationIssue } from '../../utils/flowValidator';
import { 
  FiX, FiLoader, FiCheck, FiAlertCircle, FiClock, FiFileText, 
  FiDownload, FiActivity, FiZap, FiAlertTriangle, FiInfo, FiTarget,
  FiChevronRight, FiHelpCircle
} from 'react-icons/fi';

interface ExecutionStatusWithReport extends ExecutionStatus {
  reportId?: string;
  friendlyError?: FriendlyError;
}

interface ExecutionPanelProps {
  status: ExecutionStatusWithReport | null;
  validation?: ValidationResult;
  onClose: () => void;
  onNodeSelect?: (nodeId: string) => void;
}

const ExecutionPanel = ({ status, validation, onClose, onNodeSelect }: ExecutionPanelProps) => {
  // Calcular estadísticas - antes del return condicional para cumplir reglas de hooks
  const stats = useMemo(() => {
    if (!status) return { total: 0, passed: 0, failed: 0, totalDuration: 0, progress: 0 };
    
    const total = status.results.length;
    const passed = status.results.filter(r => r.success).length;
    const failed = status.results.filter(r => !r.success).length;
    const totalDuration = status.results.reduce((acc, r) => acc + r.duration, 0);
    const progress = status.status === 'running' ? (total / (total + 1)) * 100 : 100;
    
    return { total, passed, failed, totalDuration, progress };
  }, [status]);

  // Mostrar panel si hay status o hay errores de validación
  const hasValidationErrors = validation && !validation.canExecute;
  
  if (!status && !hasValidationErrors) return null;

  const handleViewReport = () => {
    if (status?.reportId) {
      apiService.openReportHtml(status.reportId);
    }
  };

  const handleDownloadReport = () => {
    if (status?.reportId) {
      apiService.downloadReport(status.reportId);
    }
  };

  const getStatusColor = () => {
    if (!status) return '#64748b';
    switch (status.status) {
      case 'running': return '#6366f1';
      case 'completed': return '#22c55e';
      case 'failed': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = () => {
    if (!status) return <FiAlertTriangle size={14} />;
    switch (status.status) {
      case 'running': return <FiLoader className="animate-spin" size={14} />;
      case 'completed': return <FiCheck size={14} />;
      case 'failed': return <FiAlertCircle size={14} />;
      default: return <FiClock size={14} />;
    }
  };

  const getStatusLabel = () => {
    if (!status) return 'Errores de validación';
    switch (status.status) {
      case 'running': return 'Ejecutando prueba...';
      case 'completed': return stats.failed === 0 ? '¡Prueba exitosa!' : 'Completado con errores';
      case 'failed': return 'Ejecución fallida';
      default: return 'Pendiente';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
  };

  const getSeverityIcon = (severity: ValidationIssue['severity']) => {
    switch (severity) {
      case 'error': return <FiAlertCircle size={12} />;
      case 'warning': return <FiAlertTriangle size={12} />;
      case 'info': return <FiInfo size={12} />;
    }
  };

  const handleIssueClick = (issue: ValidationIssue) => {
    if (onNodeSelect && issue.nodeId !== 'flow') {
      onNodeSelect(issue.nodeId);
    }
  };

  return (
    <div className="execution-panel">
      {/* Header */}
      <div className="execution-header">
        <div className="execution-title">
          <FiActivity size={16} className="title-icon" />
          <span>{status ? 'Resultados' : 'Validación'}</span>
        </div>
        <button className="close-btn" onClick={onClose} title="Cerrar">
          <FiX size={16} />
        </button>
      </div>

      {/* Progress bar */}
      {status?.status === 'running' && (
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${stats.progress}%` }} />
        </div>
      )}

      {/* Status badge y stats */}
      {status && (
        <div className="execution-stats">
          <div className="status-badge" style={{ borderColor: getStatusColor() }}>
            <span className="status-icon" style={{ color: getStatusColor() }}>{getStatusIcon()}</span>
            <span className="status-text" style={{ color: getStatusColor() }}>{getStatusLabel()}</span>
          </div>
          
          {stats.total > 0 && (
            <div className="stats-row">
              <div className="stat-item">
                <FiZap size={12} />
                <span>{stats.total} pasos</span>
              </div>
              {stats.passed > 0 && (
                <div className="stat-item success">
                  <FiCheck size={12} />
                  <span>{stats.passed} ok</span>
                </div>
              )}
              {stats.failed > 0 && (
                <div className="stat-item error">
                  <FiX size={12} />
                  <span>{stats.failed} error</span>
                </div>
              )}
              <div className="stat-item">
                <FiClock size={12} />
                <span>{formatDuration(stats.totalDuration)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Errores amigables - NUEVA SECCIÓN */}
      {status?.friendlyError && (
        <div className="friendly-error">
          <div className="friendly-error-header">
            <FiTarget size={16} />
            <strong>{status.friendlyError.title}</strong>
          </div>
          <p className="friendly-error-desc">{status.friendlyError.description}</p>
          
          {status.friendlyError.suggestions.length > 0 && (
            <div className="friendly-suggestions">
              <span className="suggestions-label">
                <FiHelpCircle size={12} /> ¿Qué puedo hacer?
              </span>
              <ul>
                {status.friendlyError.suggestions.map((suggestion, i) => (
                  <li key={i}>
                    <FiChevronRight size={10} />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Validación - mostrar si hay issues */}
      {validation && validation.issues.length > 0 && !status?.friendlyError && (
        <div className="validation-section">
          <div className="validation-header">
            <span className="validation-title">
              {validation.summary.errors > 0 && (
                <span className="validation-count error">{validation.summary.errors} errores</span>
              )}
              {validation.summary.warnings > 0 && (
                <span className="validation-count warning">{validation.summary.warnings} avisos</span>
              )}
            </span>
          </div>
          <div className="validation-issues">
            {validation.issues
              .filter(i => i.severity !== 'info')
              .slice(0, 5)
              .map((issue, idx) => (
              <button 
                key={idx} 
                className={`validation-issue ${issue.severity}`}
                onClick={() => handleIssueClick(issue)}
                tabIndex={0}
              >
                <span className="issue-icon">{getSeverityIcon(issue.severity)}</span>
                <div className="issue-content">
                  <span className="issue-node">{issue.nodeLabel}</span>
                  <span className="issue-message">{issue.message}</span>
                  {issue.suggestion && (
                    <span className="issue-suggestion">{issue.suggestion}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de resultados */}
      {status && (
        <div className="execution-results">
          {status.results.length === 0 && status.status === 'running' && (
            <div className="empty-results">
              <FiLoader className="animate-spin" size={24} />
              <p>Iniciando ejecución...</p>
            </div>
          )}
          
          {status.results.map((result: ExecutionResult, index: number) => (
            <div 
              key={`result-${result.nodeId}-${index}`} 
              className={`result-item ${result.success ? 'success' : 'error'}`}
            >
              <div className="result-number">{index + 1}</div>
              <div className="result-icon">
                {result.success ? <FiCheck size={12} /> : <FiX size={12} />}
              </div>
              <div className="result-info">
                <span className="result-message">{result.message}</span>
                <span className="result-duration">{formatDuration(result.duration)}</span>
              </div>
            </div>
          ))}

          {status.status === 'running' && status.currentNode && (
            <div className="result-item current">
              <div className="result-number">
                <FiLoader className="animate-spin" size={10} />
              </div>
              <div className="result-icon">
                <FiActivity size={12} />
              </div>
              <div className="result-info">
                <span className="result-message">Procesando...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Acciones de reporte */}
      {status && (status.status === 'completed' || status.status === 'failed') && status.reportId && (
        <div className="report-actions">
          <button className="report-btn primary" onClick={handleViewReport}>
            <FiFileText size={14} />
            <span>Ver Reporte</span>
          </button>
          <button className="report-btn secondary" onClick={handleDownloadReport}>
            <FiDownload size={14} />
          </button>
        </div>
      )}

      <style>{`
        .execution-panel {
          position: fixed;
          bottom: 1.25rem;
          right: 23.5rem;
          width: 22rem;
          max-height: 480px;
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          z-index: 1000;
          animation: slideUp 0.3s ease-out;
          display: flex;
          flex-direction: column;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .execution-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, transparent 100%);
          border-bottom: 1px solid rgba(99, 102, 241, 0.15);
        }

        .execution-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        .title-icon { color: #6366f1; }

        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.375rem;
          border-radius: 0.375rem;
          transition: all 150ms;
        }

        .close-btn:hover {
          background: rgba(99, 102, 241, 0.15);
          color: #f1f5f9;
        }

        .progress-bar-container {
          height: 3px;
          background: rgba(99, 102, 241, 0.1);
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
          transition: width 0.3s ease-out;
        }

        .execution-stats {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(51, 65, 85, 0.3);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.75rem;
          border: 1px solid;
          border-radius: 2rem;
          background: rgba(30, 41, 59, 0.5);
          margin-bottom: 0.5rem;
        }

        .status-icon { display: flex; }
        .status-text { font-size: 0.75rem; font-weight: 600; }

        .stats-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          color: #94a3b8;
        }

        .stat-item.success { color: #22c55e; }
        .stat-item.error { color: #ef4444; }

        /* Errores amigables */
        .friendly-error {
          padding: 0.875rem 1rem;
          background: rgba(239, 68, 68, 0.08);
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
        }

        .friendly-error-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #f87171;
          margin-bottom: 0.5rem;
        }

        .friendly-error-header strong {
          font-size: 0.8125rem;
        }

        .friendly-error-desc {
          color: #fca5a5;
          font-size: 0.75rem;
          line-height: 1.5;
          margin-bottom: 0.75rem;
        }

        .friendly-suggestions {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 0.5rem;
          padding: 0.625rem;
        }

        .suggestions-label {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: #94a3b8;
          font-size: 0.6875rem;
          font-weight: 600;
          margin-bottom: 0.375rem;
        }

        .friendly-suggestions ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .friendly-suggestions li {
          display: flex;
          align-items: flex-start;
          gap: 0.375rem;
          color: #cbd5e1;
          font-size: 0.6875rem;
          line-height: 1.4;
          padding: 0.25rem 0;
        }

        .friendly-suggestions li svg {
          color: #6366f1;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        /* Validación */
        .validation-section {
          border-bottom: 1px solid rgba(51, 65, 85, 0.3);
        }

        .validation-header {
          padding: 0.625rem 1rem;
          background: rgba(245, 158, 11, 0.08);
        }

        .validation-count {
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 0.125rem 0.5rem;
          border-radius: 1rem;
          margin-right: 0.375rem;
        }

        .validation-count.error {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .validation-count.warning {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }

        .validation-issues {
          max-height: 140px;
          overflow-y: auto;
        }

        .validation-issue {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: background 150ms;
        }

        .validation-issue:hover {
          background: rgba(51, 65, 85, 0.3);
        }

        .validation-issue.error .issue-icon { color: #f87171; }
        .validation-issue.warning .issue-icon { color: #fbbf24; }
        .validation-issue.info .issue-icon { color: #60a5fa; }

        .issue-icon {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .issue-content {
          flex: 1;
          min-width: 0;
        }

        .issue-node {
          display: block;
          font-size: 0.6875rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .issue-message {
          display: block;
          font-size: 0.75rem;
          color: #e2e8f0;
        }

        .issue-suggestion {
          display: block;
          font-size: 0.625rem;
          color: #64748b;
          margin-top: 0.125rem;
        }

        /* Resultados */
        .execution-results {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .empty-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem;
          color: #64748b;
        }

        .empty-results p { font-size: 0.8125rem; }

        .result-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.625rem;
          margin-bottom: 0.375rem;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 0.5rem;
          border-left: 2px solid transparent;
        }

        .result-item.success { border-left-color: #22c55e; }
        .result-item.error { border-left-color: #ef4444; }
        .result-item.current { border-left-color: #6366f1; background: rgba(99, 102, 241, 0.1); }

        .result-number {
          width: 1.125rem;
          height: 1.125rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.5625rem;
          font-weight: 700;
          color: #64748b;
          background: rgba(51, 65, 85, 0.5);
          border-radius: 0.25rem;
        }

        .result-icon {
          width: 1.25rem;
          height: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .result-item.success .result-icon { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
        .result-item.error .result-icon { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .result-item.current .result-icon { background: rgba(99, 102, 241, 0.15); color: #6366f1; }

        .result-info {
          flex: 1;
          min-width: 0;
        }

        .result-message {
          display: block;
          color: #e2e8f0;
          font-size: 0.75rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .result-duration {
          font-size: 0.625rem;
          color: #64748b;
        }

        /* Acciones de reporte */
        .report-actions {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-top: 1px solid rgba(51, 65, 85, 0.3);
        }

        .report-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 150ms;
        }

        .report-btn.primary {
          flex: 1;
          background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
          color: white;
        }

        .report-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .report-btn.secondary {
          background: rgba(51, 65, 85, 0.5);
          color: #e2e8f0;
        }

        .report-btn.secondary:hover {
          background: rgba(51, 65, 85, 0.7);
        }
      `}</style>
    </div>
  );
};

export default ExecutionPanel;
