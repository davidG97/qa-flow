import { memo, useState, useMemo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { NodeCategory } from '../../types/nodes';
import { getNodeIcon } from '../../utils/icons';
import { FiSettings, FiTag, FiClock, FiAlertCircle, FiCheckCircle, FiTrash2, FiMinusCircle } from 'react-icons/fi';

interface CustomNodeData {
  label: string;
  nodeType: string;
  category: NodeCategory;
  config: Record<string, unknown>;
  customLabel?: string;
  executionStatus?: 'pending' | 'running' | 'success' | 'error';
}

const TestNode = memo(({ id, data, selected }: NodeProps & { data: CustomNodeData }) => {
  // Para nodos de inicio, usar testName del config como título
  const displayLabel = data.nodeType === 'start' 
    ? (data.config.testName as string || data.label)
    : (data.customLabel || data.label);
  const Icon = getNodeIcon(data.nodeType);
  const [isHovered, setIsHovered] = useState(false);
  const { deleteElements, getEdges, setEdges } = useReactFlow();
  
  // Obtener tags del nodo start
  const tags = data.nodeType === 'start' && Array.isArray(data.config.tags) 
    ? data.config.tags as string[]
    : [];

  // Verificar si el nodo tiene configuración importante
  const hasConfig = useMemo(() => {
    const config = data.config;
    return Object.keys(config).some(key => {
      const value = config[key];
      return value !== undefined && value !== '' && value !== null;
    });
  }, [data.config]);

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

  // Icono de estado de ejecución
  const StatusIcon = useMemo(() => {
    switch (data.executionStatus) {
      case 'running': return <FiClock className="animate-pulse" size={10} />;
      case 'success': return <FiCheckCircle size={10} />;
      case 'error': return <FiAlertCircle size={10} />;
      default: return null;
    }
  }, [data.executionStatus]);
  
  return (
    <div 
      className={`custom-node ${data.category} ${selected ? 'selected' : ''} ${data.executionStatus || ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {data.category !== 'trigger' && data.category !== 'hook' && (
        <Handle type="target" position={Position.Left} />
      )}
      
      {/* Indicador de configuración */}
      {hasConfig && (
        <div className="node-config-indicator" title="Nodo configurado">
          <FiSettings size={10} />
        </div>
      )}
      
      {/* Indicador de estado de ejecución */}
      {data.executionStatus && (
        <div className={`node-status-indicator ${data.executionStatus}`}>
          {StatusIcon}
        </div>
      )}

      <div className="node-icon-wrapper">
        <div className="node-icon">
          <Icon size={22} />
        </div>
      </div>
      
      <span className="node-label">{displayLabel}</span>
      
      {/* Badge de tags para nodo start */}
      {data.nodeType === 'start' && tags.length > 0 && (
        <div className="node-tags-badge" title={`Tags: ${tags.join(', ')}`}>
          <FiTag size={10} />
          <span>{tags.length}</span>
        </div>
      )}
      
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
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

TestNode.displayName = 'TestNode';

export default TestNode;
