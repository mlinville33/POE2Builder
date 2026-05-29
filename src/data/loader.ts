import { SkillTreeData, SkillNode, SkillEdge } from '../types';

export interface AscendancyInfo {
  id: string;
  name: string;
  nodeIds: string[];
  centerX: number;
  centerY: number;
}

export interface ProcessedTree {
  raw: SkillTreeData;
  nodeMap: Map<string, SkillNode>;
  adjacency: Map<string, Set<string>>;
  classStartNodes: Map<number, string>;
  ascendancies: Map<string, AscendancyInfo>;
}

export async function loadTreeData(): Promise<ProcessedTree> {
  const resp = await fetch('/skill_tree.json');
  const raw = await resp.json();

  const edges: SkillEdge[] = raw.edges.map((e: { from: string | number; to: string | number; orbit?: number; orbitX?: number; orbitY?: number }) => ({
    from: String(e.from),
    to: String(e.to),
    orbit: e.orbit,
    orbitX: e.orbitX,
    orbitY: e.orbitY,
  }));

  const nodeMap = new Map<string, SkillNode>();
  for (const [key, node] of Object.entries(raw.nodes)) {
    const n = node as SkillNode;
    if (key === 'root') {
      nodeMap.set('root', { ...n, x: 0, y: 0, id: 'root', name: '', icon: '', stats: [], out: n.out || [], in: n.in || [], edges: n.edges || [], skill: 0, orbit: 0, orbitIndex: 0, group: 0 });
    } else {
      nodeMap.set(key, { ...n });
    }
  }

  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.from === 'root' || edge.to === 'root') continue;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set());
    adjacency.get(edge.from)!.add(edge.to);
    adjacency.get(edge.to)!.add(edge.from);
  }

  const classStartNodes = new Map<number, string>();
  for (const [key, node] of nodeMap) {
    if (node.classStartIndex) {
      classStartNodes.set(node.classStartIndex[0], key);
      classStartNodes.set(node.classStartIndex[1], key);
    }
  }

  const ascNodesByAsc = new Map<string, string[]>();
  for (const [key, node] of nodeMap) {
    if (node.ascendancyId) {
      let list = ascNodesByAsc.get(node.ascendancyId);
      if (!list) {
        list = [];
        ascNodesByAsc.set(node.ascendancyId, list);
      }
      list.push(key);
    }
  }

  const ascendancies = new Map<string, AscendancyInfo>();
  for (const cls of raw.classes) {
    for (const asc of cls.ascendancies) {
      if (!asc.name || !asc.id) continue;
      const nodeIds = ascNodesByAsc.get(asc.id) || [];
      if (nodeIds.length === 0) continue;
      let sumX = 0, sumY = 0;
      for (const nid of nodeIds) {
        const n = nodeMap.get(nid)!;
        sumX += n.x;
        sumY += n.y;
      }
      ascendancies.set(asc.id, {
        id: asc.id,
        name: asc.name,
        nodeIds,
        centerX: sumX / nodeIds.length,
        centerY: sumY / nodeIds.length,
      });
    }
  }

  const data: SkillTreeData = { ...raw, edges, nodes: raw.nodes };

  return { raw: data, nodeMap, adjacency, classStartNodes, ascendancies };
}

export function buildDisplayNodeMap(
  nodeMap: Map<string, SkillNode>,
  selectedAscendancy: string | null,
  ascendancies: Map<string, AscendancyInfo>,
): Map<string, SkillNode> {
  const display = new Map<string, SkillNode>();

  for (const [id, node] of nodeMap) {
    if (node.ascendancyId) continue;
    if (node.isMastery) continue;
    display.set(id, node);
  }

  if (selectedAscendancy) {
    const info = ascendancies.get(selectedAscendancy);
    if (info) {
      for (const nid of info.nodeIds) {
        const node = nodeMap.get(nid)!;
        display.set(nid, {
          ...node,
          x: node.x - info.centerX,
          y: node.y - info.centerY,
        });
      }
    }
  }

  return display;
}

export function buildDisplayEdges(
  edges: SkillEdge[],
  nodeMap: Map<string, SkillNode>,
  selectedAscendancy: string | null,
  ascendancies: Map<string, AscendancyInfo>,
): SkillEdge[] {
  if (!selectedAscendancy) {
    return edges.filter(e => {
      if (e.from === 'root' || e.to === 'root') return true;
      const fn = nodeMap.get(e.from);
      const tn = nodeMap.get(e.to);
      return fn && tn && !fn.ascendancyId && !tn.ascendancyId && !fn.isMastery && !tn.isMastery;
    });
  }

  const info = ascendancies.get(selectedAscendancy);
  if (!info) return edges;

  const ascNodeSet = new Set(info.nodeIds);
  return edges
    .filter(e => {
      if (e.from === 'root' || e.to === 'root') return true;
      const fn = nodeMap.get(e.from);
      const tn = nodeMap.get(e.to);
      if (!fn || !tn) return false;
      if (fn.isMastery || tn.isMastery) return false;
      if (fn.ascendancyId && !ascNodeSet.has(e.from)) return false;
      if (tn.ascendancyId && !ascNodeSet.has(e.to)) return false;
      return true;
    })
    .map(e => {
      const fn = nodeMap.get(e.from);
      const tn = nodeMap.get(e.to);
      if (fn?.ascendancyId || tn?.ascendancyId) {
        return {
          ...e,
          orbitX: e.orbitX !== undefined ? e.orbitX - info.centerX : undefined,
          orbitY: e.orbitY !== undefined ? e.orbitY - info.centerY : undefined,
        };
      }
      return e;
    });
}

export function getNodeRadius(node: SkillNode): number {
  if (node.classStartIndex) return 45;
  if (node.isKeystone) return 40;
  if (node.isAscendancyStart) return 30;
  if (node.isNotable) return 28;
  if (node.isMastery) return 24;
  if (node.isJewelSocket) return 22;
  return 18;
}

export function cleanStatText(stat: string): string {
  return stat
    .replace(/\[([^\]|]*)\|([^\]]*)\]/g, '$2')
    .replace(/\[([^\]]*)\]/g, '$1');
}
