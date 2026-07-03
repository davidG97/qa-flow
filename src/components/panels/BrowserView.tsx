import { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import { FiMonitor, FiLoader } from 'react-icons/fi';

interface BrowserViewProps {
  executionId: string | null;
  isRunning: boolean;
}

export const BrowserView = ({ executionId, isRunning }: BrowserViewProps) => {
  const [frame, setFrame] = useState<string | null>(null);
  const [hasReceivedFrame, setHasReceivedFrame] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!executionId || !isRunning) {
      setFrame(null);
      setHasReceivedFrame(false);
      return;
    }

    // Suscribirse a frames de screencast
    apiService.subscribeToScreencast(executionId, (frameBase64) => {
      setFrame(frameBase64);
      setHasReceivedFrame(true);
    });

    return () => {
      apiService.unsubscribeFromScreencast(executionId);
    };
  }, [executionId, isRunning]);

  // Si no está corriendo y no hay frames, no mostrar nada
  if (!isRunning && !frame) {
    return null;
  }

  return (
    <div className="border-t border-zinc-700 bg-zinc-900">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700 bg-zinc-800/50">
        <FiMonitor size={14} className="text-indigo-400" />
        <span className="text-xs font-medium text-zinc-300">Vista del navegador</span>
        {isRunning && !hasReceivedFrame && (
          <FiLoader size={12} className="animate-spin text-zinc-500 ml-auto" />
        )}
      </div>
      
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {frame ? (
          <img
            ref={imgRef}
            src={`data:image/jpeg;base64,${frame}`}
            alt="Browser view"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-zinc-600 text-sm flex flex-col items-center gap-2">
            {isRunning ? (
              <>
                <FiLoader size={24} className="animate-spin" />
                <span>Conectando al navegador...</span>
              </>
            ) : (
              <>
                <FiMonitor size={24} />
                <span>Sin vista previa</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
