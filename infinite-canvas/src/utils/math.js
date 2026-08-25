export const screenToWorld = (screenX, screenY, camera) => {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  };
};

export const worldToScreen = (worldX, worldY, camera) => {
  return {
    x: worldX * camera.zoom + camera.x,
    y: worldY * camera.zoom + camera.y,
  };
};

export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

// Hit testing
export const isPointInRect = (px, py, rx, ry, rw, rh) => {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
};

// Hit testing for handles
export const getHitHandle = (px, py, rx, ry, rw, rh, zoom, handleSize = 6) => {
  const hSize = handleSize / zoom;
  const handles = {
    nw: { x: rx, y: ry },
    ne: { x: rx + rw, y: ry },
    sw: { x: rx, y: ry + rh },
    se: { x: rx + rw, y: ry + rh },
    n: { x: rx + rw/2, y: ry },
    s: { x: rx + rw/2, y: ry + rh },
    w: { x: rx, y: ry + rh/2 },
    e: { x: rx + rw, y: ry + rh/2 },
  };

  for (const [pos, h] of Object.entries(handles)) {
    if (px >= h.x - hSize/2 && px <= h.x + hSize/2 &&
        py >= h.y - hSize/2 && py <= h.y + hSize/2) {
      return pos;
    }
  }
  return null;
};

// Check if two rectangles intersect (for marquee selection)
export const isRectIntersecting = (r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) => {
  return !(r2x > r1x + r1w || 
           r2x + r2w < r1x || 
           r2y > r1y + r1h ||
           r2y + r2h < r1y);
};
