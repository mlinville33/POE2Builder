import { SkillNode, SelectedGearPiece, AttributeChoice } from '../types';
import { cleanStatText } from './loader';
import { GearIndex } from './gear';

export interface ResistanceTotals {
  fire: number;
  cold: number;
  lightning: number;
  chaos: number;
}

export interface CharacterStats {
  level: number;
  attributes: { strength: number; dexterity: number; intelligence: number };
  baseAttributes: { strength: number; dexterity: number; intelligence: number };
  unspentAttributes: number;
  unspentAttributeNodes: string[];
  assignedAttributeNodes: string[];
  life: number;
  mana: number;
  energyShield: number;
  ward: number;
  spirit: number;
  armour: number;
  evasion: number;
  resistances: ResistanceTotals;
  maxResistances: ResistanceTotals;
  movementSpeed: number;
  unparsedCount: number;
}

interface Accumulator {
  flatStr: number;
  flatDex: number;
  flatInt: number;
  flatAnyAttr: number;
  flatLife: number;
  flatMana: number;
  flatES: number;
  flatWard: number;
  flatSpirit: number;
  flatArmour: number;
  flatEvasion: number;
  incLife: number;
  incMana: number;
  incES: number;
  incArmour: number;
  incEvasion: number;
  incSpirit: number;
  resFire: number;
  resCold: number;
  resLightning: number;
  resChaos: number;
  maxResFire: number;
  maxResCold: number;
  maxResLightning: number;
  maxResChaos: number;
  movementSpeed: number;
  unparsed: number;
}

const emptyAcc = (): Accumulator => ({
  flatStr: 0, flatDex: 0, flatInt: 0, flatAnyAttr: 0,
  flatLife: 0, flatMana: 0, flatES: 0, flatWard: 0, flatSpirit: 0,
  flatArmour: 0, flatEvasion: 0,
  incLife: 0, incMana: 0, incES: 0, incArmour: 0, incEvasion: 0, incSpirit: 0,
  resFire: 0, resCold: 0, resLightning: 0, resChaos: 0,
  maxResFire: 0, maxResCold: 0, maxResLightning: 0, maxResChaos: 0,
  movementSpeed: 0,
  unparsed: 0,
});

const SKIP_PREFIXES = ['Minions have ', 'Minions ', 'Companions have ', 'Companions ', 'Totems ', 'Totems gain ', 'Body Armour ', 'Banners ', 'Archon ', 'Allies '];

type Pattern = { rx: RegExp; apply: (a: Accumulator, n: number) => void };

