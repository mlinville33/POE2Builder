import { useRef, useEffect, useCallback } from 'react';
import { SkillNode, SkillEdge, TreeAction } from '../types';
import { Viewport } from './viewport';
import { SpatialHash } from './hitTest';
import { renderTree } from './renderer';

interface Props {
  displayNodeMap: Map<string, SkillNode>;
  displayEdges: SkillEdge[];
  allocatedNodes: Set<string>;
  hoveredNode: string | null;
  dispatch: React.Dispatch<TreeAction>;
  onHoverScreenPos: (pos: { x: number; y: number } | null) => void;
  fitBounds: { minX: number; minY: number; maxX: number; maxY: number };
  nameOverrides: Map<string, string>;
}

export function SkillTreeCanvas({ displayNodeMap, displayEdges, allocatedNodes, hoveredNode, dispatch, onHoverScreenPos, fitBounds, nameOverrides }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef(new Viewport());
  const spatialHashRef = useRef<SpatialHash | null>(null);
  const dirtyRef = useRef(true);
  const dragRef = useRef<{ startX: number; startY: number; centerX: number; centerY: number; moved: boolean } | null>(null);

  const stateRef = useRef({ allocatedNodes, hoveredNode });
  stateRef.current = { allocatedNodes, hoveredNode };

  const displayRef = useRef({ displayNodeMap, displayEdges, nameOverrides });
  displayRef.current = { displayNodeMap, displayEdges, nameOverrides };

  useEffect(() => {
    spatialHashRef.current = new SpatialHash(displayNodeMap);
    dirtyRef.current = true;
  }, [displayNodeMap]);

  useEffect(() => {
    dirtyRef.current = true;
  }, [allocatedNodes, hoveredNode, displayEdges, nameOverrides]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.offsetWidth;
    const h = parent.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const vp = viewportRef.current;
    vp.canvasWidth = canvas.width;
    vp.canvasHeight = canvas.height;
    dirtyRef.current = true;
  }, []);

  useEffect(() => {
    resize();
    const vp = viewportRef.current;
    vp.fitBounds(fitBounds.minX, fitBounds.minY, fitBounds.maxX, fitBounds.maxY);
    dirtyRef.current = true;

    const observer = new ResizeObserver(resize);
    observer.observe(canvasRef.current!.parentElement!);
    return () => observer.disconnect();
  }, [fitBounds, resize]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let rafId: number;

    const loop = () => {
      if (dirtyRef.current) {
        const { displayNodeMap: dnm, displayEdges: de, nameOverrides: no } = displayRef.current;
        renderTree(ctx, viewportRef.current, dnm, de, stateRef.current.allocatedNodes, stateRef.current.hoveredNode, no);
        dirtyRef.current = false;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const getMousePos = useCallback((e: React.MouseEvent): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return [(e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr];
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const [sx, sy] = getMousePos(e);
    const vp = viewportRef.current;
    dragRef.current = { startX: sx, startY: sy, centerX: vp.centerX, centerY: vp.centerY, moved: false };
  }, [getMousePos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const [sx, sy] = getMousePos(e);
    const vp = viewportRef.current;

    if (dragRef.current) {
      const dx = sx - dragRef.current.startX;
      const dy = sy - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
      if (dragRef.current.moved) {
        vp.centerX = dragRef.current.centerX - dx / vp.zoom;
        vp.centerY = dragRef.current.centerY - dy / vp.zoom;
        dirtyRef.current = true;
        onHoverScreenPos(null);
        dispatch({ type: 'SET_HOVER', nodeId: null });
        return;
      }
    }

    const [wx, wy] = vp.screenToWorld(sx, sy);
    const hit = spatialHashRef.current?.query(wx, wy) ?? null;
    if (hit !== stateRef.current.hoveredNode) {
      dispatch({ type: 'SET_HOVER', nodeId: hit });
      if (hit) {
        const node = displayRef.current.displayNodeMap.get(hit)!;
        const [scrX, scrY] = vp.worldToScreen(node.x, node.y);
        const dpr = window.devicePixelRatio || 1;
        onHoverScreenPos({ x: scrX / dpr, y: scrY / dpr });
      } else {
        onHoverScreenPos(null);
      }
    }
  }, [getMousePos, dispatch, onHoverScreenPos]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && !drag.moved) {
      const [sx, sy] = getMousePos(e);
      const vp = viewportRef.current;
      const [wx, wy] = vp.screenToWorld(sx, sy);
      const hit = spatialHashRef.current?.query(wx, wy) ?? null;
      if (hit) {
        if (stateRef.current.allocatedNodes.has(hit)) {
          dispatch({ type: 'DEALLOCATE_NODE', nodeId: hit });
        } else {
          dispatch({ type: 'ALLOCATE_NODE', nodeId: hit });
        }
      }
    }
  }, [getMousePos, dispatch]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const [sx, sy] = getMousePos(e);
    viewportRef.current.zoomAt(sx, sy, e.deltaY);
    dirtyRef.current = true;

    const vp = viewportRef.current;
    const [wx, wy] = vp.screenToWorld(sx, sy);
    const hit = spatialHashRef.current?.query(wx, wy) ?? null;
    if (hit !== stateRef.current.hoveredNode) {
      dispatch({ type: 'SET_HOVER', nodeId: hit });
    }
  }, [getMousePos, dispatch]);

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
    dispatch({ type: 'SET_HOVER', nodeId: null });
    onHoverScreenPos(null);
  }, [dispatch, onHoverScreenPos]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', cursor: dragRef.current?.moved ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onMouseLeave={handleMouseLeave}
    />
  );
}
