import React, { useRef, useEffect } from 'react';

const MINIMAP_W = 180;
const MINIMAP_H = 120;
const MINIMAP_PAD = 40;

const Minimap = ({ shapes, camera, setCamera }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = MINIMAP_W;
    canvas.height = MINIMAP_H;

    const shapeList = Object.values(shapes).filter(s => !s.isHidden);
    
    // Compute world bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapeList.forEach(s => {
      const w = s.width || (s.type === 'text' ? 100 : 10);
      const h = s.height || (s.type === 'text' ? 50 : 10);
      if (s.x < minX) minX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.x + w > maxX) maxX = s.x + w;
      if (s.y + h > maxY) maxY = s.y + h;
    });

    if (shapeList.length === 0) {
      minX = -500; minY = -500; maxX = 500; maxY = 500;
    }

    // Add padding
    minX -= MINIMAP_PAD; minY -= MINIMAP_PAD;
    maxX += MINIMAP_PAD; maxY += MINIMAP_PAD;
    
    const worldW = maxX - minX || 1;
    const worldH = maxY - minY || 1;
    const scale = Math.min(MINIMAP_W / worldW, MINIMAP_H / worldH);
    const offsetX = (MINIMAP_W - worldW * scale) / 2;
    const offsetY = (MINIMAP_H - worldH * scale) / 2;

    // Background
    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

    // Draw shapes as tiny colored rectangles
    shapeList.forEach(s => {
      const w = (s.width || 10) * scale;
      const h = (s.height || 10) * scale;
      const x = (s.x - minX) * scale + offsetX;
      const y = (s.y - minY) * scale + offsetY;
      
      ctx.fillStyle = s.color || '#888';
      ctx.globalAlpha = s.opacity ?? 1;
      
      if (s.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, Math.max(w, 2), Math.max(h, 2));
      }
      ctx.globalAlpha = 1;
    });

    // Draw viewport rectangle
    // Viewport in world coords: top-left = screenToWorld(0, 0), bottom-right = screenToWorld(canvasW, canvasH)
    // Approximate viewport as ~window size
    const vpWorldX = -camera.x / camera.zoom;
    const vpWorldY = -camera.y / camera.zoom;
    const vpWorldW = window.innerWidth / camera.zoom;
    const vpWorldH = window.innerHeight / camera.zoom;

    const vpX = (vpWorldX - minX) * scale + offsetX;
    const vpY = (vpWorldY - minY) * scale + offsetY;
    const vpW = vpWorldW * scale;
    const vpH = vpWorldH * scale;

    ctx.strokeStyle = '#18a0fb';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);

    // Subtle viewport fill
    ctx.fillStyle = 'rgba(24, 160, 251, 0.08)';
    ctx.fillRect(vpX, vpY, vpW, vpH);

  }, [shapes, camera]);

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const shapeList = Object.values(shapes).filter(s => !s.isHidden);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapeList.forEach(s => {
      const w = s.width || 10;
      const h = s.height || 10;
      if (s.x < minX) minX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.x + w > maxX) maxX = s.x + w;
      if (s.y + h > maxY) maxY = s.y + h;
    });
    if (shapeList.length === 0) {
      minX = -500; minY = -500; maxX = 500; maxY = 500;
    }
    minX -= MINIMAP_PAD; minY -= MINIMAP_PAD;
    maxX += MINIMAP_PAD; maxY += MINIMAP_PAD;

    const worldW = maxX - minX || 1;
    const worldH = maxY - minY || 1;
    const scale = Math.min(MINIMAP_W / worldW, MINIMAP_H / worldH);
    const offsetX = (MINIMAP_W - worldW * scale) / 2;
    const offsetY = (MINIMAP_H - worldH * scale) / 2;

    const worldClickX = (clickX - offsetX) / scale + minX;
    const worldClickY = (clickY - offsetY) / scale + minY;

    // Center the camera on clicked world position
    setCamera(prev => ({
      ...prev,
      x: -worldClickX * prev.zoom + window.innerWidth / 2,
      y: -worldClickY * prev.zoom + window.innerHeight / 2
    }));
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '40px',
      right: '12px',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid var(--panel-border)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      cursor: 'pointer',
      zIndex: 50,
      opacity: 0.9,
      transition: 'opacity 0.2s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
    >
      <canvas 
        ref={canvasRef} 
        width={MINIMAP_W} 
        height={MINIMAP_H}
        onClick={handleClick}
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default Minimap;
