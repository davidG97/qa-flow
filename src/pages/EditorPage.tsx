import { useState, useCallback, useRef, DragEvent, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  ReactFlowInstance,
  BackgroundVariant,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Layout components
import Sidebar from '../components/layout/Sidebar';
import Toolbar from '../components/layout/Toolbar';

// Panel components
import PropertiesPanel from '../components/panels/PropertiesPanel';
import ExecutionPanel from '../components/panels/ExecutionPanel';

// Modal components
import ProjectConfigModal from '../components/modals/ProjectConfigModal';
import CodeViewerModal from '../components/modals/CodeViewerModal';

// Node components
import TestNode from '../components/nodes/TestNode';
import IfNode from '../components/nodes/IfNode';

// Hooks
import { useBackendConnection } from '../hooks/useBackendConnection';
import { useFlowExecution } from '../hooks/useFlowExecution';
import { useFlowNodes } from '../hooks/useFlowNodes';

// Types and services
import { NodeTypeDefinition, NodeCategory, ProjectConfig, defaultProjectConfig } from '../types/nodes';
import { apiService, TestFlow, FlowNode, FlowEdge } from '../services/api';

// Tipos de nodos personalizados
const nodeTypes = {
  testNode: TestNode,
  ifNode: IfNode,
};

interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  category: NodeCategory;
  config: Record<string, unknown>;
  customLabel?: string;
  executionStatus?: 'running' | 'success' | 'error';
}

const EditorPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const hasLoadedProject = useRef(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>(defaultProjectConfig);
  const [projectName, setProjectName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);

  // Custom hooks
  const { backendConnected } = useBackendConnection();
  const {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    updateNode,
    clearCanvas,
    importNodes,
    exportProject,
    importProject,
    setNodes,
    nodeIdCounter,
    getUniqueLabel,
  } = useFlowNodes();

  const {
    isRunning,
    executionStatus,
    executionId,
    validation,
    runFlow,
  } = useFlowExecution(nodes, edges, backendConnected, projectConfig);

  // Load project on mount - only once
  useEffect(() => {
    // Avoid multiple loads of the same project
    if (hasLoadedProject.current) {
      return;
    }

    const loadProject = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        hasLoadedProject.current = true;
        const project = await apiService.getProject(projectId);
        setProjectName(project.name);
        
        if (project.config) {
          setProjectConfig(project.config);
        }

        if (project.nodes.length > 0 || project.edges.length > 0) {
          // Usar replaceAll=true para reemplazar los nodos iniciales
          importNodes(project.nodes, project.edges, true);
        }
      } catch (err) {
        console.error('Error loading project:', err);
        hasLoadedProject.current = false;
        navigate('/projects', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, importNodes, navigate]);

  // Update execution state on nodes
  useEffect(() => {
    if (!executionStatus && !isRunning) {
      // Clear execution states when there is no execution
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, executionStatus: undefined },
        }))
      );
      return;
    }

    setNodes((nds) =>
      nds.map((node) => {
        // Check if this node has result
        const result = executionStatus?.results.find((r) => r.nodeId === node.id);
        
        let status: 'running' | 'success' | 'error' | undefined;
        
        if (result) {
          status = result.success ? 'success' : 'error';
        } else if (executionStatus?.currentNode === node.id) {
          status = 'running';
        } else if (isRunning && !result) {
          // Pending node during execution
          status = undefined;
        }

        return {
          ...node,
          data: { ...node.data, executionStatus: status },
        };
      })
    );
  }, [executionStatus, isRunning, setNodes]);

  // Save project to database
  const handleSaveProject = useCallback(async () => {
    if (!projectId) {
      alert('No project selected');
      return;
    }

    setSaving(true);
    try {
      await apiService.updateProject(projectId, {
        nodes: nodes as FlowNode[],
        edges: edges as FlowEdge[],
        config: projectConfig,
      });
      console.log('Project saved successfully');
    } catch (err) {
      console.error('Error saving project:', err);
      alert('Error saving project');
    } finally {
      setSaving(false);
    }
  }, [projectId, nodes, edges, projectConfig]);

  // Export project
  const handleExportProject = useCallback(() => {
    exportProject(projectConfig, projectName);
  }, [exportProject, projectConfig, projectName]);

  // Import project
  const handleImportProject = useCallback(async (file: File) => {
    const result = await importProject(file);
    if (result?.config) {
      setProjectConfig(result.config);
    }
  }, [importProject]);

  // Navigate to projects
  const handleGoToProjects = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  // Manejar drag start desde la sidebar
  const onDragStart = useCallback((event: DragEvent, nodeType: NodeTypeDefinition) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Manejar drop en el canvas
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const nodeTypeData = event.dataTransfer.getData('application/reactflow');

      if (!nodeTypeData) return;

      const nodeType: NodeTypeDefinition = JSON.parse(nodeTypeData);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Create initial config with default values
      const initialConfig: Record<string, unknown> = {};
      nodeType.fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          initialConfig[field.name] = field.defaultValue;
        }
      });

      // Determinar el tipo de componente de nodo a usar
      const nodeComponentType = nodeType.id === 'if' ? 'ifNode' : 'testNode';

      // Generate unique label
      const uniqueLabel = getUniqueLabel(nodeType.label);

      const newNode: Node<NodeData> = {
        id: String(nodeIdCounter.current++),
        type: nodeComponentType,
        position,
        data: {
          label: uniqueLabel,
          nodeType: nodeType.id,
          category: nodeType.category,
          config: initialConfig,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes, nodeIdCounter, getUniqueLabel]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Generate Playwright code
  const onGenerateCode = useCallback(async () => {
    if (!backendConnected) {
      alert('⚠️ Backend no conectado');
      return;
    }

    try {
      const flowNodes = nodes.map(n => ({
        id: n.id,
        type: n.type || 'testNode',
        data: n.data as NodeData,
        position: n.position,
      }));

      const flow: TestFlow = {
        id: projectId || `flow-${Date.now()}`,
        name: projectName || 'Test Flow',
        nodes: flowNodes,
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
        config: projectConfig,
      };

      const code = await apiService.generateCode(flow);
      
      // Show code in modal
      setGeneratedCode(code);
      setShowCodeModal(true);
    } catch {
      alert('Error generating code');
    }
  }, [nodes, edges, backendConnected, projectId, projectName, projectConfig]);



  if (loading) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner" />
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar onDragStart={onDragStart} />
      
      <div className={`canvas-area ${isPanelMinimized ? 'panel-minimized' : ''}`}>
        <Toolbar
          onRun={runFlow}
          onSave={handleSaveProject}
          onGenerateCode={onGenerateCode}
          onConfig={() => setShowConfigModal(true)}
          onExport={handleExportProject}
          onImport={handleImportProject}
          onProjects={handleGoToProjects}
          onClear={clearCanvas}
          isRunning={isRunning || saving}
          hasStartNodes={nodes.some(n => n.data.nodeType === 'start')}
          projectName={projectName}
        />
        
        <div className="flow-canvas" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange as any}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick as any}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            selectionOnDrag
            panOnDrag={[1, 2]}
            selectionMode={SelectionMode.Partial}
          >
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                const data = node.data as NodeData;
                switch (data.category) {
                  case 'trigger': return '#4CAF50';
                  case 'action': return '#2196F3';
                  case 'assertion': return '#FF9800';
                  case 'control': return '#9C27B0';
                  case 'hook': return '#EC4899';
                  default: return '#666';
                }
              }}
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#0f3460" />
          </ReactFlow>
          
          {/* Backend connection indicator */}
          <BackendStatusIndicator connected={backendConnected} />
        </div>
      </div>
      
      
      <PropertiesPanel
        selectedNode={selectedNode}
        onUpdateNode={updateNode}
        isOpen={!!selectedNode}
        onClose={onPaneClick}
        allNodes={nodes}
        edges={edges}
      />

      <ExecutionPanel 
        status={executionStatus}
        validation={validation}
        executionId={executionId}
        isRunning={isRunning}
        onMinimizeChange={setIsPanelMinimized}
      />

      <ProjectConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        config={projectConfig}
        onSave={setProjectConfig}
      />

      <CodeViewerModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        code={generatedCode}
        filename={`${(projectName || 'test').toLowerCase().replace(/\s+/g, '-')}.spec.ts`}
      />
    </div>
  );
};

// Componente para el indicador de estado del backend
function BackendStatusIndicator({ connected }: Readonly<{ connected: boolean }>) {
  return (
    <div 
      className="backend-status"
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: '6px',
        border: `1px solid ${connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        fontSize: '0.7rem',
        color: connected ? '#22c55e' : '#ef4444',
        zIndex: 10,
      }}
    >
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: connected ? '#22c55e' : '#ef4444',
      }} />
      {connected ? 'Backend connected' : 'Disconnected'}
    </div>
  );
}

export default EditorPage;