const PATTERNS: Pattern[] = [
  { rx: /^\+(\d+) to Strength$/i, apply: (a, n) => { a.flatStr += n; } },
  { rx: /^\+(\d+) to Dexterity$/i, apply: (a, n) => { a.flatDex += n; } },
  { rx: /^\+(\d+) to Intelligence$/i, apply: (a, n) => { a.flatInt += n; } },
  { rx: /^\+(\d+) to all Attributes$/i, apply: (a, n) => { a.flatStr += n; a.flatDex += n; a.flatInt += n; } },
  { rx: /^\+(\d+) to Strength and Dexterity$/i, apply: (a, n) => { a.flatStr += n; a.flatDex += n; } },
  { rx: /^\+(\d+) to Strength and Intelligence$/i, apply: (a, n) => { a.flatStr += n; a.flatInt += n; } },
  { rx: /^\+(\d+) to Dexterity and Intelligence$/i, apply: (a, n) => { a.flatDex += n; a.flatInt += n; } },

  { rx: /^\+(\d+) to maximum Life$/i, apply: (a, n) => { a.flatLife += n; } },
  { rx: /^\+(\d+) to maximum Mana$/i, apply: (a, n) => { a.flatMana += n; } },
  { rx: /^\+(\d+) to maximum Energy Shield$/i, apply: (a, n) => { a.flatES += n; } },
  { rx: /^\+(\d+) to maximum Ward$/i, apply: (a, n) => { a.flatWard += n; } },
  { rx: /^\+(\d+) to (?:Maximum )?Spirit$/i, apply: (a, n) => { a.flatSpirit += n; } },

  { rx: /^(\d+)% increased maximum Life$/i, apply: (a, n) => { a.incLife += n; } },
  { rx: /^(\d+)% increased maximum Mana$/i, apply: (a, n) => { a.incMana += n; } },
  { rx: /^(\d+)% increased maximum Energy Shield$/i, apply: (a, n) => { a.incES += n; } },
  { rx: /^(\d+)% increased Spirit$/i, apply: (a, n) => { a.incSpirit += n; } },
  { rx: /^(\d+)% increased maximum Life, Mana and Energy Shield$/i, apply: (a, n) => { a.incLife += n; a.incMana += n; a.incES += n; } },

  { rx: /^(\d+)% (?:reduced|less) maximum Life$/i, apply: (a, n) => { a.incLife -= n; } },
  { rx: /^(\d+)% (?:reduced|less) maximum Mana$/i, apply: (a, n) => { a.incMana -= n; } },
  { rx: /^(\d+)% (?:reduced|less) maximum Energy Shield$/i, apply: (a, n) => { a.incES -= n; } },

  { rx: /^\+(\d+) to Armour$/i, apply: (a, n) => { a.flatArmour += n; } },
  { rx: /^\+(\d+) to Evasion Rating$/i, apply: (a, n) => { a.flatEvasion += n; } },
  { rx: /^(\d+)% increased Armour$/i, apply: (a, n) => { a.incArmour += n; } },
  { rx: /^(\d+)% increased Evasion Rating$/i, apply: (a, n) => { a.incEvasion += n; } },
  { rx: /^(\d+)% increased Armour and Evasion Rating$/i, apply: (a, n) => { a.incArmour += n; a.incEvasion += n; } },

  { rx: /^\+(\d+)% to Fire Resistance$/i, apply: (a, n) => { a.resFire += n; } },
  { rx: /^\+(\d+)% to Cold Resistance$/i, apply: (a, n) => { a.resCold += n; } },
  { rx: /^\+(\d+)% to Lightning Resistance$/i, apply: (a, n) => { a.resLightning += n; } },
  { rx: /^\+(\d+)% to Chaos Resistance$/i, apply: (a, n) => { a.resChaos += n; } },
  { rx: /^-(\d+)% to Chaos Resistance$/i, apply: (a, n) => { a.resChaos -= n; } },
  { rx: /^\+(\d+)% to (?:all )?Elemental Resistances?$/i, apply: (a, n) => { a.resFire += n; a.resCold += n; a.resLightning += n; } },
  { rx: /^-(\d+)% to (?:all )?Elemental Resistances?$/i, apply: (a, n) => { a.resFire -= n; a.resCold -= n; a.resLightning -= n; } },

  { rx: /^\+(\d+)% to Maximum Fire Resistance$/i, apply: (a, n) => { a.maxResFire += n; } },
  { rx: /^\+(\d+)% to Maximum Cold Resistance$/i, apply: (a, n) => { a.maxResCold += n; } },
  { rx: /^\+(\d+)% to Maximum Lightning Resistance$/i, apply: (a, n) => { a.maxResLightning += n; } },
  { rx: /^\+(\d+)% to Maximum Chaos Resistance$/i, apply: (a, n) => { a.maxResChaos += n; } },

  { rx: /^(\d+)% increased Movement Speed$/i, apply: (a, n) => { a.movementSpeed += n; } },
];

function isPlayerOnly(stat: string): boolean {
  for (const prefix of SKIP_PREFIXES) {
    if (stat.startsWith(prefix)) return false;
  }
  return true;
}

export function parseStatsInto(stats: string[], acc: Accumulator) {
  for (const raw of stats) {
    const clean = cleanStatText(raw).trim();
    if (!isPlayerOnly(clean)) continue;
    let matched = false;
    for (const p of PATTERNS) {
      const m = clean.match(p.rx);
      if (m) {
        p.apply(acc, parseInt(m[1], 10));
        matched = true;
        break;
      }
    }
    if (!matched) acc.unparsed++;
  }
}

function baseLifeForLevel(level: number): number {
  return 38 + 12 * Math.max(1, level);
}

