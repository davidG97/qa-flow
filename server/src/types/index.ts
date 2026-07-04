// Tipos compartidos entre frontend y backend

export type NodeCategory = 'trigger' | 'action' | 'assertion' | 'control' | 'hook';

export interface FlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    nodeType: string;
    category: NodeCategory;
    config: Record<string, unknown>;
  };
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface ProjectConfig {
  executionMode: 'default' | 'parallel' | 'serial';
  workers: number;
  maxFailures: number;
  retries: number;
  timeout: number;
  cdpUrl?: string;
}

export interface TestFlow {
  id: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  config?: ProjectConfig;
}

export interface ExecutionResult {
  success: boolean;
  nodeId: string;
  nodeType: string;
  message: string;
  duration: number;
  screenshot?: string;
  error?: string;
}

export interface ExecutionStatus {
  flowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentNode?: string;
  results: ExecutionResult[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface RunFlowRequest {
  flow: TestFlow;
  options?: {
    slowMo?: number;
    timeout?: number;
  };
}
