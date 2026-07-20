import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { FiMonitor, FiLoader } from 'react-icons/fi';

interface BrowserViewProps {
  executionId: string | null;
  isRunning: boolean;
}

export const BrowserView = ({ executionId, isRunning }: BrowserViewProps) => {
  const [frame, setFrame] = useState<string | null>(null);

  useEffect(() => {
    if (!executionId || !isRunning) {
      setFrame(null);
      return;
    }

    apiService.subscribeToScreencast(executionId, (frameBase64) => {
      setFrame(frameBase64);
    });

    return () => {
      apiService.unsubscribeFromScreencast(executionId);
    };
  }, [executionId, isRunning]);

  if (!isRunning && !frame) {
    return null;
  }

  return (
    <div className="browser-view-wrapper">
      {frame ? (
        <img
          src={`data:image/jpeg;base64,${frame}`}
          alt="Browser view"
        />
      ) : (
        <div className="browser-view-loading">
          {isRunning ? (
            <>
              <FiLoader size={24} className="animate-spin" />
              <span>Conectando al navegador...</span>
            </>
          ) : (
            <>
              <FiMonitor size={24} />
              <span>No preview</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
