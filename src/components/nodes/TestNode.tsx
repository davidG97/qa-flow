import { memo, useState, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeCategory } from '../../types/nodes';
import { getNodeIcon } from '../../utils/icons';
import { FiSettings, FiTag, FiClock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

interface CustomNodeData {
  label: string;
  nodeType: string;
  category: NodeCategory;
  config: Record<string, unknown>;
  customLabel?: string;
  executionStatus?: 'pending' | 'running' | 'success' | 'error';
}

const TestNode = memo(({ data, selected }: NodeProps & { data: CustomNodeData }) => {
  // Para nodos de inicio, usar testName del config como título
  const displayLabel = data.nodeType === 'start' 
    ? (data.config.testName as string || data.label)
    : (data.customLabel || data.label);
  const Icon = getNodeIcon(data.nodeType);
  const [isHovered, setIsHovered] = useState(false);
  
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

  // Obtener información resumida de la configuración
  const configSummary = useMemo(() => {
    const config = data.config;
    const summaryParts: string[] = [];
    
    if (config.selector) summaryParts.push(`selector: ${String(config.selector).substring(0, 20)}...`);
    if (config.url) summaryParts.push(`url: ${String(config.url).substring(0, 30)}...`);
    if (config.text) summaryParts.push(`text: "${String(config.text).substring(0, 15)}..."`);
    if (config.timeout) summaryParts.push(`timeout: ${config.timeout}ms`);
    if (config.value) summaryParts.push(`value: "${String(config.value).substring(0, 15)}..."`);
    
    return summaryParts.length > 0 ? summaryParts.join('\n') : 'Sin configuración';
  }, [data.config]);

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
      title={configSummary}
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
      
      {/* Tooltip de tags para nodo start */}
      {isHovered && data.nodeType === 'start' && tags.length > 0 && (
        <div className="node-tags-tooltip">
          <div className="tooltip-header">
            <FiTag size={12} />
            <span>Tags del test</span>
          </div>
          <div className="tooltip-tags">
            {tags.map((tag, index) => (
              <span key={index} className="node-tag">{tag}</span>
            ))}
          </div>
        </div>
      )}
      
      {/* Tooltip de configuración para otros nodos */}
      {isHovered && data.nodeType !== 'start' && hasConfig && (
        <div className="node-config-tooltip">
          <div className="tooltip-header">
            <FiSettings size={12} />
            <span>Configuración</span>
          </div>
          <div className="tooltip-content">
            {Object.entries(data.config)
              .filter(([, value]) => value !== undefined && value !== '' && value !== null)
              .slice(0, 4)
              .map(([key, value]) => (
                <div key={key} className="config-item">
                  <span className="config-key">{key}:</span>
                  <span className="config-value">
                    {typeof value === 'boolean' 
                      ? (value ? 'Sí' : 'No')
                      : String(value).length > 25 
                        ? `${String(value).substring(0, 25)}...` 
                        : String(value)
                    }
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

TestNode.displayName = 'TestNode';

export default TestNode;
