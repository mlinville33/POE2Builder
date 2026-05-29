export function canAllocate(
  nodeId: string,
  allocated: Set<string>,
  adjacency: Map<string, Set<string>>,
): boolean {
  if (allocated.has(nodeId)) return false;
  const neighbors = adjacency.get(nodeId);
  if (!neighbors) return false;
  for (const n of neighbors) {
    if (allocated.has(n)) return true;
  }
  return false;
}

export function canDeallocate(
  nodeId: string,
  allocated: Set<string>,
  classStartId: string,
  adjacency: Map<string, Set<string>>,
): boolean {
  if (nodeId === classStartId) return false;

  const remaining = new Set(allocated);
  remaining.delete(nodeId);

  if (remaining.size <= 1) return true;

  const visited = new Set<string>();
  const queue = [classStartId];
  visited.add(classStartId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (remaining.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited.size === remaining.size;
}
