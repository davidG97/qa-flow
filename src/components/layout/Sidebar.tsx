import { DragEvent, useState, useMemo, useCallback } from 'react';
import { nodesByCategory, categoryLabels, NodeCategory, NodeTypeDefinition } from '../../types/nodes';
import { getNodeIcon } from '../../utils/icons';
import { FiSearch, FiChevronDown, FiChevronRight, FiX, FiZap, FiBox, FiCheckCircle, FiGitBranch, FiAnchor } from 'react-icons/fi';

interface SidebarProps {
  onDragStart: (event: DragEvent, nodeType: NodeTypeDefinition) => void;
}

const categoryIcons: Record<NodeCategory, React.ElementType> = {
  trigger: FiZap,
  hook: FiAnchor,
  action: FiBox,
  assertion: FiCheckCircle,
  control: FiGitBranch,
};

const Sidebar = ({ onDragStart }: SidebarProps) => {
  const categories: NodeCategory[] = ['trigger', 'hook', 'action', 'assertion', 'control'];
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<NodeCategory>>(new Set());
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  const toggleCategory = useCallback((category: NodeCategory) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const handleDragStart = useCallback((e: DragEvent, nodeType: NodeTypeDefinition) => {
    setDraggingNode(nodeType.id);
    onDragStart(e, nodeType);
  }, [onDragStart]);

  const handleDragEnd = useCallback(() => {
    setDraggingNode(null);
  }, []);

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return nodesByCategory;
    
    const term = searchTerm.toLowerCase();
    const filtered: typeof nodesByCategory = {} as typeof nodesByCategory;
    
    categories.forEach(category => {
      const nodes = nodesByCategory[category]?.filter(
        node => 
          node.label.toLowerCase().includes(term) ||
          node.description.toLowerCase().includes(term)
      );
      if (nodes && nodes.length > 0) {
        filtered[category] = nodes;
      }
    });
    
    return filtered;
  }, [searchTerm]);

  const getCategoryCount = (category: NodeCategory) => {
    return filteredNodes[category]?.length || 0;
  };

  const totalResults = useMemo(() => {
    return Object.values(filteredNodes).reduce((acc, nodes) => acc + (nodes?.length || 0), 0);
  }, [filteredNodes]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="" width="22" height="22" style={{ borderRadius: '4px' }} />
          QA Flow
        </h1>
        <p>Visual Test Automation</p>
      </div>
      
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" size={14} />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="search-clear-btn" onClick={clearSearch}>
              <FiX size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="node-palette">
        {categories.map((category) => {
          const count = getCategoryCount(category);
          if (count === 0 && searchTerm) return null;
          
          const isCollapsed = collapsedCategories.has(category);
          const CategoryIcon = categoryIcons[category];
          
          return (
            <div key={category} className="node-category">
              <button 
                className="category-header"
                onClick={() => toggleCategory(category)}
              >
                {isCollapsed ? <FiChevronRight size={12} /> : <FiChevronDown size={12} />}
                <CategoryIcon size={14} className={`category-icon ${category}`} />
                <span className="category-label">{categoryLabels[category]}</span>
                <span className="category-count">{count}</span>
              </button>
              
              {!isCollapsed && (
                <div className="category-nodes">
                  {filteredNodes[category]?.map((nodeType) => {
                    const Icon = getNodeIcon(nodeType.id);
                    const isDragging = draggingNode === nodeType.id;
                    
                    return (
                      <div
                        key={nodeType.id}
                        className={`node-item ${isDragging ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, nodeType)}
                        onDragEnd={handleDragEnd}
                        title={nodeType.description}
                      >
                        <div className={`node-icon ${category}`}>
                          <Icon size={16} />
                        </div>
                        <span className="node-title">{nodeType.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        
        {searchTerm && totalResults === 0 && (
          <div className="no-results">
            <p>Sin resultados para "{searchTerm}"</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
