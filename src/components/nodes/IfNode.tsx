import { memo, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { NodeCategory } from '../../types/nodes';
import { getNodeIcon } from '../../utils/icons';
import { FiCheck, FiX, FiTrash2, FiMinusCircle, FiSettings } from 'react-icons/fi';

interface CustomNodeData {
  label: string;
  nodeType: string;
  category: NodeCategory;
  config: Record<string, unknown>;
  customLabel?: string;
}

const IfNode = memo(({ id, data, selected }: NodeProps & { data: CustomNodeData }) => {
  const displayLabel = data.customLabel || data.label;
  const Icon = getNodeIcon(data.nodeType);
  const [isHovered, setIsHovered] = useState(false);
  const { deleteElements, getEdges, setEdges } = useReactFlow();

  // Eliminar nodo
  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  // Desconectar nodo (eliminar todas sus conexiones)
  const handleDisconnectNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allEdges = getEdges();
    setEdges(allEdges.filter(edge => edge.source !== id && edge.target !== id));
  };
  
  return (
    <div 
      className={`custom-node if-node ${data.category} ${selected ? 'selected' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle type="target" position={Position.Left} />
      
      <div className="node-icon">
        <Icon size={24} />
      </div>
      
      <span className="node-label">{displayLabel}</span>

      {/* Menú de acciones rápidas en hover */}
      {isHovered && (
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
          <button 
            className="hover-menu-btn config" 
            title="Configurar nodo (clic en el nodo)"
          >
            <FiSettings size={14} />
          </button>
        </div>
      )}

      {/* Handles de salida para If y Else */}
      <div className="if-handles">
        <Handle 
          type="source" 
          position={Position.Right} 
          id="if-true"
          className="handle-true"
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          id="if-false"
          className="handle-false"
        />
      </div>
      
      <div className="if-labels">
        <span className="if-label true"><FiCheck size={10} /></span>
        <span className="if-label false"><FiX size={10} /></span>
      </div>
    </div>
  );
});

IfNode.displayName = 'IfNode';

export default IfNode;
