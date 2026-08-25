import React, { useRef, useEffect, useState } from 'react';
import { screenToWorld, worldToScreen, generateId, isPointInRect, getHitHandle, isRectIntersecting } from '../utils/math';

const Canvas = ({ 
  shapes, 
  addShape, 
  updateShape, 
  awareness, 
  clientId,
  currentTool,
  selectedShapeIds,
  setSelectedShapeIds
}) => {
  const canvasRef = useRef(null);
  
  // Camera state
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  
  // Interaction state
  const [dragState, setDragState] = useState({ 
    mode: null, // 'pan', 'draw', 'move', 'resize', 'marquee'
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    camStart: { x: 0, y: 0 },
    shapeStart: null, // For single shape resize/draw
    shapesStart: {}, // For multi-shape move
    handle: null
  });
  
  const [cursors, setCursors] = useState({});

  // Smart guides state
  const [guides, setGuides] = useState([]); // [{type: 'v', x: 100}, {type: 'h', y: 200}]

  // V9 features state
  const [chatMessage, setChatMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [editingTextId, setEditingTextId] = useState(null);
  const [lastClick, setLastClick] = useState({ time: 0, id: null });

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    if (!awareness) return;
    const handleAwarenessUpdate = () => {
      const states = Array.from(awareness.getStates().entries());
      const newCursors = {};
      states.forEach(([id, state]) => {
        if (id !== awareness.clientID && state.cursor) {
          newCursors[id] = { ...state.cursor, chat: state.chat };
        }
      });
      setCursors(newCursors);
    };
    awareness.on('change', handleAwarenessUpdate);
    return () => awareness.off('change', handleAwarenessUpdate);
  }, [awareness]);

  // Handle Chat shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        // If we press escape while in chat, exit
        if (e.key === 'Escape' && isChatting) {
           setIsChatting(false);
           setChatMessage('');
           awareness.setLocalStateField('chat', null);
           canvasRef.current?.focus();
        }
        return;
      }
      
      if (e.key === '/' && !editingTextId) {
        e.preventDefault();
        setIsChatting(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatting, editingTextId, awareness]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        canvasRef.current.width = parent.clientWidth;
        canvasRef.current.height = parent.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 50); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute selection bounding box
  const getSelectionBounds = () => {
    if (!selectedShapeIds || selectedShapeIds.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedShapeIds.forEach(id => {
      const shape = shapes[id];
      if (shape && shape.type !== 'path') {
        const w = shape.width || (shape.type === 'text' ? 100 : 0);
        const h = shape.height || (shape.type === 'text' ? 50 : 0);
        if (shape.x < minX) minX = shape.x;
        if (shape.y < minY) minY = shape.y;
        if (shape.x + w > maxX) maxX = shape.x + w;
        if (shape.y + h > maxY) maxY = shape.y + h;
      }
    });

    if (minX === Infinity) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cam = cameraRef.current;

      ctx.clearRect(0, 0, width, height);
      canvas.style.backgroundPosition = `${cam.x}px ${cam.y}px`;

      // Draw Shapes (Sorted by zIndex)
      const sortedShapes = Object.entries(shapes).sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0));

      sortedShapes.forEach(([id, shape]) => {
        if (shape.isHidden) return;
        ctx.save();
        ctx.globalAlpha = shape.opacity ?? 1;
        
        if (shape.type === 'rect') {
          const screenPos = worldToScreen(shape.x, shape.y, cam);
          const w = shape.width * cam.zoom;
          const h = shape.height * cam.zoom;
          const r = (shape.cornerRadius || 0) * cam.zoom;
          
          ctx.beginPath();
          if (r > 0) {
            ctx.roundRect(screenPos.x, screenPos.y, w, h, r);
          } else {
            ctx.rect(screenPos.x, screenPos.y, w, h);
          }
          
          if (shape.color) {
            ctx.fillStyle = shape.color;
            ctx.fill();
          }
          if (shape.strokeWidth > 0 && shape.strokeColor) {
            ctx.strokeStyle = shape.strokeColor;
            ctx.lineWidth = shape.strokeWidth * cam.zoom;
            ctx.stroke();
          }
        }
        else if (shape.type === 'ellipse') {
          const screenPos = worldToScreen(shape.x, shape.y, cam);
          const rx = (shape.width * cam.zoom) / 2;
          const ry = (shape.height * cam.zoom) / 2;
          
          ctx.beginPath();
          ctx.ellipse(screenPos.x + rx, screenPos.y + ry, rx, ry, 0, 0, 2 * Math.PI);
          
          if (shape.color) {
            ctx.fillStyle = shape.color;
            ctx.fill();
          }
          if (shape.strokeWidth > 0 && shape.strokeColor) {
            ctx.strokeStyle = shape.strokeColor;
            ctx.lineWidth = shape.strokeWidth * cam.zoom;
            ctx.stroke();
          }
        }
        else if (shape.type === 'text') {
          const screenPos = worldToScreen(shape.x, shape.y, cam);
          const fontSize = (shape.fontSize || 16) * cam.zoom;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textBaseline = 'top';
          ctx.fillStyle = shape.color || '#e0e0e0';
          
          const lines = (shape.text || 'Text').split('\n');
          lines.forEach((line, index) => {
            ctx.fillText(line, screenPos.x, screenPos.y + (index * fontSize * 1.2));
          });
        }
        else if (shape.type === 'path') {
           if (shape.points && shape.points.length > 0) {
              ctx.beginPath();
              ctx.strokeStyle = shape.color || '#f0f0f0';
              ctx.lineWidth = (shape.lineWidth || 3) * cam.zoom;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              const startPos = worldToScreen(shape.points[0].x, shape.points[0].y, cam);
              ctx.moveTo(startPos.x, startPos.y);
              for (let i = 1; i < shape.points.length; i++) {
                 const pos = worldToScreen(shape.points[i].x, shape.points[i].y, cam);
                 ctx.lineTo(pos.x, pos.y);
              }
              ctx.stroke();
           }
        }
        else if (shape.type === 'image') {
          const screenPos = worldToScreen(shape.x, shape.y, cam);
          const w = shape.width * cam.zoom;
          const h = shape.height * cam.zoom;
          
          if (shape.url) {
             const img = new Image();
             img.src = shape.url;
             if (img.complete) {
                ctx.drawImage(img, screenPos.x, screenPos.y, w, h);
             } else {
                ctx.fillStyle = '#444';
                ctx.fillRect(screenPos.x, screenPos.y, w, h);
                ctx.fillStyle = '#fff';
                ctx.font = '12px Inter';
                ctx.fillText('Loading...', screenPos.x + 10, screenPos.y + 20);
             }
          }
        }
        ctx.restore();
      });

      // Draw Selection Bounding Box (if items are selected and we are not drawing a marquee)
      if (selectedShapeIds && selectedShapeIds.length > 0 && dragState.mode !== 'marquee') {
        const bounds = getSelectionBounds();
        if (bounds) {
           const screenPos = worldToScreen(bounds.x, bounds.y, cam);
           const w = bounds.width * cam.zoom;
           const h = bounds.height * cam.zoom;

           ctx.strokeStyle = '#18a0fb';
           ctx.lineWidth = 1;
           ctx.strokeRect(screenPos.x, screenPos.y, w, h);

           // Draw handles
           const handleSize = 6;
           ctx.fillStyle = '#fff';
           ctx.strokeStyle = '#18a0fb';
           const drawHandle = (hx, hy) => {
             ctx.fillRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
             ctx.strokeRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
           };

           drawHandle(screenPos.x, screenPos.y); // nw
           drawHandle(screenPos.x + w, screenPos.y); // ne
           drawHandle(screenPos.x, screenPos.y + h); // sw
           drawHandle(screenPos.x + w, screenPos.y + h); // se
           drawHandle(screenPos.x + w/2, screenPos.y); // n
           drawHandle(screenPos.x + w/2, screenPos.y + h); // s
           drawHandle(screenPos.x + w, screenPos.y + h/2); // e
           drawHandle(screenPos.x, screenPos.y + h/2); // w
        }
      }

      // Draw Marquee Box
      if (dragState.mode === 'marquee') {
         const screenStart = worldToScreen(dragState.startPos.x, dragState.startPos.y, cam);
         const screenCurrent = worldToScreen(dragState.currentPos.x, dragState.currentPos.y, cam);
         
         ctx.fillStyle = 'rgba(24, 160, 251, 0.1)';
         ctx.strokeStyle = 'rgba(24, 160, 251, 0.8)';
         ctx.lineWidth = 1;
         
         const x = Math.min(screenStart.x, screenCurrent.x);
         const y = Math.min(screenStart.y, screenCurrent.y);
         const w = Math.abs(screenStart.x - screenCurrent.x);
         const h = Math.abs(screenStart.y - screenCurrent.y);
         
         ctx.fillRect(x, y, w, h);
         ctx.strokeRect(x, y, w, h);
      }

      // Draw Smart Guides
      if (guides.length > 0) {
         ctx.strokeStyle = 'red';
         ctx.lineWidth = 1;
         ctx.setLineDash([4, 4]);
         
         guides.forEach(g => {
            ctx.beginPath();
            if (g.type === 'v') {
               const sx = worldToScreen(g.val, 0, cam).x;
               ctx.moveTo(sx, 0);
               ctx.lineTo(sx, height);
            } else {
               const sy = worldToScreen(0, g.val, cam).y;
               ctx.moveTo(0, sy);
               ctx.lineTo(width, sy);
            }
            ctx.stroke();
         });
         ctx.setLineDash([]);
      }

      // Draw Multi-player Cursors
      Object.entries(cursors).forEach(([id, cursor]) => {
         const screenPos = worldToScreen(cursor.x, cursor.y, cam);
         ctx.fillStyle = cursor.color || '#f24822';
         ctx.beginPath();
         ctx.moveTo(screenPos.x, screenPos.y);
         ctx.lineTo(screenPos.x + 15, screenPos.y + 15);
         ctx.lineTo(screenPos.x + 5, screenPos.y + 15);
         ctx.lineTo(screenPos.x, screenPos.y + 22);
         ctx.fill();
         
         ctx.fillStyle = cursor.color || '#f24822';
         ctx.fillRect(screenPos.x + 12, screenPos.y + 16, 50, 18);
         ctx.fillStyle = '#fff';
         ctx.font = '10px Inter';
         ctx.fillText(`User ${id.toString().substring(0,4)}`, screenPos.x + 16, screenPos.y + 28);
         
         if (cursor.chat) {
           ctx.font = '13px Inter';
           const textMetrics = ctx.measureText(cursor.chat);
           const chatW = textMetrics.width + 24;
           ctx.fillStyle = '#fff';
           ctx.shadowColor = 'rgba(0,0,0,0.2)';
           ctx.shadowBlur = 10;
           ctx.shadowOffsetY = 4;
           ctx.beginPath();
           ctx.roundRect(screenPos.x + 12, screenPos.y + 38, chatW, 32, 16);
           ctx.fill();
           ctx.shadowColor = 'transparent';
           
           ctx.fillStyle = '#111';
           ctx.fillText(cursor.chat, screenPos.x + 24, screenPos.y + 59);
         }
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [shapes, cursors, selectedShapeIds, dragState, guides]);

  // Event Handlers
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomSensitivity = 0.001;
      const zoomDelta = -e.deltaY * zoomSensitivity;
      const newZoom = Math.min(Math.max(camera.zoom + zoomDelta, 0.1), 5);
      const mouseWorldBeforeZoom = screenToWorld(e.clientX, e.clientY, camera);
      const newCameraX = e.clientX - mouseWorldBeforeZoom.x * newZoom;
      const newCameraY = e.clientY - mouseWorldBeforeZoom.y * newZoom;
      setCamera({ x: newCameraX, y: newCameraY, zoom: newZoom });
    } else {
      setCamera(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handlePointerDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const worldPos = screenToWorld(clientX, clientY, cameraRef.current);
    
    if (e.button === 1 || currentTool === 'pan' || (e.button === 0 && e.shiftKey)) {
      setDragState({ mode: 'pan', startPos: { x: clientX, y: clientY }, currentPos: { x: clientX, y: clientY }, camStart: { x: camera.x, y: camera.y } });
      return;
    } 
    
    if (e.button === 0) {
      if (currentTool === 'select') {
        // 1. Check if hitting resize handle of selection box
        const bounds = getSelectionBounds();
        if (bounds) {
           const handle = getHitHandle(worldPos.x, worldPos.y, bounds.x, bounds.y, bounds.width, bounds.height, camera.zoom);
           if (handle) {
              // Resize only supports single shape for now in this implementation, to avoid complex group math
              if (selectedShapeIds.length === 1) {
                 const shape = shapes[selectedShapeIds[0]];
                 setDragState({ mode: 'resize', handle, startPos: worldPos, shapeStart: { ...shape }, currentPos: worldPos });
                 return;
              }
           }
        }

        // 2. Hit testing shapes (reverse order for z-index top-down)
        const sortedShapesDesc = Object.entries(shapes).sort((a, b) => (b[1].zIndex || 0) - (a[1].zIndex || 0));
        let hitId = null;
        for (const [id, shape] of sortedShapesDesc) {
          if (shape.isLocked || shape.isHidden) continue;
          if (shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'text' || shape.type === 'image') {
            let hitW = shape.width;
            let hitH = shape.height;
            if (shape.type === 'text' && hitW === 0) {
              hitW = 100; hitH = 20;
            }
            if (isPointInRect(worldPos.x, worldPos.y, shape.x, shape.y, hitW, hitH)) {
              hitId = id;
              break;
            }
          }
        }
        
        if (hitId) {
          const hitShape = shapes[hitId];
          
          const now = Date.now();
          if (now - lastClick.time < 300 && lastClick.id === hitId && hitShape.type === 'text') {
             setEditingTextId(hitId);
             setLastClick({ time: 0, id: null });
             return;
          }
          setLastClick({ time: now, id: hitId });

          let idsToSelect = [hitId];
          if (hitShape.groupId) {
             idsToSelect = Object.entries(shapes)
                .filter(([id, s]) => s.groupId === hitShape.groupId)
                .map(([id]) => id);
          }

          if (e.ctrlKey || e.metaKey) {
             const allCurrentlySelected = idsToSelect.every(id => selectedShapeIds.includes(id));
             if (allCurrentlySelected) {
                setSelectedShapeIds(selectedShapeIds.filter(id => !idsToSelect.includes(id)));
             } else {
                setSelectedShapeIds([...new Set([...selectedShapeIds, ...idsToSelect])]);
             }
          } else {
             if (!selectedShapeIds.includes(hitId)) {
                setSelectedShapeIds(idsToSelect);
             }
          }

          // Setup drag state for move
          // Ensure the hitId is in the list of things we will move
          const idsToMove = selectedShapeIds.includes(hitId) ? selectedShapeIds : [hitId];
          const shapesStart = {};
          idsToMove.forEach(id => {
             shapesStart[id] = { ...shapes[id] };
          });

          setDragState({ mode: 'move', startPos: worldPos, currentPos: worldPos, shapesStart });
        } else {
          // Clicked on empty space -> start marquee
          setSelectedShapeIds([]);
          setDragState({ mode: 'marquee', startPos: worldPos, currentPos: worldPos });
        }
        
      } else if (['rect', 'ellipse', 'text', 'image'].includes(currentTool)) {
        const id = generateId();
        setSelectedShapeIds([id]);
        
        const shapeData = {
           type: currentTool,
           x: worldPos.x,
           y: worldPos.y,
           width: currentTool === 'text' ? 100 : (currentTool === 'image' ? 200 : 0),
           height: currentTool === 'text' ? 50 : (currentTool === 'image' ? 200 : 0),
           color: currentTool === 'text' ? '#e0e0e0' : '#d9d9d9',
        };

        if (currentTool === 'text') {
           shapeData.text = 'Text';
           shapeData.fontSize = 16;
        } else if (currentTool === 'image') {
           shapeData.url = 'https://via.placeholder.com/200';
        } else {
           shapeData.strokeColor = '#000000';
           shapeData.strokeWidth = 0;
           shapeData.cornerRadius = 0;
        }

        addShape(id, shapeData);
        setDragState({ mode: 'draw', startPos: worldPos, currentPos: worldPos, shapeId: id });
      } else if (currentTool === 'pen') {
         const id = generateId();
         setSelectedShapeIds([id]);
         addShape(id, {
            type: 'path',
            points: [{ x: worldPos.x, y: worldPos.y }],
            color: '#e0e0e0',
            lineWidth: 3
         });
         setDragState({ mode: 'draw_pen', startPos: worldPos, currentPos: worldPos, shapeId: id });
      }
    }
  };

  const handlePointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const worldPos = screenToWorld(clientX, clientY, cameraRef.current);
    
    if (awareness) {
       awareness.setLocalStateField('cursor', {
          x: worldPos.x,
          y: worldPos.y,
          color: '#18a0fb'
       });
    }

    if (dragState.mode === 'pan') {
      const dx = clientX - dragState.startPos.x;
      const dy = clientY - dragState.startPos.y;
      setCamera({ ...cameraRef.current, x: dragState.camStart.x + dx, y: dragState.camStart.y + dy });
    } 
    else if (dragState.mode === 'marquee') {
      setDragState(prev => ({ ...prev, currentPos: worldPos }));
    }
    else if (dragState.mode === 'draw' && dragState.shapeId) {
      const width = worldPos.x - dragState.startPos.x;
      const height = worldPos.y - dragState.startPos.y;
      updateShape(dragState.shapeId, {
        x: width < 0 ? worldPos.x : dragState.startPos.x,
        y: height < 0 ? worldPos.y : dragState.startPos.y,
        width: Math.abs(width),
        height: Math.abs(height)
      });
    } 
    else if (dragState.mode === 'draw_pen' && dragState.shapeId) {
       const shape = shapes[dragState.shapeId];
       if (shape && shape.points) {
          updateShape(dragState.shapeId, { points: [...shape.points, { x: worldPos.x, y: worldPos.y }] });
       }
    }
    else if (dragState.mode === 'move') {
      let dx = worldPos.x - dragState.startPos.x;
      let dy = worldPos.y - dragState.startPos.y;

      if (e.shiftKey) {
        dx = Math.round(dx / 20) * 20;
        dy = Math.round(dy / 20) * 20;
      }
      
      const newGuides = [];
      const snapThreshold = 5 / camera.zoom; // 5 screen pixels

      // If moving a single shape, we can do snapping easily. Multi-shape snapping is too complex for this demo.
      if (Object.keys(dragState.shapesStart).length === 1) {
         const id = Object.keys(dragState.shapesStart)[0];
         const start = dragState.shapesStart[id];
         let snappedX = start.x + dx;
         let snappedY = start.y + dy;

         // Find snapping targets
         Object.entries(shapes).forEach(([otherId, otherShape]) => {
            if (otherId === id || otherShape.type === 'path') return;
            
            // X-axis snapping (left, center, right)
            const targetsX = [otherShape.x, otherShape.x + otherShape.width/2, otherShape.x + otherShape.width];
            const myX = [snappedX, snappedX + start.width/2, snappedX + start.width];
            
            for(let t of targetsX) {
               for(let i=0; i<3; i++) {
                  if (Math.abs(myX[i] - t) < snapThreshold) {
                     snappedX = t - (i === 0 ? 0 : (i === 1 ? start.width/2 : start.width));
                     newGuides.push({type: 'v', val: t});
                  }
               }
            }

            // Y-axis snapping (top, center, bottom)
            const targetsY = [otherShape.y, otherShape.y + otherShape.height/2, otherShape.y + otherShape.height];
            const myY = [snappedY, snappedY + start.height/2, snappedY + start.height];
            
            for(let t of targetsY) {
               for(let i=0; i<3; i++) {
                  if (Math.abs(myY[i] - t) < snapThreshold) {
                     snappedY = t - (i === 0 ? 0 : (i === 1 ? start.height/2 : start.height));
                     newGuides.push({type: 'h', val: t});
                  }
               }
            }
         });

         dx = snappedX - start.x;
         dy = snappedY - start.y;
      }
      
      setGuides(newGuides);

      // Apply movement to all selected shapes
      Object.entries(dragState.shapesStart).forEach(([id, startShape]) => {
         updateShape(id, {
            x: startShape.x + dx,
            y: startShape.y + dy
         });
      });
    }
    else if (dragState.mode === 'resize' && selectedShapeIds.length === 1) {
      const id = selectedShapeIds[0];
      const dx = worldPos.x - dragState.startPos.x;
      const dy = worldPos.y - dragState.startPos.y;
      const start = dragState.shapeStart;
      let newX = start.x;
      let newY = start.y;
      let newW = start.width;
      let newH = start.height;

      if (dragState.handle.includes('w')) {
        newX = start.x + dx;
        newW = start.width - dx;
      }
      if (dragState.handle.includes('e')) {
        newW = start.width + dx;
      }
      if (dragState.handle.includes('n')) {
        newY = start.y + dy;
        newH = start.height - dy;
      }
      if (dragState.handle.includes('s')) {
        newH = start.height + dy;
      }

      if (newW < 0) { newX += newW; newW = Math.abs(newW); }
      if (newH < 0) { newY += newH; newH = Math.abs(newH); }

      updateShape(id, { x: newX, y: newY, width: newW, height: newH });
    }
  };

  const handlePointerUp = () => {
    // If ending a marquee drag, calculate intersections
    if (dragState.mode === 'marquee') {
       const minX = Math.min(dragState.startPos.x, dragState.currentPos.x);
       const minY = Math.min(dragState.startPos.y, dragState.currentPos.y);
       const maxW = Math.abs(dragState.startPos.x - dragState.currentPos.x);
       const maxH = Math.abs(dragState.startPos.y - dragState.currentPos.y);

       const newlySelected = [];
       Object.entries(shapes).forEach(([id, shape]) => {
          if (shape.type === 'path' || shape.isLocked || shape.isHidden) return;
          let w = shape.width || 100;
          let h = shape.height || 50;
          if (isRectIntersecting(minX, minY, maxW, maxH, shape.x, shape.y, w, h)) {
             newlySelected.push(id);
          }
       });

       const groupIdsToInclude = new Set();
       newlySelected.forEach(id => {
          if (shapes[id].groupId) groupIdsToInclude.add(shapes[id].groupId);
       });
       
       const finalSelection = [...newlySelected];
       Object.entries(shapes).forEach(([id, shape]) => {
          if (shape.groupId && groupIdsToInclude.has(shape.groupId) && !finalSelection.includes(id)) {
             finalSelection.push(id);
          }
       });

       setSelectedShapeIds(finalSelection);
    }

    setDragState({ mode: null, startPos: { x: 0, y: 0 } });
    setGuides([]);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: currentTool === 'pan' || dragState.mode === 'pan' ? 'grab' : (currentTool !== 'select' ? 'crosshair' : 'default')
        }}
      />
      
      {/* On-Canvas Text Editing Overlay */}
      {editingTextId && shapes[editingTextId] && (
        <textarea
          autoFocus
          defaultValue={shapes[editingTextId].text || ''}
          onBlur={(e) => {
             updateShape(editingTextId, { text: e.target.value });
             setEditingTextId(null);
          }}
          onKeyDown={(e) => {
             if (e.key === 'Escape') setEditingTextId(null);
             // Stop propagation so App.jsx doesn't delete it
             e.stopPropagation();
          }}
          style={{
            position: 'absolute',
            left: `${worldToScreen(shapes[editingTextId].x, shapes[editingTextId].y, camera).x}px`,
            top: `${worldToScreen(shapes[editingTextId].x, shapes[editingTextId].y, camera).y}px`,
            fontSize: `${(shapes[editingTextId].fontSize || 16) * camera.zoom}px`,
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.2,
            color: shapes[editingTextId].color || '#e0e0e0',
            background: 'transparent',
            border: '1px solid var(--accent)',
            outline: 'none',
            resize: 'none',
            padding: 0,
            margin: 0,
            overflow: 'hidden',
            whiteSpace: 'pre',
            zIndex: 100
          }}
        />
      )}

      {/* Cursor Chat Input Overlay */}
      {isChatting && awareness && (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '24px',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: '#fff',
          borderRadius: '24px',
          padding: '4px 16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
           <div style={{ fontSize: '14px', color: '#111', fontWeight: 600 }}>💬 Chat</div>
           <input
             autoFocus
             value={chatMessage}
             placeholder="Say something..."
             onChange={(e) => {
                setChatMessage(e.target.value);
                awareness.setLocalStateField('chat', e.target.value);
             }}
             onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                   setIsChatting(false);
                   setChatMessage('');
                   // Leave message visible for 3s then clear
                   setTimeout(() => {
                      awareness.setLocalStateField('chat', null);
                   }, 3000);
                }
                e.stopPropagation();
             }}
             onBlur={() => {
                setIsChatting(false);
                setTimeout(() => awareness.setLocalStateField('chat', null), 3000);
             }}
             style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '14px',
                color: '#111',
                width: '200px',
                padding: '8px 0'
             }}
           />
        </div>
      )}
    </div>
  );
};

export default Canvas;
