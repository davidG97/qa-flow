import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeCategory } from '../../types/nodes';
import { getNodeIcon } from '../../utils/icons';
import { FiCheck, FiX } from 'react-icons/fi';

interface CustomNodeData {
  label: string;
  nodeType: string;
  category: NodeCategory;
  config: Record<string, unknown>;
  customLabel?: string;
}

const IfNode = memo(({ data, selected }: NodeProps & { data: CustomNodeData }) => {
  const displayLabel = data.customLabel || data.label;
  const Icon = getNodeIcon(data.nodeType);
  
  return (
    <div className={`custom-node if-node ${data.category} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      
      <div className="node-icon">
        <Icon size={24} />
      </div>
      
      <span className="node-label">{displayLabel}</span>

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
