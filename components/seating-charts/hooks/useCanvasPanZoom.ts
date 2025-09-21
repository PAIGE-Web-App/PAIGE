import { useState, useCallback, useEffect } from 'react';

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export const useCanvasPanZoom = (initialScale: number = 1.5, draggedTable?: string | null) => {
  const [canvasTransform, setCanvasTransform] = useState<CanvasTransform>(() => {
    // Try to load from sessionStorage first
    const savedTransform = sessionStorage.getItem('seating-chart-canvas-transform');
    if (savedTransform) {
      try {
        const parsed = JSON.parse(savedTransform);
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number' && typeof parsed.scale === 'number') {
          return parsed;
        }
      } catch (error) {
        console.warn('Failed to parse saved canvas transform:', error);
      }
    }
    
    // Fallback to default transform
    return { 
      x: 0, 
      y: 0, 
      scale: initialScale 
    };
  });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [canvasDragStart, setCanvasDragStart] = useState({ x: 0, y: 0 });

  // Save canvas transform to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('seating-chart-canvas-transform', JSON.stringify(canvasTransform));
  }, [canvasTransform]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent, draggedTable: string | null) => {
    const target = e.target as HTMLElement;
    
    if ((target.tagName === 'svg' || 
         target.getAttribute('id') === 'grid' ||
         target.classList.contains('canvas-background')) &&
        !draggedTable) {
      e.preventDefault();
      setIsDraggingCanvas(true);
      setCanvasDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleCanvasAltMouseDown = useCallback((e: React.MouseEvent, draggedTable: string | null) => {
    if (e.altKey && !draggedTable) {
      e.preventDefault();
      setIsDraggingCanvas(true);
      setCanvasDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingCanvas) return;
    
    const deltaX = e.clientX - canvasDragStart.x;
    const deltaY = e.clientY - canvasDragStart.y;
    
    setCanvasTransform(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setCanvasDragStart({ x: e.clientX, y: e.clientY });
  }, [isDraggingCanvas, canvasDragStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDraggingCanvas(false);
  }, []);

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    // Don't zoom if a table is being dragged
    if (draggedTable) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Prevent default scrolling behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Smooth zoom factor - smaller steps for more precise control
    const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const newScale = Math.max(0.1, Math.min(5, canvasTransform.scale * scaleFactor));
    
    // Get the mouse position relative to the SVG
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate the point under the mouse before scaling
    const pointBeforeScale = {
      x: (mouseX - canvasTransform.x) / canvasTransform.scale,
      y: (mouseY - canvasTransform.y) / canvasTransform.scale
    };
    
    // Calculate the point under the mouse after scaling
    const pointAfterScale = {
      x: (mouseX - canvasTransform.x) / newScale,
      y: (mouseY - canvasTransform.y) / newScale
    };
    
    // Calculate the offset to keep the point under the mouse
    const offsetX = (pointAfterScale.x - pointBeforeScale.x) * newScale;
    const offsetY = (pointAfterScale.y - pointBeforeScale.y) * newScale;
    
    setCanvasTransform(prev => ({
      x: prev.x + offsetX,
      y: prev.y + offsetY,
      scale: newScale
    }));
  }, [canvasTransform.x, canvasTransform.y, canvasTransform.scale, draggedTable]);

  const resetCanvas = useCallback(() => {
    setCanvasTransform({ x: 0, y: 0, scale: initialScale });
  }, [initialScale]);

  // Helper function to zoom to a specific point
  const zoomToPoint = useCallback((x: number, y: number, targetScale: number) => {
    const newScale = Math.max(0.1, Math.min(5, targetScale));
    
    // Calculate the center of the viewport
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    
    // Calculate the offset to center the zoom on the specified point
    const offsetX = (viewportCenterX - x) * newScale;
    const offsetY = (viewportCenterY - y) * newScale;
    
    setCanvasTransform({
      x: offsetX,
      y: offsetY,
      scale: newScale
    });
  }, []);

  return {
    canvasTransform,
    isDraggingCanvas,
    handleCanvasMouseDown,
    handleCanvasAltMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasWheel,
    resetCanvas,
    zoomToPoint
  };
};
