import { useState, useEffect, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { nodeTypes, NodeTypeDefinition, NodeCategory, NodeField } from '../../types/nodes';
import { getNodeIcon } from '../../utils/icons';
import { FiX, FiPlus, FiChevronDown, FiChevronRight, FiCrosshair } from 'react-icons/fi';
import { apiService, PickerResult } from '../../services/api';
import InteractivePicker from './InteractivePicker';

// ponytail: simplified selector types - only what Playwright actually uses
const SELECTOR_TYPES = [
  { value: 'css', label: 'CSS' },
  { value: 'xpath', label: 'XPath' },
  { value: 'text', label: 'Text' },
  { value: 'testId', label: 'Test ID' },
  { value: 'role', label: 'Role' },
  { value: 'id', label: 'ID' },
];

interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  category: NodeCategory;
  config: Record<string, unknown>;
  customLabel?: string;
}

interface PropertiesPanelProps {
  selectedNode: Node<NodeData> | null;
  onUpdateNode: (nodeId: string, config: Record<string, unknown>, customLabel?: string) => void;
  isOpen: boolean;
  onClose: () => void;
  allNodes?: Node<NodeData>[];
  edges?: Edge[];
}

// ponytail: simplified selector field - just input + type dropdown + visual button
const SelectorField = ({
  value,
  selectorType,
  onChange,
  onTypeChange,
  onStartPicker,
  isPickerActive,
  pickerProgress,
}: {
  value: string;
  selectorType: string;
  onChange: (value: string) => void;
  onTypeChange: (type: string) => void;
  onStartPicker: () => void;
  isPickerActive: boolean;
  pickerProgress: string;
}) => (
  <div className="selector-field">
    {/* Row 1: Visual picker button */}
    <button
      type="button"
      className={`picker-btn-full ${isPickerActive ? 'active' : ''}`}
      onClick={onStartPicker}
      disabled={isPickerActive}
    >
      <FiCrosshair size={18} />
      <span>{isPickerActive ? (pickerProgress || 'Ejecutando...') : 'Seleccionar visualmente'}</span>
    </button>
    
    {/* Row 2: Type dropdown + input */}
    <div className="selector-row">
      <select 
        value={selectorType || 'css'} 
        onChange={(e) => onTypeChange(e.target.value)}
        className="selector-type"
      >
        {SELECTOR_TYPES.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ej: #submit-btn, .login-form, [data-testid='email']"
        className="selector-input"
      />
    </div>
    
    {/* Helper text */}
    {value && (
      <div className="selector-preview">
        <code>{selectorType === 'css' ? value : `${selectorType}=${value}`}</code>
      </div>
    )}
  </div>
);

// Field renderer component
const FieldRenderer = ({ 
  field, 
  value, 
  config,
  onChange,
  onSelectorChange,
  onStartPicker,
  isPickerActive,
  pickerProgress,
  TagsInput,
}: { 
  field: NodeField; 
  value: unknown;
  config: Record<string, unknown>;
  onChange: (value: string | number | boolean | string[]) => void;
  onSelectorChange: (selector: string, selectorType: string) => void;
  onStartPicker: () => void;
  isPickerActive: boolean;
  pickerProgress: string;
  TagsInput: React.ComponentType<{ fieldName: string; value: string[]; placeholder?: string; addPrefix?: boolean }>;
}) => {
  const isSelector = field.name === 'selector';
  
  return (
    <div className="panel-field">
      <label>
        {field.label}
        {field.required && <span style={{ color: '#e94560' }}> *</span>}
      </label>
      
      {field.type === 'text' && isSelector && (
        <SelectorField
          value={String(config.selector || '')}
          selectorType={String(config.selectorType || 'css')}
          onChange={(v) => onSelectorChange(v, String(config.selectorType || 'css'))}
          onTypeChange={(t) => onSelectorChange(String(config.selector || ''), t)}
          onStartPicker={onStartPicker}
          isPickerActive={isPickerActive}
          pickerProgress={pickerProgress}
        />
      )}
      
      {field.type === 'text' && !isSelector && (
        <input
          type="text"
          placeholder={field.placeholder}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      
      {field.type === 'number' && (
        <input
          type="number"
          placeholder={field.placeholder}
          value={value !== undefined && value !== '' ? Number(value) : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        />
      )}
      
      {field.type === 'select' && (
        <select
          value={String(value || field.defaultValue || '')}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      
      {field.type === 'textarea' && (
        <textarea
          placeholder={field.placeholder}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      
      {field.type === 'boolean' && (
        <label className="checkbox-label flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value ?? field.defaultValue)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="checkbox-text">{value ? 'Activado' : 'Desactivado'}</span>
        </label>
      )}
      
      {field.type === 'tags' && (
        <TagsInput 
          fieldName={field.name} 
          value={(value as string[]) || []} 
          placeholder={field.placeholder}
          addPrefix={field.name === 'tags'}
        />
      )}
    </div>
  );
};

const PropertiesPanel = ({ selectedNode, onUpdateNode, isOpen, onClose, allNodes, edges }: PropertiesPanelProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['emulation']));
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [pickerProgress, setPickerProgress] = useState('');
  const [pickerSessionId, setPickerSessionId] = useState<string | null>(null);
  const [isInteractivePicker, setIsInteractivePicker] = useState(false);
  
  const selectedNodeRef = useRef(selectedNode);
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    return () => {
      if (pickerSessionId) {
        apiService.cancelPicker(pickerSessionId).catch(() => {});
        apiService.unsubscribeFromPicker(pickerSessionId);
      }
    };
  }, [pickerSessionId]);

  // Handle interactive picker result
  const handleInteractiveResult = (result: PickerResult) => {
    setIsPickerActive(false);
    setIsInteractivePicker(false);
    setPickerProgress('');
    setPickerSessionId(null);

    const currentNode = selectedNodeRef.current;
    if (result && currentNode) {
      onUpdateNode(currentNode.id, {
        ...currentNode.data.config,
        selector: result.selector,
        selectorType: result.selectorType,
      });
    }
  };

  const handleInteractiveCancel = () => {
    if (pickerSessionId) {
      apiService.cancelPicker(pickerSessionId).catch(() => {});
    }
    setIsPickerActive(false);
    setIsInteractivePicker(false);
    setPickerProgress('');
    setPickerSessionId(null);
  };

  // ponytail: Always use interactive picker (screencast) - works everywhere
  const handleStartPicker = async () => {
    if (!selectedNode || !allNodes || !edges) return;
    
    // ponytail: Just check any start node has URL, backend finds the correct one via BFS
    const hasStartWithUrl = allNodes.some(n => 
      n.data?.nodeType === 'start' && n.data?.config?.baseUrl
    );
    
    if (!hasStartWithUrl) {
      alert('Configura una URL base en el nodo de Inicio.');
      return;
    }

    // Prepare nodes and edges for backend
    const nodesForBackend = allNodes.map(n => ({
      id: n.id,
      data: {
        nodeType: n.data.nodeType,
        label: n.data.label,
        config: n.data.config,
      },
    }));
    const edgesForBackend = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    try {
      setIsPickerActive(true);
      setPickerProgress('Iniciando selector visual...');

      const { sessionId } = await apiService.startInteractivePicker(
        selectedNode.id,
        nodesForBackend,
        edgesForBackend
      );
      
      // Subscribe to progress updates BEFORE mounting InteractivePicker
      apiService.subscribeToPickerProgress(sessionId, (message) => {
        setPickerProgress(message);
      });

      // Mount the picker component (will subscribe to frames)
      setPickerSessionId(sessionId);
      setIsInteractivePicker(true);
    } catch (error) {
      console.error('Picker error:', error);
      setIsPickerActive(false);
      setPickerProgress('');
      setPickerSessionId(null);
      alert('Error iniciando selector visual');
    }
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(groupName) ? next.delete(groupName) : next.add(groupName);
      return next;
    });
  };

  if (!isOpen || !selectedNode) return null;

  const nodeDefinition = nodeTypes.find((n: NodeTypeDefinition) => n.id === selectedNode.data.nodeType);
  const Icon = getNodeIcon(selectedNode.data.nodeType);

  const handleFieldChange = (fieldName: string, value: string | number | boolean | string[]) => {
    onUpdateNode(selectedNode.id, { ...selectedNode.data.config, [fieldName]: value });
  };

  const handleSelectorChange = (selector: string, selectorType: string) => {
    onUpdateNode(selectedNode.id, { ...selectedNode.data.config, selector, selectorType });
  };

  const handleLabelChange = (newLabel: string) => {
    onUpdateNode(selectedNode.id, selectedNode.data.config, newLabel);
  };

  // Tags input component
  const TagsInput = ({ fieldName, value, placeholder, addPrefix = true }: { fieldName: string; value: string[]; placeholder?: string; addPrefix?: boolean }) => {
    const [inputValue, setInputValue] = useState('');
    const tags = Array.isArray(value) ? value : [];
    
    const addTag = () => {
      let tag = inputValue.trim();
      if (!tag) return;
      if (addPrefix && !tag.startsWith('@')) tag = '@' + tag;
      if (!tags.includes(tag)) handleFieldChange(fieldName, [...tags, tag]);
      setInputValue('');
    };
    
    return (
      <div className="tags-input-container">
        <div className="tags-list">
          {tags.map(tag => (
            <span key={tag} className="tag-chip">
              {tag}
              <button type="button" onClick={() => handleFieldChange(fieldName, tags.filter(t => t !== tag))} className="tag-remove">
                <FiX size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="tag-input-row">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addTag())}
            placeholder={placeholder || '@smoke, @critical...'}
            className="tag-input"
          />
          <button type="button" onClick={addTag} className="tag-add-btn" disabled={!inputValue.trim()}>
            <FiPlus size={14} />
          </button>
        </div>
      </div>
    );
  };

  const renderFields = (fields: NodeField[]) => 
    fields.filter(f => {
      if (f.dependsOn) {
        const dependValue = selectedNode.data.config[f.dependsOn.field];
        if (dependValue !== f.dependsOn.value) return false;
      }
      return true;
    }).map(field => (
      <FieldRenderer 
        key={field.name}
        field={field}
        value={selectedNode.data.config[field.name]}
        config={selectedNode.data.config}
        onChange={(v) => handleFieldChange(field.name, v)}
        onSelectorChange={handleSelectorChange}
        onStartPicker={handleStartPicker}
        isPickerActive={isPickerActive}
        pickerProgress={pickerProgress}
        TagsInput={TagsInput}
      />
    ));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="node-properties-modal">
        <div className="modal-header">
          <h2 className="flex items-center gap-2">
            <Icon size={18} />
            {selectedNode.data.customLabel || selectedNode.data.label}
          </h2>
          <button className="close-btn" onClick={onClose}><FiX size={18} /></button>
        </div>
        
        <div className="modal-body">
          {selectedNode.data.nodeType !== 'start' && (
            <div className="panel-section">
              <h3>Identificación</h3>
              <div className="panel-field">
                <label>
                  Título del nodo{' '}
                  <input
                    type="text"
                    placeholder={nodeDefinition?.label || 'Título personalizado'}
                    value={selectedNode.data.customLabel || ''}
                    onChange={(e) => handleLabelChange(e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="panel-section">
            <h3>Configuración</h3>
            {renderFields(nodeDefinition?.fields.filter(f => !f.group) || [])}
          </div>

          {/* Collapsible groups */}
          {(() => {
            const groups = nodeDefinition?.fields
              .filter(f => f.group)
              .reduce((acc, field) => {
                if (!acc[field.group!]) acc[field.group!] = [];
                acc[field.group!].push(field);
                return acc;
              }, {} as Record<string, NodeField[]>) || {};

            return Object.entries(groups).map(([groupName, fields]) => (
              <div key={groupName} className="panel-section collapsible-group">
                <button className="group-header" onClick={() => toggleGroup(groupName)}>
                  <span className="group-toggle">
                    {collapsedGroups.has(groupName) ? <FiChevronRight size={14} /> : <FiChevronDown size={14} />}
                  </span>
                  <h3>⚙️ Opciones Avanzadas</h3>
                  <span className="group-count">{fields.length}</span>
                </button>
                {!collapsedGroups.has(groupName) && <div className="group-content">{renderFields(fields)}</div>}
              </div>
            ));
          })()}
          
          <div className="panel-section">
            <h3>Información</h3>
            <p className="info-text">{nodeDefinition?.description}</p>
          </div>
        </div>
      </div>

      {/* Interactive Picker Modal */}
      {isInteractivePicker && pickerSessionId && (
        <InteractivePicker
          sessionId={pickerSessionId}
          onResult={handleInteractiveResult}
          onCancel={handleInteractiveCancel}
        />
      )}
    </div>
  );
};

export default PropertiesPanel;
