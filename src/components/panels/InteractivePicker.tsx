import { useState, useRef, useEffect, useCallback } from 'react';
import { apiService, PickerResult } from '../../services/api';
import { FiX, FiLoader, FiMousePointer } from 'react-icons/fi';

interface InteractivePickerProps {
  sessionId: string;
  onResult: (result: PickerResult) => void;
  onCancel: () => void;
  progress: string;
}

export default function InteractivePicker({ 
  sessionId, 
  onResult, 
  onCancel,
  progress 
}: InteractivePickerProps) {
  const [frame, setFrame] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Subscribe to screencast frames
  useEffect(() => {
    apiService.subscribeToPickerFrame(sessionId, (frameBase64) => {
      setFrame(frameBase64);
    });

    return () => {
      apiService.unsubscribeFromPicker(sessionId);
    };
  }, [sessionId]);

  // Handle click on image
  const handleClick = useCallback(async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || isSelecting) return;

    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = 1280 / rect.width;  // viewport width
    const scaleY = 720 / rect.height;  // viewport height
    
    // Calculate coordinates in browser viewport space
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsSelecting(true);

    try {
      const response = await apiService.selectAtCoordinates(sessionId, x, y);
      if (response.result) {
        onResult(response.result);
      }
    } catch (error) {
      console.error('Error selecting element:', error);
      alert('No se pudo seleccionar el elemento. Intenta de nuevo.');
    } finally {
      setIsSelecting(false);
    }
  }, [sessionId, isSelecting, onResult]);

  // Track cursor position for visual feedback
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursorPos(null);
  }, []);

  return (
    <div className="interactive-picker-overlay">
      <div className="interactive-picker-container">
        {/* Header */}
        <div className="interactive-picker-header">
          <div className="header-title">
            <FiMousePointer size={18} />
            <span>Selector Visual</span>
          </div>
          <button className="close-btn" onClick={onCancel} title="Cancelar">
            <FiX size={20} />
          </button>
        </div>

        {/* Progress or Instructions */}
        <div className="interactive-picker-status">
          {!frame ? (
            <>
              <FiLoader className="spinner" size={16} />
              <span>{progress || 'Preparando vista...'}</span>
            </>
          ) : isSelecting ? (
            <>
              <FiLoader className="spinner" size={16} />
              <span>Seleccionando elemento...</span>
            </>
          ) : (
            <span>🎯 Click sobre el elemento que deseas seleccionar</span>
          )}
        </div>

        {/* Screencast view */}
        <div className="interactive-picker-view">
          {frame ? (
            <img
              ref={imgRef}
              src={`data:image/jpeg;base64,${frame}`}
              alt="Vista del navegador"
              onClick={handleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className={isSelecting ? 'selecting' : ''}
              draggable={false}
            />
          ) : (
            <div className="loading-placeholder">
              <FiLoader className="spinner" size={32} />
              <p>Cargando vista del navegador...</p>
            </div>
          )}
          
          {/* Cursor crosshair */}
          {cursorPos && frame && !isSelecting && (
            <div 
              className="cursor-indicator"
              style={{ 
                left: cursorPos.x, 
                top: cursorPos.y 
              }}
            />
          )}
        </div>

        {/* Footer hint */}
        <div className="interactive-picker-footer">
          <kbd>Click</kbd> para seleccionar • <kbd>ESC</kbd> para cancelar
        </div>
      </div>

      <style>{`
        .interactive-picker-overlay {
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

        .interactive-picker-container {
          background: var(--color-surface, #1a1a2e);
          border-radius: 12px;
          overflow: hidden;
          max-width: 1320px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .interactive-picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--color-surface-elevated, #252542);
          border-bottom: 1px solid var(--color-border, #333);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: var(--color-text, #fff);
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--color-text-muted, #888);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .close-btn:hover {
          color: var(--color-text, #fff);
          background: rgba(255, 255, 255, 0.1);
        }

        .interactive-picker-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--color-primary, #6366f1);
          color: white;
          font-size: 14px;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .interactive-picker-view {
          position: relative;
          flex: 1;
          min-height: 400px;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .interactive-picker-view img {
          max-width: 100%;
          max-height: 100%;
          cursor: crosshair;
          transition: opacity 0.2s;
        }

        .interactive-picker-view img.selecting {
          cursor: wait;
          opacity: 0.7;
        }

        .loading-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--color-text-muted, #888);
        }

        .cursor-indicator {
          position: absolute;
          width: 20px;
          height: 20px;
          border: 2px solid #6366f1;
          border-radius: 50%;
          pointer-events: none;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
        }

        .cursor-indicator::before,
        .cursor-indicator::after {
          content: '';
          position: absolute;
          background: #6366f1;
        }

        .cursor-indicator::before {
          width: 1px;
          height: 30px;
          left: 50%;
          top: -5px;
          transform: translateX(-50%);
        }

        .cursor-indicator::after {
          width: 30px;
          height: 1px;
          top: 50%;
          left: -5px;
          transform: translateY(-50%);
        }

        .interactive-picker-footer {
          padding: 10px 16px;
          text-align: center;
          font-size: 12px;
          color: var(--color-text-muted, #888);
          background: var(--color-surface-elevated, #252542);
          border-top: 1px solid var(--color-border, #333);
        }

        .interactive-picker-footer kbd {
          background: var(--color-surface, #1a1a2e);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid var(--color-border, #444);
          font-family: monospace;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}
