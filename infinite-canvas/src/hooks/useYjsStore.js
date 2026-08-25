import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { v4 as uuidv4 } from 'uuid';

// Singleton for the Yjs doc and provider to avoid re-creation
let ydoc;
let provider;
let shapesMap;
let undoManager;

const initYjs = () => {
  if (!ydoc) {
    ydoc = new Y.Doc();
    provider = new WebrtcProvider('infinite-canvas-collab-demo-v1', ydoc, {
      signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com', 'wss://y-webrtc-signaling-us.herokuapp.com']
    });
    shapesMap = ydoc.getMap('shapes');
    undoManager = new Y.UndoManager(shapesMap);
  }
  return { ydoc, provider, shapesMap, undoManager };
};

export const useYjsStore = () => {
  const [shapes, setShapes] = useState({});
  const [awareness, setAwareness] = useState(null);
  const [clientId, setClientId] = useState('');
  const [selectedShapeIds, setSelectedShapeIds] = useState([]);

  useEffect(() => {
    const { ydoc, provider, shapesMap } = initYjs();
    setAwareness(provider.awareness);
    setClientId(ydoc.clientID.toString());

    // Initial state
    setShapes(shapesMap.toJSON());

    // Observe changes
    const observeShapes = () => {
      setShapes(shapesMap.toJSON());
    };

    shapesMap.observe(observeShapes);

    return () => {
      shapesMap.unobserve(observeShapes);
    };
  }, []);

  const getMaxZIndex = () => {
     const currentShapes = initYjs().shapesMap.toJSON();
     let maxZ = 0;
     Object.values(currentShapes).forEach(s => {
        if (s.zIndex && s.zIndex > maxZ) maxZ = s.zIndex;
     });
     return maxZ;
  };

  const addShape = (id, shapeData) => {
    const { shapesMap } = initYjs();
    shapesMap.set(id, { ...shapeData, zIndex: getMaxZIndex() + 1 });
  };

  const updateShape = (id, shapeData) => {
    const { shapesMap } = initYjs();
    // In a map, updating is the same as setting. We merge the old data if needed.
    const oldShape = shapesMap.get(id) || {};
    shapesMap.set(id, { ...oldShape, ...shapeData });
  };

  const removeShape = (id) => {
    const { shapesMap } = initYjs();
    shapesMap.delete(id);
  };
  
  const clearAllShapes = () => {
     const { shapesMap } = initYjs();
     const keys = Array.from(shapesMap.keys());
     keys.forEach(key => shapesMap.delete(key));
  }

  const undo = () => {
     const { undoManager } = initYjs();
     undoManager.undo();
  };

  const redo = () => {
     const { undoManager } = initYjs();
     undoManager.redo();
  };

  return { 
    shapes, addShape, updateShape, removeShape, clearAllShapes, 
    awareness, clientId,
    selectedShapeIds, setSelectedShapeIds,
    undo, redo, getMaxZIndex
  };
};