function baseManaForLevel(level: number): number {
  return 30 + 6 * Math.max(1, level);
}

function extractAnyAttributeValue(stats: string[]): number {
  for (const raw of stats) {
    const clean = cleanStatText(raw).trim();
    const m = clean.match(/^\+(\d+) to any Attribute$/i);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

export function computeCharacterStats(
  allocatedNodes: Set<string>,
  nodeMap: Map<string, SkillNode>,
  gear: Record<string, SelectedGearPiece>,
  gearIndex: GearIndex | null,
  classBaseAttrs: { strength: number; dexterity: number; intelligence: number },
  level: number,
  attributeChoices: Record<string, AttributeChoice> = {},
): CharacterStats {
  const acc = emptyAcc();
  const unspentAttributeNodes: string[] = [];
  const assignedAttributeNodes: string[] = [];

  for (const nodeId of allocatedNodes) {
    const node = nodeMap.get(nodeId);
    if (!node?.stats) continue;
    if (node.classStartIndex) continue;

    if (node.isGenericAttribute) {
      const value = extractAnyAttributeValue(node.stats);
      const choice = attributeChoices[nodeId];
      if (choice === 'strength') { acc.flatStr += value; assignedAttributeNodes.push(nodeId); }
      else if (choice === 'dexterity') { acc.flatDex += value; assignedAttributeNodes.push(nodeId); }
      else if (choice === 'intelligence') { acc.flatInt += value; assignedAttributeNodes.push(nodeId); }
      else { acc.flatAnyAttr += value; unspentAttributeNodes.push(nodeId); }
      continue;
    }

    parseStatsInto(node.stats, acc);
  }

  if (gearIndex) {
    for (const piece of Object.values(gear)) {
      const base = gearIndex.basesByPath.get(piece.basePath);
      if (!base) continue;
      if (base.properties.armour) acc.flatArmour += Math.round((base.properties.armour.min + base.properties.armour.max) / 2);
      if (base.properties.evasion) acc.flatEvasion += Math.round((base.properties.evasion.min + base.properties.evasion.max) / 2);
      if (base.properties.energy_shield) acc.flatES += Math.round((base.properties.energy_shield.min + base.properties.energy_shield.max) / 2);
      if (base.properties.ward) acc.flatWard += Math.round((base.properties.ward.min + base.properties.ward.max) / 2);
    }
  }

  const baseLife = baseLifeForLevel(level);
  const baseMana = baseManaForLevel(level);

  const life = Math.round((baseLife + acc.flatLife) * (1 + acc.incLife / 100));
  const mana = Math.round((baseMana + acc.flatMana) * (1 + acc.incMana / 100));
  const energyShield = Math.round(acc.flatES * (1 + acc.incES / 100));
  const armour = Math.round(acc.flatArmour * (1 + acc.incArmour / 100));
  const evasion = Math.round(acc.flatEvasion * (1 + acc.incEvasion / 100));
  const spirit = Math.round(acc.flatSpirit * (1 + acc.incSpirit / 100));

  return {
    level,
    baseAttributes: { strength: classBaseAttrs.strength, dexterity: classBaseAttrs.dexterity, intelligence: classBaseAttrs.intelligence },
    attributes: {
      strength: classBaseAttrs.strength + acc.flatStr,
      dexterity: classBaseAttrs.dexterity + acc.flatDex,
      intelligence: classBaseAttrs.intelligence + acc.flatInt,
    },
    unspentAttributes: acc.flatAnyAttr,
    unspentAttributeNodes,
    assignedAttributeNodes,
    life,
    mana,
    energyShield,
    ward: acc.flatWard,
    spirit,
    armour,
    evasion,
    resistances: {
      fire: acc.resFire,
      cold: acc.resCold,
      lightning: acc.resLightning,
      chaos: acc.resChaos,
    },
    maxResistances: {
      fire: 75 + acc.maxResFire,
      cold: 75 + acc.maxResCold,
      lightning: 75 + acc.maxResLightning,
      chaos: 75 + acc.maxResChaos,
    },
    movementSpeed: acc.movementSpeed,
    unparsedCount: acc.unparsed,
  };
}
