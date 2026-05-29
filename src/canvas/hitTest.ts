import { SkillNode } from '../types';
import { getNodeRadius } from '../data/loader';

const CELL_SIZE = 500;

export class SpatialHash {
  private cells = new Map<string, string[]>();
  private nodeMap: Map<string, SkillNode>;

  constructor(nodeMap: Map<string, SkillNode>) {
    this.nodeMap = nodeMap;
    for (const [id, node] of nodeMap) {
      if (id === 'root') continue;
      const key = this.cellKey(node.x, node.y);
      let cell = this.cells.get(key);
      if (!cell) {
        cell = [];
        this.cells.set(key, cell);
      }
      cell.push(id);
    }
  }

  private cellKey(x: number, y: number): string {
    return `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
  }

  query(worldX: number, worldY: number): string | null {
    const col = Math.floor(worldX / CELL_SIZE);
    const row = Math.floor(worldY / CELL_SIZE);

    let bestId: string | null = null;
    let bestDist = Infinity;

    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const cell = this.cells.get(`${col + dc},${row + dr}`);
        if (!cell) continue;
        for (const id of cell) {
          const node = this.nodeMap.get(id)!;
          const dx = worldX - node.x;
          const dy = worldY - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radius = getNodeRadius(node);
          if (dist < radius && dist < bestDist) {
            bestDist = dist;
            bestId = id;
          }
        }
      }
    }

    return bestId;
  }
}
