import React, { useState, useEffect } from 'react';
import Canvas from './components/Canvas';
import TopBar from './components/TopBar';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import Minimap from './components/Minimap';
import StatusBar from './components/StatusBar';
import { useYjsStore } from './hooks/useYjsStore';

function App() {
  const { shapes, addShape, updateShape, removeShape, clearAllShapes, awareness, clientId, selectedShapeIds, setSelectedShapeIds, undo, redo, getMaxZIndex } = useYjsStore();
  const [currentTool, setCurrentTool] = useState('select');
  const [clipboard, setClipboard] = useState(null);
  
  const [theme, setTheme] = useState('dark');
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

  useEffect(() => {
     if (theme === 'light') {
        document.body.classList.add('light-theme');
     } else {
        document.body.classList.remove('light-theme');
     }
  }, [theme]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
         if (e.shiftKey) {
            redo();
         } else {
            undo();
         }
         e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
         redo();
         e.preventDefault();
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedShapeIds.length > 0 && !e.shiftKey) {
         const copiedShapes = selectedShapeIds.map(id => ({ ...shapes[id] }));
         setClipboard(copiedShapes);
         e.preventDefault();
      }
      
      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard && clipboard.length > 0) {
         const newIds = [];
         clipboard.forEach(shape => {
            const newId = crypto.randomUUID();
            newIds.push(newId);
            addShape(newId, {
               ...shape,
               x: shape.x + 20,
               y: shape.y + 20,
               zIndex: getMaxZIndex() + 1,
               groupId: null // Paste drops grouping for simplicity initially
            });
         });
         setSelectedShapeIds(newIds);
         e.preventDefault();
      }

      // Grouping (Ctrl+G and Ctrl+Shift+G)
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' || e.key === 'G') {
         if (e.shiftKey) {
            // Ungroup
            if (selectedShapeIds.length > 0) {
               selectedShapeIds.forEach(id => {
                  updateShape(id, { groupId: null });
               });
            }
         } else {
            // Group
            if (selectedShapeIds.length > 1) {
               const newGroupId = crypto.randomUUID();
               selectedShapeIds.forEach(id => {
                  updateShape(id, { groupId: newGroupId });
               });
            }
         }
         e.preventDefault();
      }

      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedShapeIds.length > 0) {
         const newIds = [];
         selectedShapeIds.forEach(id => {
            const shape = shapes[id];
            if (shape) {
               const newId = crypto.randomUUID();
               newIds.push(newId);
               addShape(newId, {
                  ...shape,
                  x: shape.x + 20,
                  y: shape.y + 20,
                  zIndex: getMaxZIndex() + 1
               });
            }
         });
         setSelectedShapeIds(newIds);
         e.preventDefault();
      }

      // Keyboard Nudging
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedShapeIds.length > 0) {
         const amount = e.shiftKey ? 10 : 1;
         let dx = 0, dy = 0;
         if (e.key === 'ArrowUp') dy = -amount;
         if (e.key === 'ArrowDown') dy = amount;
         if (e.key === 'ArrowLeft') dx = -amount;
         if (e.key === 'ArrowRight') dx = amount;
         
         selectedShapeIds.forEach(id => {
            const shape = shapes[id];
            if (shape) updateShape(id, { x: shape.x + dx, y: shape.y + dy });
         });
         e.preventDefault();
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeIds.length > 0) {
        selectedShapeIds.forEach(id => removeShape(id));
        setSelectedShapeIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShapeIds, removeShape, setSelectedShapeIds, undo, redo, shapes, clipboard, addShape, getMaxZIndex]);

  const getExportSVGString = () => {
     const shapesToExport = selectedShapeIds.length > 0 ? selectedShapeIds.map(id => shapes[id]).filter(Boolean) : Object.values(shapes);
     if (shapesToExport.length === 0) return null;

     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
     shapesToExport.forEach(shape => {
         if (shape.type === 'path') return;
         const w = shape.width || (shape.type === 'text' ? 100 : (shape.type === 'image' ? 200 : 0));
         const h = shape.height || (shape.type === 'text' ? 50 : (shape.type === 'image' ? 200 : 0));
         if (shape.x < minX) minX = shape.x;
         if (shape.y < minY) minY = shape.y;
         if (shape.x + w > maxX) maxX = shape.x + w;
         if (shape.y + h > maxY) maxY = shape.y + h;
     });
     
     const pad = 20;
     const w = maxX !== -Infinity ? (maxX - minX) + pad*2 : 1920;
     const h = maxY !== -Infinity ? (maxY - minY) + pad*2 : 1080;
     const vx = minX !== Infinity ? minX - pad : 0;
     const vy = minY !== Infinity ? minY - pad : 0;

     let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vx} ${vy} ${w} ${h}">\n`;
     shapesToExport.forEach(shape => {
        const opacity = shape.opacity !== undefined ? shape.opacity : 1;
        if (shape.type === 'rect') {
           svgContent += `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.cornerRadius || 0}" fill="${shape.color || '#d9d9d9'}" stroke="${shape.strokeColor || 'none'}" stroke-width="${shape.strokeWidth || 0}" opacity="${opacity}" />\n`;
        } else if (shape.type === 'ellipse') {
           svgContent += `<ellipse cx="${shape.x + shape.width/2}" cy="${shape.y + shape.height/2}" rx="${shape.width/2}" ry="${shape.height/2}" fill="${shape.color || '#d9d9d9'}" stroke="${shape.strokeColor || 'none'}" stroke-width="${shape.strokeWidth || 0}" opacity="${opacity}" />\n`;
        } else if (shape.type === 'text') {
           svgContent += `<text x="${shape.x}" y="${shape.y + (shape.fontSize || 16)}" font-family="Inter, sans-serif" font-size="${shape.fontSize || 16}" fill="${shape.color || '#e0e0e0'}" opacity="${opacity}">${(shape.text || 'Text').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>\n`;
        } else if (shape.type === 'image' && shape.url) {
           svgContent += `<image href="${shape.url}" x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" opacity="${opacity}" />\n`;
        }
     });
     svgContent += `</svg>`;
     return { svgContent, w, h };
  };

  const handleExportPNG = () => {
    if (selectedShapeIds.length > 0) {
       // Smart Export PNG
       const exportData = getExportSVGString();
       if (!exportData) return;
       const { svgContent, w, h } = exportData;
       const blob = new Blob([svgContent], {type: 'image/svg+xml;charset=utf-8'});
       const url = URL.createObjectURL(blob);
       const img = new Image();
       img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const link = document.createElement('a');
          link.download = 'infinite-canvas-export.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
          URL.revokeObjectURL(url);
       };
       img.src = url;
    } else {
       // Fallback entire screen export if nothing selected
       const canvas = document.querySelector('canvas');
       if (canvas) {
          const link = document.createElement('a');
          link.download = 'infinite-canvas-screen.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
       }
    }
  };

  const handleExportSVG = () => {
     const exportData = getExportSVGString();
     if (!exportData) return;
     const blob = new Blob([exportData.svgContent], {type: "image/svg+xml"});
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.download = 'infinite-canvas-export.svg';
     link.href = url;
     link.click();
     URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <TopBar 
        currentTool={currentTool} 
        setCurrentTool={setCurrentTool} 
        onUndo={undo}
        onRedo={redo}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        camera={camera}
        setCamera={setCamera}
        theme={theme}
        setTheme={setTheme}
      />
      
      <div className="main-content">
        <LeftSidebar 
          shapes={shapes} 
          selectedShapeIds={selectedShapeIds} 
          setSelectedShapeIds={setSelectedShapeIds}
          updateShape={updateShape} 
        />
        
        <div className="canvas-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Canvas 
              shapes={shapes}
              addShape={addShape}
              updateShape={updateShape}
              currentTool={currentTool}
              setCurrentTool={setCurrentTool}
              awareness={awareness}
              clientId={clientId}
              selectedShapeIds={selectedShapeIds}
              setSelectedShapeIds={setSelectedShapeIds}
              camera={camera}
              setCamera={setCamera}
            />
            <Minimap shapes={shapes} camera={camera} setCamera={setCamera} />
          </div>
          <StatusBar selectedShapeIds={selectedShapeIds} shapes={shapes} camera={camera} />
        </div>

        <RightSidebar 
          selectedShapeIds={selectedShapeIds} 
          shapes={shapes} 
          updateShape={updateShape} 
        />
      </div>
    </div>
  );
}

export default App;
