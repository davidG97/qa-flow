import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCopy, FiDownload, FiCheck } from 'react-icons/fi';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  filename?: string;
}

export default function CodeViewerModal({ isOpen, onClose, code, filename = 'test.spec.ts' }: CodeViewerModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div className="code-viewer-overlay" onClick={onClose}>
      <div className="code-viewer-modal" onClick={e => e.stopPropagation()}>
        <div className="code-viewer-header">
          <h3>Código Generado</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={handleCopy}
              title="Copiar al portapapeles"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                height: '32px', padding: '0 12px',
                background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.4)'}`,
                borderRadius: '6px', color: copied ? '#86efac' : '#a5b4fc',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button 
              onClick={handleDownload}
              title="Descargar archivo"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                height: '32px', padding: '0 12px',
                background: 'rgba(99,102,241,0.2)',
                border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: '6px', color: '#a5b4fc',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <FiDownload size={14} />
              Descargar
            </button>
            <button 
              onClick={onClose} 
              title="Cerrar"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px', padding: 0,
                background: 'rgba(100,116,139,0.2)',
                border: '1px solid rgba(100,116,139,0.3)',
                borderRadius: '6px', color: '#94a3b8', cursor: 'pointer',
              }}
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
        <div className="code-viewer-content">
          <pre><code>{code}</code></pre>
        </div>
        <div className="code-viewer-footer">
          <span className="filename">{filename}</span>
        </div>
      </div>

      <style>{`
        .code-viewer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .code-viewer-modal {
          background: #1e1e2e;
          border-radius: 12px;
          width: 100%;
          max-width: 900px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .code-viewer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(99, 102, 241, 0.15);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, transparent 100%);
        }

        .code-viewer-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
        }

        .code-viewer-content {
          flex: 1;
          overflow: auto;
          padding: 1rem;
          background: #0d1117;
        }

        .code-viewer-content pre {
          margin: 0;
          font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', monospace;
          font-size: 0.8125rem;
          line-height: 1.6;
          color: #e6edf3;
          white-space: pre;
          tab-size: 2;
        }

        .code-viewer-content code {
          font-family: inherit;
        }

        .code-viewer-footer {
          padding: 0.75rem 1.25rem;
          border-top: 1px solid rgba(99, 102, 241, 0.15);
          display: flex;
          justify-content: flex-end;
        }

        .filename {
          font-size: 0.75rem;
          color: #64748b;
          font-family: monospace;
        }
      `}</style>
    </div>,
    document.body
  );
}
