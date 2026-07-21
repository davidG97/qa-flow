import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiService, PickerResult } from '../../services/api';
import { FiX, FiLoader } from 'react-icons/fi';

interface HoverInfo {
  selector: string;
  tagName: string;
  rect: { x: number; y: number; width: number; height: number };
  inShadowDOM?: boolean;
}

interface InteractivePickerProps {
  sessionId: string;
  onResult: (result: PickerResult) => void;
  onCancel: () => void;
}

export default function InteractivePicker({ 
  sessionId, 
  onResult, 
  onCancel,
}: InteractivePickerProps) {
  const [frame, setFrame] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const pickerView = () => {
    if (error) {
      return (
        <div className="error-placeholder">
          <p>{error}</p>
          <button onClick={onCancel}>Close</button>
        </div>
      );
    } else if (frame) {
      return (
        <>
            <img
                ref={imgRef}
                src={`data:image/jpeg;base64,${frame}`}
                alt="Browser view"
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className={isSelecting ? 'selecting' : ''}
                draggable={false}
            />
            {/* Hover highlight overlay */}
            {hoverInfo && (
            <>
                <div 
                className="picker-highlight"
                style={getHighlightStyle()}
                />
                <div className="picker-tooltip">
                {hoverInfo.inShadowDOM && <span className="shadow-badge">Shadow DOM</span>}
                <code>{hoverInfo.selector}</code>
                <span className="tag-name">&lt;{hoverInfo.tagName}&gt;</span>
                </div>
            </>
            )}
        </>
      );
    } else {
      return (
        <div className="loading-placeholder">
          <FiLoader className="spinner" size={32} />
          <p>Loading browser view...</p>
        </div>
      );
    }
  }

  // Subscribe to screencast frames
  useEffect(() => {
    mountedRef.current = true;
    setFrame(null);
    setError(null);
    
    console.log('[InteractivePicker] Subscribing to session:', sessionId);
    
    // Use a stable callback that checks if still mounted
    const frameCallback = (frameBase64: string) => {
      if (!mountedRef.current) return;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setFrame(frameBase64);
    };
    
    apiService.subscribeToPickerFrame(sessionId, frameCallback);

    // Set timeout for no frames
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('[InteractivePicker] No frames received, timeout');
        setError('No frames received. Please try again.');
      }
    }, 15000);

    return () => {
      console.log('[InteractivePicker] Cleanup session:', sessionId);
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Don't unsubscribe immediately - let it persist for reconnection
      // apiService.unsubscribeFromPicker(sessionId);
    };
  }, [sessionId]);

  // Native wheel handler for scroll (passive: false required for preventDefault)
  useEffect(() => {
    const viewEl = viewRef.current;
    if (!viewEl) return;

    const handleWheel = async (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!imgRef.current || !frame) return;

      const rect = imgRef.current.getBoundingClientRect();
      const scaleX = 1280 / rect.width;
      const scaleY = 720 / rect.height;
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      try {
        await apiService.scrollPicker(sessionId, x, y, e.deltaY);
      } catch (err) {
        console.error('Error scrolling:', err);
      }
    };

    viewEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewEl.removeEventListener('wheel', handleWheel);
  }, [sessionId, frame]);

  // ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

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
      alert('Could not select element. Please try again.');
    } finally {
      setIsSelecting(false);
    }
  }, [sessionId, isSelecting, onResult]);

  // Handle mousemove for hover highlight (debounced)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || isSelecting) return;

    // Clear previous timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Debounce hover calls (50ms)
    hoverTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await apiService.hoverAtCoordinates(sessionId, x, y);
        if (mountedRef.current && response.result) {
          setHoverInfo(response.result);
        }
      } catch {
        // Ignore hover errors silently
      }
    }, 50);
  }, [sessionId, isSelecting]);

  // Clear hover on mouse leave
  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoverInfo(null);
  }, []);

  // Cleanup hover timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Calculate highlight position scaled to display size
  const getHighlightStyle = useCallback(() => {
    if (!hoverInfo || !imgRef.current) return { display: 'none' };
    
    const imgRect = imgRef.current.getBoundingClientRect();
    const scaleX = imgRect.width / 1280;
    const scaleY = imgRect.height / 720;
    
    return {
      display: 'block',
      left: hoverInfo.rect.x * scaleX,
      top: hoverInfo.rect.y * scaleY,
      width: hoverInfo.rect.width * scaleX,
      height: hoverInfo.rect.height * scaleY,
    };
  }, [hoverInfo]);

  return createPortal(
    <div className="interactive-picker-overlay">
      <div className="interactive-picker-container">
        {/* Close button - floating outside image area */}
        <button className="picker-close-btn" onClick={onCancel} title="Cancel (ESC)">
          <FiX size={20} />
        </button>

        {/* Screencast view */}
        <div className="interactive-picker-view" ref={viewRef}>
          {pickerView()}
        </div>

        {/* Footer hint */}
        <div className="interactive-picker-footer">
          <kbd>Click</kbd> select • <kbd>Scroll</kbd> navigate • <kbd>ESC</kbd> cancel
        </div>
      </div>

      <style>{`
        .interactive-picker-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
        }

        .interactive-picker-container {
          position: relative;
          background: var(--color-surface, #1a1a2e);
          border-radius: 12px;
          overflow: hidden;
          max-width: 1320px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          user-select: none;
        }

        .picker-close-btn {
          position: absolute;
          top: -40px;
          right: 0;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.15s;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .picker-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
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

        .picker-highlight {
          position: absolute;
          border: 2px solid #22c55e;
          background: rgba(34, 197, 94, 0.15);
          pointer-events: none;
          border-radius: 2px;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
        }

        .picker-tooltip {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e1e2e;
          color: #fff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: 90%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          pointer-events: none;
          z-index: 10;
        }

        .picker-tooltip code {
          font-family: 'SF Mono', Monaco, monospace;
          color: #22c55e;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .picker-tooltip .tag-name {
          color: #888;
          font-size: 10px;
        }

        .picker-tooltip .shadow-badge {
          background: #6366f1;
          color: #fff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .loading-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--color-text-muted, #888);
        }

        .error-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #f87171;
        }

        .error-placeholder button {
          padding: 8px 16px;
          background: var(--color-primary, #6366f1);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .interactive-picker-footer {
          padding: 8px 16px;
          text-align: center;
          font-size: 11px;
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
          font-size: 10px;
        }
      `}</style>
    </div>,
    document.body
  );
}
