import React, { useState } from 'react';
import { Square, Pen, Circle, Type, Image as ImageIcon, Lock, Unlock, Eye, EyeOff } from 'lucide-react';

const LeftSidebar = ({ shapes, selectedShapeIds, setSelectedShapeIds, updateShape }) => {
  const shapeEntries = Object.entries(shapes);
  shapeEntries.reverse();

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const getIcon = (type) => {
    switch (type) {
      case 'rect': return <Square size={14} />;
      case 'ellipse': return <Circle size={14} />;
      case 'path': return <Pen size={14} />;
      case 'text': return <Type size={14} />;
      case 'image': return <ImageIcon size={14} />;
      default: return <Square size={14} />;
    }
  };

  const getDefaultName = (type) => {
    switch (type) {
      case 'rect': return 'Rectangle';
      case 'ellipse': return 'Ellipse';
      case 'path': return 'Path';
      case 'text': return 'Text';
      case 'image': return 'Image';
      default: return 'Shape';
    }
  };

  const handleDoubleClick = (e, id, shape) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(shape.name || getDefaultName(shape.type));
  };

  const commitRename = (id) => {
    if (renameValue.trim()) {
      updateShape(id, { name: renameValue.trim() });
    }
    setRenamingId(null);
  };

  return (
    <div className="panel left" style={{ overflowY: 'auto' }}>
      <div style={{ 
        padding: '14px 16px', 
        borderBottom: '1px solid var(--panel-border)', 
        fontSize: '10px', 
        fontWeight: 700, 
        color: 'var(--text-secondary)', 
        letterSpacing: '1.2px',
        textTransform: 'uppercase'
      }}>
        Layers
        <span style={{ 
          marginLeft: '8px', 
          fontSize: '10px', 
          opacity: 0.5, 
          fontWeight: 400, 
          letterSpacing: 0 
        }}>
          {shapeEntries.length}
        </span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {shapeEntries.length === 0 && (
          <div style={{ 
            padding: '40px 16px', 
            textAlign: 'center', 
            fontSize: '11px', 
            color: 'var(--text-secondary)', 
            opacity: 0.5 
          }}>
            No layers yet.<br/>Draw something to get started.
          </div>
        )}
        {shapeEntries.map(([id, shape]) => (
          <div 
            key={id}
            className={`layer-item ${selectedShapeIds && selectedShapeIds.includes(id) ? 'selected' : ''}`}
            onClick={(e) => {
               if (renamingId) return;
               if (e.ctrlKey || e.metaKey || e.shiftKey) {
                  if (selectedShapeIds.includes(id)) {
                     setSelectedShapeIds(selectedShapeIds.filter(sid => sid !== id));
                  } else {
                     setSelectedShapeIds([...selectedShapeIds, id]);
                  }
               } else {
                  setSelectedShapeIds([id]);
               }
            }}
            onDoubleClick={(e) => handleDoubleClick(e, id, shape)}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              opacity: shape.isLocked ? 0.5 : (shape.isHidden ? 0.35 : 1),
              minHeight: '32px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
              <span style={{ color: 'var(--accent)', opacity: 0.6, flexShrink: 0 }}>{getIcon(shape.type)}</span>
              
              {renamingId === id ? (
                <input 
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: 'rgba(128,128,128,0.15)',
                    border: '1px solid var(--accent)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    padding: '2px 6px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              ) : (
                <span style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  fontSize: '11px'
                }}>
                  {shape.name || getDefaultName(shape.type)}
                  {shape.groupId && (
                    <span style={{
                      fontSize: '9px', 
                      marginLeft: '6px',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      background: 'rgba(24, 160, 251, 0.15)',
                      color: 'var(--accent)',
                      fontWeight: 600
                    }}>
                      G
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Action icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              {/* Visibility toggle */}
              <div 
                style={{ 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background 0.1s'
                }}
                title={shape.isHidden ? "Show Layer" : "Hide Layer"}
                onClick={(e) => {
                  e.stopPropagation();
                  updateShape(id, { isHidden: !shape.isHidden });
                }}
              >
                {shape.isHidden ? <EyeOff size={13} style={{ opacity: 0.6 }} /> : <Eye size={13} style={{ opacity: 0.3 }} />}
              </div>
              
              {/* Lock toggle */}
              <div 
                style={{ 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background 0.1s'
                }}
                title={shape.isLocked ? "Unlock Layer" : "Lock Layer"}
                onClick={(e) => {
                  e.stopPropagation();
                  updateShape(id, { isLocked: !shape.isLocked });
                }}
              >
                {shape.isLocked ? <Lock size={13} /> : <Unlock size={13} style={{ opacity: 0.3 }} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeftSidebar;
