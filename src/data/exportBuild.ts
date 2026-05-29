import { SkillNode, ClassDef, SelectedSkill } from '../types';

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

export interface ExportInput {
  selectedClass: number | null;
  selectedAscendancy: string | null;
  allocatedNodes: Set<string>;
  nodeMap: Map<string, SkillNode>;
  classes: ClassDef[];
  skills?: SelectedSkill[];
  recommendedInventory?: BuildInventorySlot[];
}

export function buildExportFile(input: ExportInput): { filename: string; content: string } {
  const { selectedClass, selectedAscendancy, allocatedNodes, nodeMap, classes, skills, recommendedInventory } = input;

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

  if (recommendedInventory && recommendedInventory.length > 0) {
    build.inventory_slots = recommendedInventory;
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
