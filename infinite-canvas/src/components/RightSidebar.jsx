import React from 'react';
import { Minus, Plus } from 'lucide-react';

const RightSidebar = ({ selectedShapeIds, shapes, updateShape }) => {
  const isMultiSelect = selectedShapeIds && selectedShapeIds.length > 1;
  const shape = selectedShapeIds && selectedShapeIds.length === 1 ? shapes[selectedShapeIds[0]] : null;

  const handleAlign = (type) => {
     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
     const selected = selectedShapeIds.map(id => shapes[id]).filter(s => s && s.type !== 'path');
     if (selected.length < 2) return;
     
     selected.forEach(s => {
        const w = s.width || (s.type === 'text' ? 100 : (s.type === 'image' ? 200 : 0));
        const h = s.height || (s.type === 'text' ? 50 : (s.type === 'image' ? 200 : 0));
        if (s.x < minX) minX = s.x;
        if (s.y < minY) minY = s.y;
        if (s.x + w > maxX) maxX = s.x + w;
        if (s.y + h > maxY) maxY = s.y + h;
     });

     const centerX = minX + (maxX - minX) / 2;
     const centerY = minY + (maxY - minY) / 2;

     selectedShapeIds.forEach(id => {
        const s = shapes[id];
        if (!s || s.type === 'path') return;
        const w = s.width || (s.type === 'text' ? 100 : (s.type === 'image' ? 200 : 0));
        const h = s.height || (s.type === 'text' ? 50 : (s.type === 'image' ? 200 : 0));
        
        if (type === 'left') updateShape(id, { x: minX });
        if (type === 'center') updateShape(id, { x: centerX - w/2 });
        if (type === 'right') updateShape(id, { x: maxX - w });
        if (type === 'top') updateShape(id, { y: minY });
        if (type === 'middle') updateShape(id, { y: centerY - h/2 });
        if (type === 'bottom') updateShape(id, { y: maxY - h });
     });
  };

  if (!shape && !isMultiSelect) {
    return (
      <div className="panel right" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '16px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          No selection
        </span>
      </div>
    );
  }

  if (isMultiSelect) {
    return (
      <div className="panel right" style={{ overflowY: 'auto' }}>
        <div className="prop-section">
          <div className="prop-title">Align</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '8px' }}>
            <button className="tool-btn" style={{ width: '100%', fontSize: '11px' }} onClick={() => handleAlign('left')}>Left</button>
            <button className="tool-btn" style={{ width: '100%', fontSize: '11px' }} onClick={() => handleAlign('center')}>Center</button>
            <button className="tool-btn" style={{ width: '100%', fontSize: '11px' }} onClick={() => handleAlign('right')}>Right</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
            <button className="tool-btn" style={{ width: '100%', fontSize: '11px' }} onClick={() => handleAlign('top')}>Top</button>
            <button className="tool-btn" style={{ width: '100%', fontSize: '11px' }} onClick={() => handleAlign('middle')}>Middle</button>
            <button className="tool-btn" style={{ width: '100%', fontSize: '11px' }} onClick={() => handleAlign('bottom')}>Bottom</button>
          </div>
        </div>
        <div className="prop-section" style={{ textAlign: 'center' }}>
           <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Multiple selection</span>
        </div>
      </div>
    );
  }

  const selectedShapeId = selectedShapeIds[0];

  const handleChange = (field, value) => {
    let parsedValue = value;
    if (['x', 'y', 'width', 'height', 'strokeWidth', 'cornerRadius', 'fontSize', 'zIndex', 'opacity'].includes(field)) {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = 0;
    }
    updateShape(selectedShapeId, { [field]: parsedValue });
  };

  const handleBringForward = () => {
     handleChange('zIndex', (shape.zIndex || 0) + 1);
  };
  const handleSendBackward = () => {
     handleChange('zIndex', (shape.zIndex || 0) - 1);
  };

  return (
    <div className="panel right" style={{ overflowY: 'auto' }}>
      
      {/* LAYER ACTIONS */}
      <div className="prop-section">
         <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleBringForward} style={{ flex: 1, padding: '4px', background: '#333', borderRadius: '4px', fontSize: '11px' }}>Forward</button>
            <button onClick={handleSendBackward} style={{ flex: 1, padding: '4px', background: '#333', borderRadius: '4px', fontSize: '11px' }}>Backward</button>
         </div>
      </div>

      {/* IMAGE PROPERTIES */}
      {shape.type === 'image' && (
        <div className="prop-section">
          <div className="prop-title">Image URL</div>
          <div className="prop-row">
            <input 
              className="prop-input" 
              type="text" 
              value={shape.url || ''} 
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      )}

      {/* TEXT PROPERTIES */}
      {shape.type === 'text' && (
        <div className="prop-section">
          <div className="prop-title">Text</div>
          <div className="prop-row">
            <textarea 
              className="prop-input" 
              value={shape.text || ''} 
              onChange={(e) => handleChange('text', e.target.value)}
              style={{ minHeight: '60px', resize: 'vertical' }}
            />
          </div>
          <div className="prop-row">
            <span className="prop-label">Size</span>
            <input 
              className="prop-input" 
              type="number" 
              value={shape.fontSize || 16} 
              onChange={(e) => handleChange('fontSize', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="prop-section">
        <div className="prop-title">Design</div>
        
        {/* Layout Properties */}
        {shape.type !== 'path' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="prop-row">
              <span className="prop-label">X</span>
              <input 
                className="prop-input" 
                type="number" 
                value={Math.round(shape.x || 0)} 
                onChange={(e) => handleChange('x', e.target.value)}
              />
            </div>
            <div className="prop-row">
              <span className="prop-label">Y</span>
              <input 
                className="prop-input" 
                type="number" 
                value={Math.round(shape.y || 0)} 
                onChange={(e) => handleChange('y', e.target.value)}
              />
            </div>
            {shape.type !== 'text' && (
              <>
                <div className="prop-row">
                  <span className="prop-label">W</span>
                  <input 
                    className="prop-input" 
                    type="number" 
                    value={Math.round(shape.width || 0)} 
                    onChange={(e) => handleChange('width', e.target.value)}
                  />
                </div>
                <div className="prop-row">
                  <span className="prop-label">H</span>
                  <input 
                    className="prop-input" 
                    type="number" 
                    value={Math.round(shape.height || 0)} 
                    onChange={(e) => handleChange('height', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Radius */}
        {shape.type === 'rect' && (
          <div className="prop-row" style={{ marginTop: '8px' }}>
            <span className="prop-label" title="Corner Radius">R</span>
            <input 
              className="prop-input" 
              type="number" 
              value={shape.cornerRadius || 0} 
              onChange={(e) => handleChange('cornerRadius', e.target.value)}
              style={{ width: '50%' }}
            />
          </div>
        )}
      </div>

      <div className="prop-section">
        <div className="prop-title">Fill</div>
        <div className="prop-row">
          <input 
            className="prop-input" 
            type="color" 
            value={shape.color || '#d9d9d9'} 
            onChange={(e) => handleChange('color', e.target.value)}
          />
          <input 
            className="prop-input" 
            type="text" 
            value={shape.color || '#d9d9d9'} 
            onChange={(e) => handleChange('color', e.target.value)}
            style={{ textTransform: 'uppercase', flex: 1 }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>%</span>
          <input 
            className="prop-input" 
            type="number" 
            min="0"
            max="100"
            value={Math.round((shape.opacity ?? 1) * 100)} 
            onChange={(e) => handleChange('opacity', parseFloat(e.target.value)/100)}
            style={{ width: '40px' }}
            title="Opacity"
          />
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-title">Stroke</div>
        <div className="prop-row">
          <input 
            className="prop-input" 
            type="color" 
            value={shape.strokeColor || '#000000'} 
            onChange={(e) => handleChange('strokeColor', e.target.value)}
          />
          <input 
            className="prop-input" 
            type="number" 
            value={shape.strokeWidth || 0} 
            onChange={(e) => handleChange('strokeWidth', e.target.value)}
            style={{ width: '40px' }}
            title="Stroke Width"
          />
        </div>
      </div>

    </div>
  );
};

export default RightSidebar;
