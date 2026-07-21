import { useState, useCallback, useRef } from 'react';
import { Node, Edge, useNodesState, useEdgesState, addEdge, Connection } from '@xyflow/react';
import { NodeCategory, ProjectConfig, defaultProjectConfig } from '../types/nodes';
import { FlowNode, FlowEdge } from '../services/api';

interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  category: NodeCategory;
  config: Record<string, unknown>;
  customLabel?: string;
  executionStatus?: 'running' | 'success' | 'error';
}

export interface SavedProject {
  name: string;
  version: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  config: ProjectConfig;
  savedAt: string;
}

const initialNodes: Node<NodeData>[] = [
  {
    id: '1',
    type: 'testNode',
    position: { x: 250, y: 50 },
    data: {
      label: 'Start',
      nodeType: 'start',
      category: 'trigger',
      config: {
        baseUrl: 'https://example.com',
        browser: 'chromium',
        // ponytail: headless removed - always headless
      },
    },
  },
];

export function useFlowNodes() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const nodeIdCounter = useRef(2);

  const nodeLength = (currentNodes: Node<NodeData>[]) => currentNodes.length > 0 ? 400 : 0;

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNode = useCallback(
    (nodeId: string, config: Record<string, unknown>, customLabel?: string) => {
      let updatedNodeRef: Node<NodeData> | null = null;
      
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const updatedNode = {
              ...node,
              data: {
                ...node.data,
                config,
                ...(customLabel !== undefined && { customLabel }),
              },
            };
            updatedNodeRef = updatedNode as Node<NodeData>;
            return updatedNode;
          }
          return node;
        })
      );
      
      // ponytail: update selectedNode outside setNodes callback to avoid batching issues
      if (updatedNodeRef) {
        setSelectedNode(updatedNodeRef);
      }
    },
    [setNodes]
  );

  const addNode = useCallback(
    (node: Node<NodeData>) => {
      setNodes((nds) => [...nds, node]);
    },
    [setNodes]
  );

  const getNextNodeId = useCallback(() => {
    return String(nodeIdCounter.current++);
  }, []);

  // ponytail: simplified - just count matches
  const getUniqueLabel = useCallback((baseLabel: string, existingNodes: Node<NodeData>[] = nodes): string => {
    const escaped = baseLabel.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const count = existingNodes.filter(n => new RegExp(String.raw`^${escaped}(-\d+)?$`).test(n.data.label)).length;
    return count === 0 ? baseLabel : `${baseLabel}-${count + 1}`;
  }, [nodes]);

  const clearCanvas = useCallback(() => {
    if (confirm('¿Estás seguro de que quieres limpiar el canvas?')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
    }
  }, [setNodes, setEdges]);

  const importNodes = useCallback(
    (importedNodes: FlowNode[], importedEdges: FlowEdge[], replaceAll = false) => {
      setNodes(currentNodes => {
        const maxId = replaceAll 
          ? 0 
          : Math.max(
              ...currentNodes.map(n => Number.parseInt(n.id) || 0),
              nodeIdCounter.current
            );
        
        const idMap = new Map<string, string>();
        const adjustedNodes = importedNodes.map((node, index) => {
          const newId = String(maxId + index + 1);
          idMap.set(node.id, newId);
          
          const nodeComponentType = node.data.nodeType === 'if' ? 'ifNode' : 'testNode';
          
          return {
            ...node,
            id: newId,
            type: nodeComponentType,
            position: {
              x: node.position.x + (replaceAll ? 0 : nodeLength(currentNodes)),
              y: node.position.y,
            },
          };
        });

        const adjustedEdges = importedEdges.map((edge, index) => ({
          ...edge,
          id: `e-imported-${maxId + index}`,
          source: idMap.get(edge.source) || edge.source,
          target: idMap.get(edge.target) || edge.target,
        }));

        nodeIdCounter.current = maxId + importedNodes.length + 1;

        // Update edges in a separate callback to avoid batching issues
        setEdges(currentEdges => replaceAll ? adjustedEdges : [...currentEdges, ...adjustedEdges]);

        return replaceAll ? adjustedNodes as Node<NodeData>[] : [...currentNodes, ...adjustedNodes as Node<NodeData>[]];
      });
    },
    [setNodes, setEdges]
  );

  const exportProject = useCallback(
    (config: ProjectConfig, projectName: string = 'qa-flow-project') => {
      const project: SavedProject = {
        name: projectName,
        version: '1.0.0',
        nodes,
        edges,
        config,
        savedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = projectName
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      link.download = `${safeName}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    [nodes, edges]
  );

  const importProject = useCallback(
    async (file: File): Promise<{ config: ProjectConfig } | null> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const project: SavedProject = JSON.parse(content);
            
            // Validar estructura básica
            if (!project.nodes || !Array.isArray(project.nodes)) {
              alert('Invalid file: does not contain nodes');
              resolve(null);
              return;
            }

            // Calcular siguiente ID
            const maxId = Math.max(
              ...project.nodes.map(n => Number.parseInt(n.id) || 0),
              1
            );
            nodeIdCounter.current = maxId + 1;

            // Cargar nodos y edges
            setNodes(project.nodes);
            setEdges(project.edges || []);
            setSelectedNode(null);

            // Devolver la configuración para que App.tsx la use
            const config = project.config || defaultProjectConfig;
            
            alert(`Project "${project.name || 'Untitled'}" imported successfully`);
            resolve({ config });
          } catch (error) {
            console.error('Error parsing file:', error);
            alert('Error reading file. Make sure it is a valid JSON file.');
            resolve(null);
          }
        };

        reader.onerror = () => {
          alert('Error reading file');
          resolve(null);
        };

        reader.readAsText(file);
      });
    },
    [setNodes, setEdges]
  );

  return {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    updateNode,
    addNode,
    getNextNodeId,
    getUniqueLabel,
    clearCanvas,
    importNodes,
    exportProject,
    importProject,
    setNodes,
    setEdges,
    nodeIdCounter,
  };
}
