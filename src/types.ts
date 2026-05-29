export interface SkillNode {
  id: string;
  skill: number;
  name: string;
  icon: string;
  stats: string[];
  group: number;
  orbit: number;
  orbitIndex: number;
  x: number;
  y: number;
  out: string[];
  in: string[];
  edges: number[];
  isNotable?: boolean;
  isKeystone?: boolean;
  isMastery?: boolean;
  isJewelSocket?: boolean;
  isGenericAttribute?: boolean;
  ascendancyId?: string;
  isAscendancyStart?: boolean;
  classStartIndex?: [number, number];
  flavourText?: string[];
  recipe?: string[];
  activeEffectImage?: string;
  unlockConstraint?: { nodes: number[]; ascendancy?: string };
  grantedSkill?: Record<string, unknown>;
}

export interface SkillEdge {
  from: string;
  to: string;
  orbit?: number;
  orbitX?: number;
  orbitY?: number;
}

export interface SkillGroup {
  x: number;
  y: number;
  orbits: number[];
  nodes: string[];
}

export interface ClassDef {
  name: string;
  base_str: number;
  base_dex: number;
  base_int: number;
  image: string;
  image_offset_x: number;
  image_offset_y: number;
  ascendancies: AscendancyDef[];
  overridePairs?: Record<string, string>;
}

export interface AscendancyDef {
  id: string;
  name: string | null;
  image: string;
  offsetX: number;
  offsetY: number;
  flavourText?: string;
  flavourTextColour?: string;
}

export interface SkillTreeData {
  tree: string;
  classes: ClassDef[];
  groups: Record<string, SkillGroup>;
  nodes: Record<string, SkillNode>;
  edges: SkillEdge[];
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

export interface SelectedSkill {
  gemId: string;
  supportIds: string[];
  note?: string;
}

export interface SelectedGearPiece {
  basePath: string;
  uniqueName?: string;
}

export interface TreeState {
  selectedClass: number | null;
  selectedAscendancy: string | null;
  allocatedNodes: Set<string>;
  hoveredNode: string | null;
  skills: SelectedSkill[];
  gear: Record<string, SelectedGearPiece>;
  buildName: string | null;
}

export type TreeAction =
  | { type: 'SELECT_CLASS'; classIndex: number; startNodeId: string }
  | { type: 'SELECT_ASCENDANCY'; ascendancyId: string | null }
  | { type: 'ALLOCATE_NODE'; nodeId: string }
  | { type: 'DEALLOCATE_NODE'; nodeId: string }
  | { type: 'SET_HOVER'; nodeId: string | null }
  | { type: 'NEW_BUILD'; name: string; classIndex: number; startNodeId: string; ascendancyId: string | null }
  | { type: 'LOAD_BUILD'; name: string; classIndex: number; ascendancyId: string | null; allocatedNodes: string[]; skills: SelectedSkill[]; gear?: Record<string, SelectedGearPiece> }
  | { type: 'ADD_SKILL'; gemId: string }
  | { type: 'REMOVE_SKILL'; index: number }
  | { type: 'ADD_SUPPORT'; skillIndex: number; supportId: string }
  | { type: 'REMOVE_SUPPORT'; skillIndex: number; supportId: string }
  | { type: 'SET_GEAR'; slot: string; piece: SelectedGearPiece }
  | { type: 'CLEAR_GEAR'; slot: string }
  | { type: 'RESET' };
