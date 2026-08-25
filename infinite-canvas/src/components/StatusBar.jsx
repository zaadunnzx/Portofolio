import React from 'react';

const StatusBar = ({ selectedShapeIds, shapes, camera }) => {
  const selCount = selectedShapeIds ? selectedShapeIds.length : 0;
  
  let selLabel = 'No selection';
  if (selCount === 1) {
    const shape = shapes[selectedShapeIds[0]];
    if (shape) {
      const name = shape.name || shape.type.charAt(0).toUpperCase() + shape.type.slice(1);
      selLabel = `${name} — ${Math.round(shape.x)}, ${Math.round(shape.y)}`;
      if (shape.width) selLabel += ` — ${Math.round(shape.width)} × ${Math.round(shape.height)}`;
    }
  } else if (selCount > 1) {
    selLabel = `${selCount} objects selected`;
  }

  return (
    <div style={{
      height: '28px',
      background: 'var(--panel-bg)',
      borderTop: '1px solid var(--panel-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      fontSize: '10px',
      color: 'var(--text-secondary)',
      zIndex: 20,
      gap: '16px',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span>{selLabel}</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ opacity: 0.5 }}>V Select</span>
        <span style={{ opacity: 0.5 }}>H Hand</span>
        <span style={{ opacity: 0.5 }}>R Rect</span>
        <span style={{ opacity: 0.5 }}>⌫ Del</span>
        <span style={{ opacity: 0.5 }}>Ctrl+G Group</span>
        <span>Zoom {Math.round((camera?.zoom || 1) * 100)}%</span>
      </div>
    </div>
  );
};

export default StatusBar;
