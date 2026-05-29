import { TreeState, SelectedSkill } from '../types';

export interface SavedBuildPayload {
  name: string;
  selectedClass: number;
  selectedAscendancy: string | null;
  allocatedNodes: string[];
  skills: SelectedSkill[];
}

export interface SaveResult {
  slug: string;
  savedAt: string;
}

export interface BuildListItem {
  slug: string;
  name: string;
  savedAt: string;
}

export async function listBuilds(): Promise<BuildListItem[]> {
  const res = await fetch('/api/builds');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function loadBuild(slug: string): Promise<SavedBuildPayload> {
  const res = await fetch(`/api/builds/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function saveBuild(state: TreeState): Promise<SaveResult> {
  if (!state.buildName || state.selectedClass === null) {
    throw new Error('Build must have a name and class before saving');
  }
  const payload: SavedBuildPayload = {
    name: state.buildName,
    selectedClass: state.selectedClass,
    selectedAscendancy: state.selectedAscendancy,
    allocatedNodes: [...state.allocatedNodes],
    skills: state.skills,
  };
  const res = await fetch('/api/builds/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return await res.json();
}
