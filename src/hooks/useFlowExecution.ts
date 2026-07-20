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

  // Reactive flow validation
  const validation = useMemo(() => {
    return validateFlow(nodes, edges);
  }, [nodes, edges]);

  const runFlow = useCallback(async (skipValidation = false) => {
    if (!backendConnected) {
      setExecutionStatus({
        flowId: 'error',
        status: 'failed',
        results: [],
        error: 'Backend not connected',
        friendlyError: {
          title: 'Backend not connected',
          description: 'To run tests you need to start the backend server.',
          suggestions: [
            'Open a terminal in the project folder',
            'Run: cd server && npm run dev',
            'Wait to see "Server running on port 3001"',
            'Try running again',
          ],
          category: 'browser',
        },
      });
      return;
    }

    // Validate flow before executing
    if (!skipValidation && !validation.canExecute) {
      setExecutionStatus({
        flowId: 'validation-error',
        status: 'failed',
        results: [],
        error: `There are ${validation.summary.errors} errors preventing execution`,
        friendlyError: {
          title: 'There are errors in the flow',
          description: `Found ${validation.summary.errors} issues that must be fixed before running.`,
          suggestions: [
            'Review nodes marked with error (red border)',
            'Complete missing required fields',
            'Make sure you have at least one Start node',
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
        error: 'No nodes in the flow',
        friendlyError: {
          title: 'The canvas is empty',
          description: 'You need to add nodes to create a test flow.',
          suggestions: [
            'Drag a "Start" node from the left panel',
            'Add actions like Click, Type text, etc.',
            'Connect nodes to define the execution order',
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
        // Translate errors to friendly messages
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
      console.error('Error executing flow:', error);
      setIsRunning(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
