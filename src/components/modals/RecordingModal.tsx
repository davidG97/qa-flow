import { useState, useEffect, useCallback } from 'react';
import { apiService, FlowNode, FlowEdge } from '../../services/api';
import { FiVideo, FiClipboard, FiX, FiPlay, FiSquare, FiDownload, FiRefreshCw } from 'react-icons/fi';

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (nodes: FlowNode[], edges: FlowEdge[]) => void;
}

type RecordingState = 'idle' | 'starting' | 'recording' | 'processing' | 'ready' | 'error';
type ImportMode = 'record' | 'paste';

const RecordingModal = ({ isOpen, onClose, onImport }: RecordingModalProps) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [url, setUrl] = useState('https://');
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('record');
  const [pastedCode, setPastedCode] = useState('');

  // Polling para verificar estado de grabación
  useEffect(() => {
    if (state !== 'recording' || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        const status = await apiService.getRecordingStatus(sessionId);
        
        if (status.status === 'completed') {
          setState('processing');
          const result = await apiService.getRecordingNodes(sessionId);
          setGeneratedCode(result.code);
          setState('ready');
        } else if (status.status === 'error') {
          setError(status.error || 'Error en la grabación');
          setState('error');
        }
      } catch (err) {
        // Sesión aún no lista, seguir esperando
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [state, sessionId]);

  const handleStartRecording = useCallback(async () => {
    if (!url || url === 'https://') {
      setError('Por favor ingresa una URL válida');
      return;
    }

    setState('starting');
    setError(null);

    try {
      const result = await apiService.startRecording(url);
      setSessionId(result.sessionId);
      setState('recording');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error iniciando grabación');
      setState('error');
    }
  }, [url]);

  const handleStopRecording = useCallback(async () => {
    if (!sessionId) return;

    try {
      await apiService.stopRecording(sessionId);
      setState('processing');
    } catch (err) {
      // El proceso puede haber terminado naturalmente
    }
  }, [sessionId]);

  const handleImport = useCallback(async () => {
    try {
      let nodes: FlowNode[];
      let edges: FlowEdge[];

      if (importMode === 'record' && sessionId) {
        const result = await apiService.getRecordingNodes(sessionId);
        nodes = result.nodes;
        edges = result.edges;
      } else if (importMode === 'paste' && pastedCode) {
        const result = await apiService.parsePlaywrightCode(pastedCode);
        nodes = result.nodes;
        edges = result.edges;
      } else {
        setError('No hay código para importar');
        return;
      }

      onImport(nodes, edges);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error importando nodos');
    }
  }, [importMode, sessionId, pastedCode, onImport]);

  const handleClose = useCallback(() => {
    setState('idle');
    setSessionId(null);
    setError(null);
    setGeneratedCode(null);
    setPastedCode('');
    onClose();
  }, [onClose]);

  const handleParseCode = useCallback(async () => {
    if (!pastedCode.trim()) {
      setError('Por favor pega código Playwright válido');
      return;
    }

    setState('processing');
    setError(null);

    try {
      const result = await apiService.parsePlaywrightCode(pastedCode);
      if (result.nodes.length === 0) {
        setError('No se encontraron acciones en el código');
        setState('idle');
        return;
      }
      setGeneratedCode(pastedCode);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error parseando código');
      setState('error');
    }
  }, [pastedCode]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="recording-modal">
        <div className="modal-header">
          <h2><FiVideo size={20} /> Grabar / Importar Flujo</h2>
          <button className="close-btn" onClick={handleClose}><FiX size={18} /></button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${importMode === 'record' ? 'active' : ''}`}
            onClick={() => { setImportMode('record'); setState('idle'); setError(null); }}
          >
            <FiVideo size={14} /> Grabar
          </button>
          <button 
            className={`tab ${importMode === 'paste' ? 'active' : ''}`}
            onClick={() => { setImportMode('paste'); setState('idle'); setError(null); }}
          >
            <FiClipboard size={14} /> Pegar Código
          </button>
        </div>

        <div className="modal-body">
          {importMode === 'record' && (
            <>
              {state === 'idle' && (
                <div className="record-form">
                  <p className="description">
                    Playwright Codegen abrirá un navegador donde podrás interactuar con la página.
                    Todas tus acciones serán grabadas y convertidas a nodos.
                  </p>
                  <div className="form-field">
                    <label>URL inicial</label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://ejemplo.com"
                    />
                  </div>
                  <button 
                    className="btn primary"
                    onClick={handleStartRecording}
                  >
                    <FiPlay size={14} /> Iniciar Grabación
                  </button>
                </div>
              )}

              {state === 'starting' && (
                <div className="status-message">
                  <div className="spinner" />
                  <p>Iniciando Playwright Codegen...</p>
                </div>
              )}

              {state === 'recording' && (
                <div className="recording-status">
                  <div className="recording-indicator">
                    <span className="rec-dot" />
                    <span>GRABANDO</span>
                  </div>
                  <p>Interactúa con el navegador que se abrió.</p>
                  <p className="hint">Cierra el navegador cuando termines, o haz click aquí:</p>
                  <button 
                    className="btn secondary"
                    onClick={handleStopRecording}
                  >
                    <FiSquare size={14} /> Detener Grabación
                  </button>
                </div>
              )}

              {state === 'processing' && (
                <div className="status-message">
                  <div className="spinner" />
                  <p>Procesando grabación...</p>
                </div>
              )}

              {state === 'ready' && generatedCode && (
                <div className="ready-status">
                  <div className="success-icon">✓</div>
                  <p>¡Grabación completada!</p>
                  <div className="code-preview">
                    <pre>{generatedCode.slice(0, 500)}...</pre>
                  </div>
                  <button 
                    className="btn primary"
                    onClick={handleImport}
                  >
                    <FiDownload size={14} /> Importar como Nodos
                  </button>
                </div>
              )}
            </>
          )}

          {importMode === 'paste' && (
            <>
              {(state === 'idle' || state === 'error') && (
                <div className="paste-form">
                  <p className="description">
                    Pega código Playwright generado por Codegen o escrito manualmente.
                    Se convertirá automáticamente a nodos del flujo.
                  </p>
                  <div className="form-field">
                    <label>Código Playwright</label>
                    <textarea
                      value={pastedCode}
                      onChange={(e) => setPastedCode(e.target.value)}
                      placeholder={`// Ejemplo de código:
await page.goto('https://example.com');
await page.fill('#email', 'test@test.com');
await page.click('button[type="submit"]');`}
                      rows={12}
                    />
                  </div>
                  <button 
                    className="btn primary"
                    onClick={handleParseCode}
                  >
                    <FiRefreshCw size={14} /> Parsear Código
                  </button>
                </div>
              )}

              {state === 'processing' && (
                <div className="status-message">
                  <div className="spinner" />
                  <p>Parseando código...</p>
                </div>
              )}

              {state === 'ready' && (
                <div className="ready-status">
                  <div className="success-icon">✓</div>
                  <p>¡Código parseado correctamente!</p>
                  <button 
                    className="btn primary"
                    onClick={handleImport}
                  >
                    <FiDownload size={14} /> Importar como Nodos
                  </button>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="error-message">
              <FiX size={14} /> {error}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .recording-modal {
          background: #0f172a;
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 1rem;
          width: 500px;
          max-width: 90vw;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .recording-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(51, 65, 85, 0.5);
        }

        .recording-modal .modal-header h2 {
          color: #ffffff;
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .recording-modal .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.375rem;
          transition: all 150ms;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .recording-modal .close-btn:hover {
          background: rgba(51, 65, 85, 0.5);
          color: #ffffff;
        }

        .modal-tabs {
          display: flex;
          border-bottom: 1px solid rgba(51, 65, 85, 0.5);
        }

        .tab {
          flex: 1;
          padding: 0.875rem 1.25rem;
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 150ms;
          border-bottom: 2px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .tab:hover {
          background: rgba(51, 65, 85, 0.3);
          color: #94a3b8;
        }

        .tab.active {
          color: #6366f1;
          border-bottom-color: #6366f1;
        }

        .recording-modal .modal-body {
          padding: 1.5rem;
          max-height: 60vh;
          overflow-y: auto;
        }

        .description {
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.6;
          margin-bottom: 1.25rem;
        }

        .recording-modal .form-field {
          margin-bottom: 1.25rem;
        }

        .recording-modal .form-field label {
          display: block;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .recording-modal .form-field input,
        .recording-modal .form-field textarea {
          width: 100%;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 0.5rem;
          padding: 0.75rem;
          color: #f1f5f9;
          font-size: 0.875rem;
          font-family: inherit;
          transition: all 150ms;
        }

        .recording-modal .form-field textarea {
          resize: vertical;
          font-family: 'JetBrains Mono', 'Monaco', monospace;
          font-size: 0.8rem;
        }

        .recording-modal .form-field input:focus,
        .recording-modal .form-field textarea:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
        }

        .recording-modal .form-field input::placeholder,
        .recording-modal .form-field textarea::placeholder {
          color: #475569;
        }

        .recording-modal .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms;
          border: none;
          width: 100%;
        }

        .recording-modal .btn.primary {
          background: #6366f1;
          color: white;
        }

        .recording-modal .btn.primary:hover {
          background: #818cf8;
        }

        .recording-modal .btn.secondary {
          background: rgba(30, 41, 59, 0.5);
          color: #f1f5f9;
          border: 1px solid rgba(51, 65, 85, 0.5);
        }

        .recording-modal .btn.secondary:hover {
          background: rgba(51, 65, 85, 0.5);
          border-color: rgba(99, 102, 241, 0.5);
        }

        .status-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2.5rem 1.25rem;
          text-align: center;
        }

        .status-message p {
          color: #64748b;
          margin: 0;
        }

        .recording-modal .spinner {
          width: 2.5rem;
          height: 2.5rem;
          border: 3px solid rgba(51, 65, 85, 0.5);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .recording-status {
          text-align: center;
          padding: 1.25rem;
        }

        .recording-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 1.25rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 2rem;
          margin-bottom: 1.25rem;
        }

        .rec-dot {
          width: 0.75rem;
          height: 0.75rem;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse-rec 1s infinite;
        }

        @keyframes pulse-rec {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .recording-indicator span {
          color: #f87171;
          font-weight: 600;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .recording-status p {
          color: #64748b;
          margin: 0.5rem 0;
          font-size: 0.875rem;
        }

        .recording-status .hint {
          font-size: 0.8rem;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
        }

        .ready-status {
          text-align: center;
          padding: 1.25rem;
        }

        .success-icon {
          width: 3rem;
          height: 3rem;
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin: 0 auto 1rem;
        }

        .ready-status p {
          color: #22c55e;
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 1.25rem;
        }

        .code-preview {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 0.5rem;
          padding: 0.75rem;
          margin-bottom: 1.25rem;
          max-height: 150px;
          overflow: auto;
        }

        .code-preview pre {
          color: #94a3b8;
          font-size: 0.7rem;
          font-family: 'JetBrains Mono', 'Monaco', monospace;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 0.5rem;
          color: #f87171;
          font-size: 0.8rem;
          margin-top: 1rem;
        }

        /* Tab badge */
        .tab-badge {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
          font-size: 0.625rem;
          padding: 0.125rem 0.375rem;
          border-radius: 0.5rem;
          font-weight: 600;
        }

        /* Manage recordings section */
        .manage-recordings {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .manage-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .manage-stats {
          display: flex;
          gap: 1rem;
        }

        .manage-stats .stat-count {
          color: #e2e8f0;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .manage-stats .stat-size {
          color: #64748b;
          font-size: 0.875rem;
        }

        .manage-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-icon {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          color: #94a3b8;
          padding: 0.5rem;
          border-radius: 0.375rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 150ms;
        }

        .btn-icon:hover:not(:disabled) {
          background: rgba(51, 65, 85, 0.5);
          color: #f1f5f9;
        }

        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-icon .spinning {
          animation: spin 1s linear infinite;
        }

        .btn-delete-all {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 0.75rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 150ms;
        }

        .btn-delete-all:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
        }

        .btn-delete-all:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .recordings-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 300px;
          overflow-y: auto;
        }

        .recording-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 0.5rem;
          transition: all 150ms;
        }

        .recording-item:hover {
          border-color: rgba(51, 65, 85, 0.8);
        }

        .recording-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .recording-name {
          color: #e2e8f0;
          font-size: 0.8125rem;
          font-family: 'JetBrains Mono', 'Monaco', monospace;
        }

        .recording-meta {
          color: #64748b;
          font-size: 0.6875rem;
        }

        .btn-delete {
          background: none;
          border: none;
          color: #64748b;
          padding: 0.375rem;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 150ms;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-delete:hover {
          color: #f87171;
          background: rgba(239, 68, 68, 0.1);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 2.5rem 1rem;
          color: #475569;
          text-align: center;
        }

        .empty-state p {
          color: #64748b;
          font-size: 0.9375rem;
          margin: 0;
        }

        .empty-state span {
          color: #475569;
          font-size: 0.75rem;
        }

        .manage-hint {
          color: #475569;
          font-size: 0.6875rem;
          text-align: center;
          margin: 0;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(51, 65, 85, 0.3);
        }
      `}</style>
    </div>
  );
};

export default RecordingModal;
