import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export function useBackendConnection() {
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      const connected = await apiService.checkHealth();
      setBackendConnected(connected);
      if (connected) {
        try {
          await apiService.connectWebSocket();
        } catch (error) {
          console.error('Error conectando WebSocket:', error);
        }
      }
    };
    
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    
    return () => {
      clearInterval(interval);
      apiService.disconnect();
    };
  }, []);

  return { backendConnected };
}
