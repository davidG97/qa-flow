import { memo, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { NodeCategory } from '../../types/nodes';
import { getNodeIcon } from '../../utils/icons';
import { FiTag, FiTrash2, FiMinusCircle, FiCheck, FiX, FiLoader } from 'react-icons/fi';

interface CustomNodeData {
  label: string;
  nodeType: string;
  category: NodeCategory;
  config: Record<string, unknown>;
  customLabel?: string;
  executionStatus?: 'pending' | 'running' | 'success' | 'error';
}

const TestNode = memo(({ id, data, selected }: NodeProps & { data: CustomNodeData }) => {
  const displayLabel = data.nodeType === 'start' 
    ? (data.config.testName as string || data.label)
    : (data.customLabel || data.label);
  const Icon = getNodeIcon(data.nodeType);
  const [isHovered, setIsHovered] = useState(false);
  const { deleteElements, getEdges, setEdges } = useReactFlow();
  
  const tags = data.nodeType === 'start' && Array.isArray(data.config.tags) 
    ? data.config.tags as string[]
    : [];

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const handleDisconnectNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allEdges = getEdges();
    setEdges(allEdges.filter(edge => edge.source !== id && edge.target !== id));
  };
  
  return (
    <div 
      className={`custom-node ${data.category} ${selected ? 'selected' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {data.category !== 'trigger' && data.category !== 'hook' && (
        <Handle type="target" position={Position.Left} />
      )}
      
      {/* Badge de estado de ejecución */}
      {data.executionStatus && (
        <div className={`node-execution-badge ${data.executionStatus}`}>
          {data.executionStatus === 'running' && <FiLoader size={12} className="animate-spin" />}
          {data.executionStatus === 'success' && <FiCheck size={12} />}
          {data.executionStatus === 'error' && <FiX size={12} />}
        </div>
      )}

      <div className="node-icon-wrapper">
        <div className="node-icon">
          <Icon size={22} />
        </div>
      </div>
      
      <span className="node-label">{displayLabel}</span>
      
      {data.nodeType === 'start' && tags.length > 0 && (
        <div className="node-tags-badge" title={`Tags: ${tags.join(', ')}`}>
          <FiTag size={10} />
          <span>{tags.length}</span>
        </div>
      )}
      
      {/* Menú hover: eliminar y desconectar */}
      {isHovered && !data.executionStatus && (
        <div className="node-hover-menu">
          <button 
            className="hover-menu-btn delete" 
            onClick={handleDeleteNode}
            title="Eliminar nodo"
          >
            <FiTrash2 size={14} />
          </button>
          <button 
            className="hover-menu-btn disconnect" 
            onClick={handleDisconnectNode}
            title="Desconectar nodo"
          >
            <FiMinusCircle size={14} />
          </button>
        </div>
      )}
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

TestNode.displayName = 'TestNode';

export default TestNode;
