import React from 'react';
import { Hand, Square, Pen, Trash2 } from 'lucide-react';

const Toolbar = ({ currentTool, setCurrentTool, clearAllShapes }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '8px',
      padding: '8px',
      borderRadius: '16px',
      zIndex: 50,
    }} className="glass-panel">
      <ToolButton 
        icon={<Hand size={20} />} 
        active={currentTool === 'pan'} 
        onClick={() => setCurrentTool('pan')} 
        title="Pan (Space + Drag)"
      />
      <ToolButton 
        icon={<Pen size={20} />} 
        active={currentTool === 'pen'} 
        onClick={() => setCurrentTool('pen')} 
        title="Draw Freehand"
      />
      <ToolButton 
        icon={<Square size={20} />} 
        active={currentTool === 'rect'} 
        onClick={() => setCurrentTool('rect')} 
        title="Draw Rectangle"
      />
      <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
      <ToolButton 
        icon={<Trash2 size={20} color="var(--danger)" />} 
        onClick={clearAllShapes} 
        title="Clear All"
      />
    </div>
  );
};

const ToolButton = ({ icon, active, onClick, title }) => {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: active ? 'var(--selection-color)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text-primary)';
        e.currentTarget.style.background = active ? 'var(--selection-color)' : 'rgba(255,255,255,0.05)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.background = active ? 'var(--selection-color)' : 'transparent';
      }}
    >
      {icon}
    </button>
  );
};

export default Toolbar;
