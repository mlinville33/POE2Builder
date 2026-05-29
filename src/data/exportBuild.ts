import { SkillNode, ClassDef, SelectedSkill, SelectedGearPiece } from '../types';

interface BuildSupport {
  id: string;
  additional_text?: string;
}

interface BuildSkill {
  id: string;
  additional_text?: string;
  support_skills?: (string | BuildSupport)[];
}

interface BuildInventorySlot {
  inventory_id: string;
  additional_text?: string;
}

interface BuildFile {
  name: string;
  author?: string;
  description?: string;
  ascendancy?: string;
  passives?: string[];
  skills?: BuildSkill[];
  inventory_slots?: BuildInventorySlot[];
}

const SLOT_TO_INVENTORY_ID: Record<string, string> = {
  helmet: 'Helm1',
  body: 'BodyArmour1',
  gloves: 'Gloves1',
  boots: 'Boots1',
  belt: 'Belt1',
  amulet: 'Amulet1',
  ring1: 'Ring1',
  ring2: 'Ring2',
  weapon1: 'Weapon1',
  weapon2: 'Offhand1',
};

export interface ExportInput {
  selectedClass: number | null;
  selectedAscendancy: string | null;
  allocatedNodes: Set<string>;
  nodeMap: Map<string, SkillNode>;
  classes: ClassDef[];
  skills?: SelectedSkill[];
  gear?: Record<string, SelectedGearPiece>;
  recommendedInventory?: BuildInventorySlot[];
}

export function buildExportFile(input: ExportInput): { filename: string; content: string } {
  const { selectedClass, selectedAscendancy, allocatedNodes, nodeMap, classes, skills, gear, recommendedInventory } = input;

  const passives: string[] = [];
  for (const nodeKey of allocatedNodes) {
    const node = nodeMap.get(nodeKey);
    if (!node) continue;
    if (!node.id) continue;
    if (node.classStartIndex) continue;
    passives.push(node.id);
  }

  const buildSkills: BuildSkill[] = [];
  if (skills) {
    for (const s of skills) {
      const entry: BuildSkill = { id: s.gemId };
      if (s.note) entry.additional_text = s.note;
      if (s.supportIds.length > 0) {
        entry.support_skills = s.supportIds;
      }
      buildSkills.push(entry);
    }
  }

  const className = selectedClass !== null ? classes[selectedClass]?.name : 'Custom';
  let ascendancyName: string | null = null;
  if (selectedAscendancy) {
    for (const cls of classes) {
      const asc = cls.ascendancies.find(a => a.id === selectedAscendancy);
      if (asc && asc.name) {
        ascendancyName = asc.name;
        break;
      }
    }
  }

  const buildName = ascendancyName ? `${ascendancyName} ${className}` : `${className} Build`;

  const build: BuildFile = {
    name: buildName,
    author: 'POE2 Builder',
  };

  if (selectedAscendancy) {
    build.ascendancy = selectedAscendancy;
  }

  if (passives.length > 0) {
    build.passives = passives;
  }

  if (buildSkills.length > 0) {
    build.skills = buildSkills;
  }

  const inventorySlots: BuildInventorySlot[] = [];
  if (gear) {
    for (const [slot, piece] of Object.entries(gear)) {
      const inventoryId = SLOT_TO_INVENTORY_ID[slot];
      if (!inventoryId) continue;
      const label = piece.uniqueName
        ? `<gold>{${piece.uniqueName}}\n<grey>{Base: ${piece.basePath.split('/').pop()}}`
        : `<silver>{${piece.basePath.split('/').pop()}}`;
      inventorySlots.push({ inventory_id: inventoryId, additional_text: label });
    }
  }
  if (recommendedInventory) inventorySlots.push(...recommendedInventory);
  if (inventorySlots.length > 0) {
    build.inventory_slots = inventorySlots;
  }

  const safeName = buildName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return {
    filename: `${safeName}.build`,
    content: JSON.stringify(build, null, 4),
  };
}

export function downloadBuildFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
