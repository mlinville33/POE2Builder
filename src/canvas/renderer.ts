import { SkillNode, SkillEdge } from '../types';
import { getNodeRadius } from '../data/loader';
import { Viewport } from './viewport';

interface NodeColors {
  fill: string;
  stroke: string;
}

function getNodeColors(node: SkillNode, allocated: boolean): NodeColors {
  if (node.ascendancyId) {
    if (node.isAscendancyStart) return allocated ? { fill: '#f0d878', stroke: '#ffe890' } : { fill: '#7a6a98', stroke: '#c0a8e0' };
    if (node.isNotable) return allocated ? { fill: '#a8e060', stroke: '#c0ff80' } : { fill: '#5a8048', stroke: '#90d068' };
    if (node.isKeystone) return allocated ? { fill: '#f09060', stroke: '#ffb880' } : { fill: '#906048', stroke: '#d0a070' };
    return allocated ? { fill: '#b0b0f0', stroke: '#d0d0ff' } : { fill: '#5a5a8a', stroke: '#9898d0' };
  }
  if (node.classStartIndex) return allocated ? { fill: '#88a0f0', stroke: '#b0c8ff' } : { fill: '#4a5a90', stroke: '#88a0d0' };
  if (node.isKeystone) return allocated ? { fill: '#f09060', stroke: '#ffb880' } : { fill: '#905838', stroke: '#d09060' };
  if (node.isNotable) return allocated ? { fill: '#a8e060', stroke: '#c0ff80' } : { fill: '#5a8848', stroke: '#88d068' };
  if (node.isMastery) return allocated ? { fill: '#9898f0', stroke: '#b8b8ff' } : { fill: '#585890', stroke: '#9090d0' };
  if (node.isJewelSocket) return allocated ? { fill: '#70f0f0', stroke: '#90ffff' } : { fill: '#488080', stroke: '#78d0d0' };
  return allocated ? { fill: '#f0d070', stroke: '#ffe890' } : { fill: '#807048', stroke: '#c8b070' };
}

export function renderTree(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  displayNodeMap: Map<string, SkillNode>,
  displayEdges: SkillEdge[],
  allocated: Set<string>,
  hoveredNode: string | null,
  nameOverrides: Map<string, string>,
) {
  viewport.resetTransform(ctx);
  ctx.fillStyle = '#0c0c0e';
  ctx.fillRect(0, 0, viewport.canvasWidth, viewport.canvasHeight);

  viewport.applyTransform(ctx);

  const bounds = viewport.getVisibleBounds();

  drawEdges(ctx, displayEdges, displayNodeMap, allocated, bounds);
  drawNodes(ctx, displayNodeMap, allocated, hoveredNode, bounds, nameOverrides);

  if (hoveredNode) {
    const node = displayNodeMap.get(hoveredNode);
    if (node) {
      const r = getNodeRadius(node) + 4;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

function isInBounds(x: number, y: number, bounds: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  edges: SkillEdge[],
  nodeMap: Map<string, SkillNode>,
  allocated: Set<string>,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
) {
  const inactive = new Path2D();
  const partial = new Path2D();
  const active = new Path2D();

  for (const edge of edges) {
    if (edge.from === 'root' || edge.to === 'root') continue;
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) continue;

    const eitherVisible =
      isInBounds(fromNode.x, fromNode.y, bounds) ||
      isInBounds(toNode.x, toNode.y, bounds);
    if (!eitherVisible) continue;

    const bothAlloc = allocated.has(edge.from) && allocated.has(edge.to);
    const eitherAlloc = allocated.has(edge.from) || allocated.has(edge.to);
    const path = bothAlloc ? active : eitherAlloc ? partial : inactive;

    path.moveTo(fromNode.x, fromNode.y);
    path.lineTo(toNode.x, toNode.y);
  }

  ctx.lineCap = 'round';

  ctx.strokeStyle = '#707070';
  ctx.lineWidth = 2;
  ctx.stroke(inactive);

  ctx.strokeStyle = '#807840';
  ctx.lineWidth = 2;
  ctx.stroke(partial);

  ctx.shadowColor = '#ffe080';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#ffe890';
  ctx.lineWidth = 6;
  ctx.stroke(active);
  ctx.shadowBlur = 0;
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodeMap: Map<string, SkillNode>,
  allocated: Set<string>,
  _hoveredNode: string | null,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  nameOverrides: Map<string, string>,
) {
  const sortedNodes: [string, SkillNode][] = [];
  for (const [id, node] of nodeMap) {
    if (id === 'root') continue;
    if (!isInBounds(node.x, node.y, bounds)) continue;
    sortedNodes.push([id, node]);
  }

  sortedNodes.sort((a, b) => getNodeRadius(a[1]) - getNodeRadius(b[1]));

  for (const [id, node] of sortedNodes) {
    const isAlloc = allocated.has(id);
    const radius = getNodeRadius(node);
    const colors = getNodeColors(node, isAlloc);

    ctx.beginPath();
    if (node.isJewelSocket) {
      drawDiamond(ctx, node.x, node.y, radius);
    } else {
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    }
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = node.isKeystone ? 3 : node.isNotable ? 2 : 1.5;
    ctx.stroke();

    if (node.classStartIndex) {
      const label = nameOverrides.get(id);
      if (label) {
        ctx.fillStyle = isAlloc ? '#ffffff' : '#c0c0c0';
        const fontSize = Math.max(14, radius * 0.5);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, node.y);
      }
    }
  }
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}
