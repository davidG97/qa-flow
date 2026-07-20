import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { ExecutionStatus, ExecutionResult, apiService } from '../../services/api';
import { FriendlyError } from '../../utils/errorTranslator';
import { ValidationResult, ValidationIssue } from '../../utils/flowValidator';
import { BrowserView } from './BrowserView';
import { 
  FiX, FiLoader, FiCheck, FiAlertCircle, FiClock, FiFileText, 
  FiDownload, FiActivity, FiZap, FiAlertTriangle, FiInfo, FiTarget,
  FiChevronRight, FiHelpCircle, FiMonitor, FiTerminal, FiMaximize2, FiMinimize2,
  FiChevronUp, FiChevronDown
} from 'react-icons/fi';

interface ExecutionStatusWithReport extends ExecutionStatus {
  reportId?: string;
  friendlyError?: FriendlyError;
}

interface ExecutionPanelProps {
  status: ExecutionStatusWithReport | null;
  validation?: ValidationResult;
  executionId?: string | null;
  isRunning?: boolean;
  onNodeSelect?: (nodeId: string) => void;
  onMinimizeChange?: (isMinimized: boolean) => void;
}

const ExecutionPanel = ({ status, validation, executionId, isRunning = false, onNodeSelect, onMinimizeChange }: ExecutionPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [browserWidth, setBrowserWidth] = useState(55); // porcentaje
  const contentRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Handler para redimensionar
  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    setBrowserWidth(Math.min(80, Math.max(30, newWidth)));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Listeners globales para drag
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Notificar cambios de minimizado
  const handleMinimizeToggle = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    onMinimizeChange?.(newState);
  };
  
  const stats = useMemo(() => {
    if (!status) return { total: 0, passed: 0, failed: 0, totalDuration: 0, progress: 0 };
    
    const total = status.results.length;
    const passed = status.results.filter(r => r.success).length;
    const failed = status.results.filter(r => !r.success).length;
    const totalDuration = status.results.reduce((acc, r) => acc + r.duration, 0);
    const progress = status.status === 'running' ? (total / (total + 1)) * 100 : 100;
    
    return { total, passed, failed, totalDuration, progress };
  }, [status]);

  const hasValidationErrors = validation && !validation.canExecute;

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
      case 'running': return '#3b82f6';
      case 'completed': return '#22c55e';
      case 'failed': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = () => {
    if (!status) return <FiAlertTriangle size={16} />;
    switch (status.status) {
      case 'running': return <FiLoader className="animate-spin" size={16} />;
      case 'completed': return <FiCheck size={16} />;
      case 'failed': return <FiAlertCircle size={16} />;
      default: return <FiClock size={16} />;
    }
  };

  const getStatusLabel = () => {
    if (!status) return 'Validation Errors';
    switch (status.status) {
      case 'running': return 'Running...';
      case 'completed': return stats.failed === 0 ? 'Success' : 'Completed';
      case 'failed': return 'Failed';
      default: return 'Pending';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(2) + 's';
    return Math.floor(ms / 60000) + 'm ' + ((ms % 60000) / 1000).toFixed(0) + 's';
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

  const showBrowser = isRunning || status?.status === 'running';
  const hasContent = status || hasValidationErrors;
  
  // Construir clase del panel
  let panelClass = 'execution-panel-n8n';
  if (isExpanded) panelClass += ' expanded';
  if (isMinimized) panelClass += ' minimized';

  return (
    <div className={panelClass}>
      {/* Header */}
      <div className="ep-header" onClick={() => isMinimized && handleMinimizeToggle()}>
        <div className="ep-header-left">
          {hasContent ? (
            <div className="ep-status-badge" style={{ background: getStatusColor() + '20', borderColor: getStatusColor() }}>
              <span style={{ color: getStatusColor() }}>{getStatusIcon()}</span>
              <span style={{ color: getStatusColor() }}>{getStatusLabel()}</span>
            </div>
          ) : (
            <div className="ep-status-badge" style={{ background: '#64748b20', borderColor: '#64748b' }}>
              <FiMonitor size={16} style={{ color: '#64748b' }} />
              <span style={{ color: '#64748b' }}>Execution Panel</span>
            </div>
          )}
          
          {stats.total > 0 && (
            <div className="ep-stats">
              <span className="ep-stat">
                <FiZap size={12} />
                {stats.total} pasos
              </span>
              {stats.passed > 0 && (
                <span className="ep-stat success">
                  <FiCheck size={12} />
                  {stats.passed}
                </span>
              )}
              {stats.failed > 0 && (
                <span className="ep-stat error">
                  <FiX size={12} />
                  {stats.failed}
                </span>
              )}
              <span className="ep-stat">
                <FiClock size={12} />
                {formatDuration(stats.totalDuration)}
              </span>
            </div>
          )}
        </div>
        
        <div className="ep-header-right">
          {status?.reportId && (status.status === 'completed' || status.status === 'failed') && (
            <>
              <button className="ep-btn-icon" onClick={handleViewReport} title="Ver reporte">
                <FiFileText size={16} />
              </button>
              <button className="ep-btn-icon" onClick={handleDownloadReport} title="Download">
                <FiDownload size={16} />
              </button>
            </>
          )}
          {!isMinimized && (
            <button className="ep-btn-icon" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? 'Reducir' : 'Expandir'}>
              {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
            </button>
          )}
          <button className="ep-btn-icon" onClick={handleMinimizeToggle} title={isMinimized ? 'Mostrar' : 'Minimizar'}>
            {isMinimized ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Hidden content when minimized */}
      {!isMinimized && (
        <>
          {/* Progress bar */}
          {status?.status === 'running' && (
            <div className="ep-progress">
              <div className="ep-progress-bar" style={{ width: stats.progress + '%' }} />
            </div>
          )}

          {/* Main content - Split view */}
          <div className="ep-content" ref={contentRef}>
            {/* Left: Browser View */}
            <div className="ep-browser-section" style={{ width: browserWidth + '%', flex: 'none' }}>
              <div className="ep-section-header">
                <FiMonitor size={14} />
                <span>Browser</span>
              </div>
              <div className="ep-browser-container">
                {showBrowser ? (
                  <BrowserView executionId={executionId || null} isRunning={showBrowser} />
                ) : (
                  <div className="ep-browser-placeholder">
                    <FiMonitor size={32} />
                    <span>Browser view available during execution</span>
                  </div>
                )}
              </div>
            </div>

            {/* Draggable divider */}
            <div className="ep-resizer" onMouseDown={handleMouseDown} />

            {/* Right: Logs */}
            <div className="ep-logs-section">
              <div className="ep-section-header">
                <FiTerminal size={14} />
                <span>Execution Logs</span>
              </div>
              <div className="ep-logs-container">
                {/* Friendly errors */}
                {status?.friendlyError && (
                  <div className="ep-friendly-error">
                    <div className="ep-error-header">
                      <FiTarget size={14} />
                      <strong>{status.friendlyError.title}</strong>
                    </div>
                <p>{status.friendlyError.description}</p>
                {status.friendlyError.suggestions.length > 0 && (
                  <div className="ep-suggestions">
                    <span><FiHelpCircle size={11} /> Suggestions:</span>
                    <ul>
                      {status.friendlyError.suggestions.map((s, i) => (
                        <li key={i}><FiChevronRight size={10} />{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Validation */}
            {validation && validation.issues.length > 0 && !status?.friendlyError && (
              <div className="ep-validation">
                {validation.issues.filter(i => i.severity !== 'info').slice(0, 5).map((issue, idx) => (
                  <button 
                    key={idx} 
                    className={'ep-issue ' + issue.severity}
                    onClick={() => handleIssueClick(issue)}
                  >
                    <span className="ep-issue-icon">{getSeverityIcon(issue.severity)}</span>
                    <div className="ep-issue-content">
                      <span className="ep-issue-node">{issue.nodeLabel}</span>
                      <span className="ep-issue-msg">{issue.message}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {status && (
              <div className="ep-results">
                {status.results.length === 0 && status.status === 'running' && (
                  <div className="ep-empty">
                    <FiLoader className="animate-spin" size={20} />
                    <span>Starting execution...</span>
                  </div>
                )}
                
                {status.results.map((result: ExecutionResult, index: number) => (
                  <div 
                    key={'result-' + result.nodeId + '-' + index} 
                    className={'ep-result ' + (result.success ? 'success' : 'error')}
                  >
                    <div className="ep-result-num">{index + 1}</div>
                    <div className="ep-result-icon">
                      {result.success ? <FiCheck size={11} /> : <FiX size={11} />}
                    </div>
                    <div className="ep-result-info">
                      <span className="ep-result-msg">{result.message}</span>
                      <span className="ep-result-time">{formatDuration(result.duration)}</span>
                    </div>
                  </div>
                ))}

                {status.status === 'running' && status.currentNode && (
                  <div className="ep-result current">
                    <div className="ep-result-num"><FiLoader className="animate-spin" size={10} /></div>
                    <div className="ep-result-icon"><FiActivity size={11} /></div>
                    <div className="ep-result-info">
                      <span className="ep-result-msg">Processing...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state when no execution */}
            {!status && !hasValidationErrors && (
              <div className="ep-empty">
                <FiActivity size={24} />
                <span>Run a flow to see results here</span>
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default ExecutionPanel;
