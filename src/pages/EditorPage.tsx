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
import RecordingModal from '../components/modals/RecordingModal';
import ProjectConfigModal from '../components/modals/ProjectConfigModal';

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
}

const EditorPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const hasLoadedProject = useRef(false);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>(defaultProjectConfig);
  const [projectName, setProjectName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    clearExecutionStatus,
  } = useFlowExecution(nodes, edges, backendConnected, projectConfig);

  // Cargar proyecto al montar - solo una vez
  useEffect(() => {
    // Evitar múltiples cargas del mismo proyecto
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
        console.error('Error cargando proyecto:', err);
        hasLoadedProject.current = false;
        navigate('/projects', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, importNodes, navigate]);

  // Guardar proyecto en base de datos
  const handleSaveProject = useCallback(async () => {
    if (!projectId) {
      alert('No hay proyecto seleccionado');
      return;
    }

    setSaving(true);
    try {
      await apiService.updateProject(projectId, {
        nodes: nodes as FlowNode[],
        edges: edges as FlowEdge[],
        config: projectConfig,
      });
      console.log('Proyecto guardado exitosamente');
    } catch (err) {
      console.error('Error guardando proyecto:', err);
      alert('Error al guardar el proyecto');
    } finally {
      setSaving(false);
    }
  }, [projectId, nodes, edges, projectConfig]);

  // Exportar proyecto
  const handleExportProject = useCallback(() => {
    exportProject(projectConfig, projectName);
  }, [exportProject, projectConfig, projectName]);

  // Importar proyecto
  const handleImportProject = useCallback(async (file: File) => {
    const result = await importProject(file);
    if (result?.config) {
      setProjectConfig(result.config);
    }
  }, [importProject]);

  // Navegar a proyectos
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

      // Crear configuración inicial con valores por defecto
      const initialConfig: Record<string, unknown> = {};
      nodeType.fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          initialConfig[field.name] = field.defaultValue;
        }
      });

      // Determinar el tipo de componente de nodo a usar
      const nodeComponentType = nodeType.id === 'if' ? 'ifNode' : 'testNode';

      // Generar label único
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

  // Generar código Playwright
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
      
      // Mostrar el código en una nueva ventana
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(generateCodeViewerHtml(code));
      }
    } catch {
      alert('Error generando código');
    }
  }, [nodes, edges, backendConnected, projectId, projectName, projectConfig]);

  // Manejar import de nodos
  const handleImportNodes = useCallback((importedNodes: FlowNode[], importedEdges: FlowEdge[]) => {
    importNodes(importedNodes, importedEdges);
    setShowRecordingModal(false);
  }, [importNodes]);

  if (loading) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner" />
        <p>Cargando proyecto...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar onDragStart={onDragStart} />
      
      <div className="canvas-area">
        <Toolbar
          onRun={runFlow}
          onSave={handleSaveProject}
          onGenerateCode={onGenerateCode}
          onRecord={() => setShowRecordingModal(true)}
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
          
          {/* Indicador de conexión con backend */}
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
        onClose={clearExecutionStatus}
      />

      <RecordingModal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        onImport={handleImportNodes}
      />

      <ProjectConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        config={projectConfig}
        onSave={setProjectConfig}
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
      {connected ? 'Backend conectado' : 'Desconectado'}
    </div>
  );
}

// Función para generar el HTML del visor de código
function generateCodeViewerHtml(code: string): string {
  const escapedCode = code.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  
  return `
    <html>
      <head>
        <title>Código Playwright Generado</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: #020617; 
            color: #f1f5f9; 
            font-family: 'Inter', system-ui, sans-serif;
            padding: 2rem;
            min-height: 100vh;
          }
          .container { max-width: 900px; margin: 0 auto; }
          h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #ffffff;
          }
          .toolbar { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
          button {
            background: #6366f1;
            color: white;
            border: none;
            padding: 0.625rem 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 150ms;
          }
          button:hover { background: #818cf8; }
          button.secondary {
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid rgba(51, 65, 85, 0.5);
          }
          button.secondary:hover {
            background: rgba(51, 65, 85, 0.5);
            border-color: #6366f1;
          }
          .code-container {
            background: #0f172a;
            border: 1px solid rgba(51, 65, 85, 0.5);
            border-radius: 0.75rem;
            overflow: hidden;
          }
          .code-header {
            background: rgba(30, 41, 59, 0.5);
            padding: 0.75rem 1rem;
            border-bottom: 1px solid rgba(51, 65, 85, 0.5);
            font-size: 0.75rem;
            color: #64748b;
          }
          pre { 
            padding: 1.25rem; 
            overflow-x: auto;
            font-family: 'JetBrains Mono', 'Monaco', monospace;
            font-size: 0.8rem;
            line-height: 1.6;
            color: #94a3b8;
          }
          .copied { background: #22c55e !important; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>📄 Código Playwright Generado</h2>
          <div class="toolbar">
            <button onclick="copyCode(this)">📋 Copiar código</button>
            <button class="secondary" onclick="downloadCode()">💾 Descargar archivo</button>
          </div>
          <div class="code-container">
            <div class="code-header">test.spec.ts</div>
            <pre id="code">${escapedCode}</pre>
          </div>
        </div>
        <script>
          function copyCode(btn) {
            navigator.clipboard.writeText(document.getElementById('code').textContent);
            btn.classList.add('copied');
            btn.innerHTML = '✓ Copiado';
            setTimeout(() => {
              btn.classList.remove('copied');
              btn.innerHTML = '📋 Copiar código';
            }, 2000);
          }
          function downloadCode() {
            const code = document.getElementById('code').textContent;
            const blob = new Blob([code], { type: 'text/typescript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'test.spec.ts';
            a.click();
            URL.revokeObjectURL(url);
          }
        </script>
      </body>
    </html>
  `;
}

export default EditorPage;
