import React, { useState } from 'react';
import { Hand, Square, Pen, MousePointer2, Type, Circle, Image as ImageIcon, Undo2, Redo2, Download, ZoomIn, ZoomOut, Sun, Moon } from 'lucide-react';

const TopBar = ({ currentTool, setCurrentTool, onUndo, onRedo, onExportPNG, onExportSVG, camera, setCamera, theme, setTheme }) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  
  const tools = [
    { id: 'select', icon: <MousePointer2 size={18} />, title: 'Select (V)' },
    { id: 'pan', icon: <Hand size={18} />, title: 'Hand tool (H)' },
    null, // separator
    { id: 'rect', icon: <Square size={18} />, title: 'Rectangle (R)' },
    { id: 'ellipse', icon: <Circle size={18} />, title: 'Ellipse (O)' },
    { id: 'text', icon: <Type size={18} />, title: 'Text (T)' },
    { id: 'image', icon: <ImageIcon size={18} />, title: 'Image' },
    { id: 'pen', icon: <Pen size={18} />, title: 'Pen (P)' },
  ];

  return (
    <div className="top-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Logo */}
        <div style={{ 
          fontWeight: 800, 
          fontSize: '15px',
          color: 'var(--accent)', 
          letterSpacing: '-0.5px',
          marginRight: '4px'
        }}>
          IGMA
        </div>

        {/* Tool Group */}
        <div className="tool-group" style={{ 
          background: 'rgba(128,128,128,0.06)', 
          padding: '3px', 
          borderRadius: '10px',
          border: '1px solid var(--panel-border)'
        }}>
          {tools.map((tool, i) => {
            if (!tool) return <div key={`sep-${i}`} style={{ width: '1px', height: '22px', background: 'var(--panel-border)', margin: '0 2px' }} />;
            return (
              <button 
                key={tool.id}
                className={`tool-btn ${currentTool === tool.id ? 'active' : ''}`}
                onClick={() => setCurrentTool(tool.id)}
                title={tool.title}
              >
                {tool.icon}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Center title */}
      <div style={{ 
        fontSize: '13px', 
        fontWeight: 500, 
        color: 'var(--text-primary)',
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)'
      }}>
        Draft / Untitled
      </div>
      
      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
        
        {/* Zoom Controls */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '2px', 
          background: 'rgba(128,128,128,0.06)', 
          padding: '3px', 
          borderRadius: '8px',
          border: '1px solid var(--panel-border)'
        }}>
           <button className="tool-btn" onClick={() => setCamera(prev => ({...prev, zoom: Math.max(0.1, prev.zoom - 0.1)}))} style={{ width: '26px', height: '26px' }}><ZoomOut size={13}/></button>
           <span style={{ fontSize: '10px', minWidth: '34px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{Math.round((camera?.zoom || 1) * 100)}%</span>
           <button className="tool-btn" onClick={() => setCamera(prev => ({...prev, zoom: Math.min(5, prev.zoom + 0.1)}))} style={{ width: '26px', height: '26px' }}><ZoomIn size={13}/></button>
        </div>

        <div style={{ width: '1px', height: '22px', background: 'var(--panel-border)' }}></div>

        <button className="tool-btn" onClick={onUndo} title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
        <button className="tool-btn" onClick={onRedo} title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
        
        <div style={{ width: '1px', height: '22px', background: 'var(--panel-border)' }}></div>
        
        <button className="tool-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle Theme">
           {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* P2P indicator */}
        <div style={{ 
          fontSize: '10px', 
          color: '#4ade80', 
          marginRight: '4px', 
          marginLeft: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
          Live
        </div>
        
        {/* Export dropdown */}
        <div style={{ position: 'relative' }}>
           <button 
             style={{
               background: 'linear-gradient(135deg, var(--accent), #6366f1)',
               color: '#fff',
               border: 'none',
               padding: '7px 14px',
               borderRadius: '8px',
               fontSize: '11px',
               fontWeight: 700,
               cursor: 'pointer',
               display: 'flex',
               alignItems: 'center',
               gap: '6px',
               letterSpacing: '0.3px',
               transition: 'transform 0.1s, box-shadow 0.1s',
               boxShadow: '0 2px 8px rgba(24, 160, 251, 0.3)'
             }}
             onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
             onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
             onClick={() => setExportMenuOpen(!exportMenuOpen)}
           >
             <Download size={13} /> Export
           </button>
           
           {exportMenuOpen && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                  onClick={() => setExportMenuOpen(false)}
                />
                <div style={{
                   position: 'absolute',
                   top: '100%',
                   right: 0,
                   marginTop: '6px',
                   background: 'var(--panel-bg)',
                   border: '1px solid var(--panel-border)',
                   borderRadius: '8px',
                   padding: '4px',
                   display: 'flex',
                   flexDirection: 'column',
                   gap: '2px',
                   zIndex: 1000,
                   minWidth: '140px',
                   boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
                }}>
                   <button 
                     className="tool-btn" 
                     style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', fontSize: '12px', height: 'auto', borderRadius: '6px' }} 
                     onClick={() => { onExportPNG(); setExportMenuOpen(false); }}
                   >
                     PNG Image
                   </button>
                   <button 
                     className="tool-btn" 
                     style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', fontSize: '12px', height: 'auto', borderRadius: '6px' }} 
                     onClick={() => { onExportSVG(); setExportMenuOpen(false); }}
                   >
                     SVG Vector
                   </button>
                </div>
              </>
           )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
