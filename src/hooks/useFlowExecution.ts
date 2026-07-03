import { useState, useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { apiService, ExecutionStatus, TestFlow } from '../services/api';
import { ProjectConfig } from '../types/nodes';
import { validateFlow } from '../utils/flowValidator';
import { translateError, FriendlyError } from '../utils/errorTranslator';

interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  category: string;
  config: Record<string, unknown>;
  customLabel?: string;
}

// Extender ExecutionStatus para incluir reportId y errores amigables
interface ExecutionStatusWithReport extends ExecutionStatus {
  reportId?: string;
  friendlyError?: FriendlyError;
}

export function useFlowExecution(
  nodes: Node<NodeData>[],
  edges: Edge[],
  backendConnected: boolean,
  projectConfig: ProjectConfig
) {
  const [isRunning, setIsRunning] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatusWithReport | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);

  // Validación reactiva del flujo
  const validation = useMemo(() => {
    return validateFlow(nodes, edges);
  }, [nodes, edges]);

  const runFlow = useCallback(async (skipValidation = false) => {
    if (!backendConnected) {
      setExecutionStatus({
        flowId: 'error',
        status: 'failed',
        results: [],
        error: 'Backend no conectado',
        friendlyError: {
          title: 'Backend no conectado',
          description: 'Para ejecutar pruebas necesitas iniciar el servidor backend.',
          suggestions: [
            'Abre una terminal en la carpeta del proyecto',
            'Ejecuta: cd server && npm run dev',
            'Espera a ver "Server running on port 3001"',
            'Vuelve a intentar ejecutar',
          ],
          category: 'browser',
        },
      });
      return;
    }

    // Validar flujo antes de ejecutar
    if (!skipValidation && !validation.canExecute) {
      setExecutionStatus({
        flowId: 'validation-error',
        status: 'failed',
        results: [],
        error: `Hay ${validation.summary.errors} errores que impiden la ejecución`,
        friendlyError: {
          title: 'Hay errores en el flujo',
          description: `Se encontraron ${validation.summary.errors} problemas que debes corregir antes de ejecutar.`,
          suggestions: [
            'Revisa los nodos marcados con error (borde rojo)',
            'Completa los campos obligatorios faltantes',
            'Asegúrate de tener al menos un nodo de Inicio',
          ],
          category: 'unknown',
        },
      });
      return;
    }

    if (nodes.length === 0) {
      setExecutionStatus({
        flowId: 'empty-flow',
        status: 'failed',
        results: [],
        error: 'No hay nodos en el flujo',
        friendlyError: {
          title: 'El canvas está vacío',
          description: 'Necesitas agregar nodos para crear un flujo de prueba.',
          suggestions: [
            'Arrastra un nodo "Inicio" desde el panel izquierdo',
            'Agrega acciones como Click, Escribir texto, etc.',
            'Conecta los nodos para definir el orden de ejecución',
          ],
          category: 'unknown',
        },
      });
      return;
    }

    setIsRunning(true);
    setExecutionStatus(null);

    try {
      const flow: TestFlow = {
        id: `flow-${Date.now()}`,
        name: 'Test Flow',
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type || 'testNode',
          data: n.data as NodeData,
          position: n.position,
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
        config: projectConfig,
      };

      console.log('Executing flow with config:', projectConfig);

      // ponytail: headless option removed - always headless, screencast shows execution
      const response = await apiService.runFlow(flow, { slowMo: 100 });
      setExecutionId(response.executionId);
      
      apiService.subscribeToExecution(response.executionId, (status) => {
        // Traducir errores a mensajes amigables
        const statusWithFriendly: ExecutionStatusWithReport = {
          ...status,
        };

        if (status.status === 'failed' && status.error) {
          statusWithFriendly.friendlyError = translateError(status.error);
        }

        setExecutionStatus(statusWithFriendly);
        
        if (status.status === 'completed' || status.status === 'failed') {
          setIsRunning(false);
        }
      });

    } catch (error) {
      console.error('Error ejecutando flujo:', error);
      setIsRunning(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setExecutionStatus({
        flowId: 'execution-error',
        status: 'failed',
        results: [],
        error: errorMessage,
        friendlyError: translateError(errorMessage),
      });
    }
  }, [nodes, edges, backendConnected, projectConfig, validation]);

  const clearExecutionStatus = useCallback(() => {
    setExecutionStatus(null);
    setExecutionId(null);
  }, []);

  return {
    isRunning,
    executionStatus,
    executionId,
    validation,
    runFlow,
    clearExecutionStatus,
  };
}
