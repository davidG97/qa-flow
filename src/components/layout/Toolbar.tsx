import { useRef, useState, useCallback } from 'react';
import { FiTrash2, FiSave, FiCode, FiVideo, FiPlay, FiLoader, FiSettings, FiDownload, FiUpload, FiArrowLeft, FiCheck, FiMoreHorizontal } from 'react-icons/fi';

interface ToolbarProps {
  onRun: () => void;
  onSave: () => void;
  onClear: () => void;
  onGenerateCode?: () => void;
  onRecord?: () => void;
  onConfig?: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
  onProjects?: () => void;
  isRunning: boolean;
  hasStartNodes: boolean;
  projectName?: string;
}

// ponytail: simplified toolbar - fewer visible buttons, menu for secondary actions
const Toolbar = ({ onRun, onSave, onClear, onGenerateCode, onRecord, onConfig, onExport, onImport, onProjects, isRunning, hasStartNodes, projectName }: ToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const getSaveIcon = () => {
    if (saveState === 'saving') return <FiLoader size={16} className="animate-spin" />;
    if (saveState === 'saved') return <FiCheck size={16} />;
    return <FiSave size={16} />;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) onImport(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = useCallback(async () => {
    setSaveState('saving');
    try {
      onSave();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch {
      setSaveState('idle');
    }
  }, [onSave]);

  const handleClear = useCallback(() => {
    if (showClearConfirm) {
      onClear();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  }, [showClearConfirm, onClear]);

  const menuAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  return (
    <div className="toolbar">
      {/* Left: Navigation */}
      {onProjects && (
        <button className="toolbar-btn ghost" onClick={onProjects} title="Projects">
          <FiArrowLeft size={16} />
        </button>
      )}
      
      {projectName && <span className="toolbar-project-name">{projectName}</span>}

      {/* Center: Quick actions */}
      <div className="toolbar-group">
        <button 
          className={`toolbar-btn icon-only ${saveState === 'saved' ? 'saved' : ''}`}
          onClick={handleSave}
          disabled={saveState === 'saving'}
          title="Save (Ctrl+S)"
        >
          {getSaveIcon()}
        </button>

        {onConfig && (
          <button className="toolbar-btn icon-only" onClick={onConfig} title="Configuration">
            <FiSettings size={16} />
          </button>
        )}

        {/* Menu for secondary actions */}
        <div className="toolbar-menu-wrapper">
          <button 
            className={`toolbar-btn icon-only ${showMenu ? 'active' : ''}`} 
            onClick={() => setShowMenu(!showMenu)}
            title="More options"
          >
            <FiMoreHorizontal size={16} />
          </button>
          
          {showMenu && (
            <>
              <div className="toolbar-menu-backdrop" onClick={() => setShowMenu(false)} role="none" />
              <div className="toolbar-menu">
                {onGenerateCode && (
                  <button onClick={() => menuAction(onGenerateCode)}>
                    <FiCode size={14} /> Generate code
                  </button>
                )}
                {onRecord && (
                  <button onClick={() => menuAction(onRecord)}>
                    <FiVideo size={14} /> Record session
                  </button>
                )}
                {onExport && (
                  <button onClick={() => menuAction(onExport)}>
                    <FiDownload size={14} /> Export JSON
                  </button>
                )}
                {onImport && (
                  <button onClick={() => { setShowMenu(false); fileInputRef.current?.click(); }}>
                    <FiUpload size={14} /> Import JSON
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <button 
          className={`toolbar-btn icon-only ${showClearConfirm ? 'danger' : ''}`}
          onClick={handleClear}
          title={showClearConfirm ? 'Click to confirm' : 'Clear canvas'}
        >
          <FiTrash2 size={16} />
        </button>
      </div>

      {onImport && <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} hidden />}

      <div className="toolbar-spacer" />

      {/* Right: Run */}
      <button 
        className="toolbar-btn primary"
        onClick={onRun}
        disabled={isRunning || !hasStartNodes}
        title={hasStartNodes ? 'Run (F5)' : 'Add a Start node'}
      >
        {isRunning ? <FiLoader size={16} className="animate-spin" /> : <FiPlay size={16} />}
        <span>{isRunning ? 'Running...' : 'Run'}</span>
      </button>
    </div>
  );
};

export default Toolbar;
