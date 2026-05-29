export const GEAR_SLOTS = ['helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2', 'weapon1', 'weapon2'] as const;
export type GearSlot = typeof GEAR_SLOTS[number];

export const SLOT_LABELS: Record<GearSlot, string> = {
  helmet: 'Helmet',
  body: 'Body Armour',
  gloves: 'Gloves',
  boots: 'Boots',
  belt: 'Belt',
  amulet: 'Amulet',
  ring1: 'Ring (Left)',
  ring2: 'Ring (Right)',
  weapon1: 'Weapon',
  weapon2: 'Offhand',
};

export const SLOT_CLASSES: Record<GearSlot, string[]> = {
  helmet: ['Helmet'],
  body: ['Body Armour'],
  gloves: ['Gloves'],
  boots: ['Boots'],
  belt: ['Belt'],
  amulet: ['Amulet'],
  ring1: ['Ring'],
  ring2: ['Ring'],
  weapon1: [
    'One Hand Mace', 'Two Hand Mace', 'One Hand Sword', 'Two Hand Sword',
    'One Hand Axe', 'Two Hand Axe', 'Bow', 'Crossbow', 'Spear',
    'Quarterstaff', 'Flail', 'Dagger', 'Claw', 'Wand', 'Sceptre', 'Staff', 'Warstaff',
  ],
  weapon2: ['Shield', 'Buckler', 'Focus', 'Quiver'],
};

const CLASS_TO_MODS_KEY: Record<string, string> = {
  Helmet: 'Helmets',
  'Body Armour': 'Body Armours',
  Gloves: 'Gloves',
  Boots: 'Boots',
  Belt: 'Belts',
  Ring: 'Rings',
  Amulet: 'Amulets',
  Shield: 'Shields',
  Buckler: 'Bucklers',
  Focus: 'Foci',
  Quiver: 'Quivers',
  'One Hand Mace': 'One Hand Maces',
  'Two Hand Mace': 'Two Hand Maces',
  'One Hand Sword': 'One Hand Swords',
  'Two Hand Sword': 'Two Hand Swords',
  'One Hand Axe': 'One Hand Axes',
  'Two Hand Axe': 'Two Hand Axes',
  Bow: 'Bows',
  Crossbow: 'Crossbows',
  Spear: 'Spears',
  Quarterstaff: 'Quarterstaves',
  Flail: 'Flails',
  Dagger: 'Daggers',
  Claw: 'Claws',
  Wand: 'Wands',
  Sceptre: 'Sceptres',
  Staff: 'Staves',
};

export interface BaseProperties {
  armour?: { min: number; max: number };
  evasion?: { min: number; max: number };
  energy_shield?: { min: number; max: number };
  ward?: { min: number; max: number };
}

export interface BaseItemSummary {
  metadataPath: string;
  name: string;
  itemClass: string;
  iconDds: string;
  dropLevel: number;
  inventoryWidth: number;
  inventoryHeight: number;
  tags: string[];
  requirements: { level: number; strength: number; dexterity: number; intelligence: number };
  properties: BaseProperties;
}

export interface ModSummary {
  id: string;
  name: string;
  type: string;
  group: string;
  generationType: 'prefix' | 'suffix' | 'implicit' | 'corrupted' | 'unique' | string;
  requiredLevel: number;
  text: string;
  stats: { id: string; min: number; max: number }[];
}

export interface ModsForBase {
  prefixes: ModSummary[];
  suffixes: ModSummary[];
}

export interface GearIndex {
  basesByPath: Map<string, BaseItemSummary>;
  basesByClass: Map<string, BaseItemSummary[]>;
  modsById: Map<string, ModSummary>;
  modsByBase: Record<string, Record<string, { bases: string[]; mods: Record<string, Record<string, Record<string, number>>>; conditional_mods: unknown }>>;
}

interface RawBaseItem {
  domain?: string;
  release_state?: string;
  name?: string;
  item_class?: string;
  drop_level?: number;
  inventory_width?: number;
  inventory_height?: number;
  tags?: string[];
  requirements?: { level?: number; strength?: number; dexterity?: number; intelligence?: number } | null;
  properties?: Record<string, { min?: number; max?: number } | null>;
  visual_identity?: { dds_file?: string };
}

interface RawMod {
  name?: string;
  type?: string;
  domain?: string;
  generation_type?: string;
  groups?: string[];
  required_level?: number;
  text?: string;
  stats?: { id?: string; min?: number; max?: number }[];
}

let cached: GearIndex | null = null;
let pending: Promise<GearIndex> | null = null;

export async function loadGear(): Promise<GearIndex> {
  if (cached) return cached;
  if (pending) return pending;

  pending = (async () => {
    const [basesRaw, modsRaw, modsByBaseRaw] = await Promise.all([
      fetch('/base_items.json').then(r => r.json()) as Promise<Record<string, RawBaseItem>>,
      fetch('/mods.json').then(r => r.json()) as Promise<Record<string, RawMod>>,
      fetch('/mods_by_base.json').then(r => r.json()) as Promise<GearIndex['modsByBase']>,
    ]);

    const validSlotClasses = new Set<string>(Object.values(SLOT_CLASSES).flat());

    const basesByPath = new Map<string, BaseItemSummary>();
    const basesByClass = new Map<string, BaseItemSummary[]>();

    for (const [path, raw] of Object.entries(basesRaw)) {
      if (!raw) continue;
      if (raw.release_state && raw.release_state !== 'released') continue;
      const name = raw.name ?? '';
      if (!name || name.startsWith('[DNT')) continue;
      const itemClass = raw.item_class ?? '';
      if (!validSlotClasses.has(itemClass)) continue;

      const props = raw.properties ?? {};
      const properties: BaseProperties = {};
      if (props.armour && (props.armour.min ?? 0) > 0) properties.armour = { min: props.armour.min ?? 0, max: props.armour.max ?? 0 };
      if (props.evasion && (props.evasion.min ?? 0) > 0) properties.evasion = { min: props.evasion.min ?? 0, max: props.evasion.max ?? 0 };
      if (props.energy_shield && (props.energy_shield.min ?? 0) > 0) properties.energy_shield = { min: props.energy_shield.min ?? 0, max: props.energy_shield.max ?? 0 };
      if (props.ward && (props.ward.min ?? 0) > 0) properties.ward = { min: props.ward.min ?? 0, max: props.ward.max ?? 0 };

      const req = raw.requirements ?? {};
      const summary: BaseItemSummary = {
        metadataPath: path,
        name,
        itemClass,
        iconDds: raw.visual_identity?.dds_file ?? '',
        dropLevel: raw.drop_level ?? 0,
        inventoryWidth: raw.inventory_width ?? 1,
        inventoryHeight: raw.inventory_height ?? 1,
        tags: raw.tags ?? [],
        requirements: {
          level: req?.level ?? 0,
          strength: req?.strength ?? 0,
          dexterity: req?.dexterity ?? 0,
          intelligence: req?.intelligence ?? 0,
        },
        properties,
      };

      basesByPath.set(path, summary);
      let list = basesByClass.get(itemClass);
      if (!list) {
        list = [];
        basesByClass.set(itemClass, list);
      }
      list.push(summary);
    }

    for (const list of basesByClass.values()) {
      list.sort((a, b) => a.dropLevel - b.dropLevel || a.name.localeCompare(b.name));
    }

    const modsById = new Map<string, ModSummary>();
    for (const [id, raw] of Object.entries(modsRaw)) {
      if (!raw) continue;
      if (raw.domain !== 'item') continue;
      const stats = (raw.stats ?? [])
        .filter(s => s.id)
        .map(s => ({ id: s.id ?? '', min: s.min ?? 0, max: s.max ?? 0 }));
      modsById.set(id, {
        id,
        name: raw.name ?? '',
        type: raw.type ?? '',
        group: raw.groups?.[0] ?? raw.type ?? '',
        generationType: (raw.generation_type ?? 'unknown') as ModSummary['generationType'],
        requiredLevel: raw.required_level ?? 0,
        text: raw.text ?? '',
        stats,
      });
    }

    cached = { basesByPath, basesByClass, modsById, modsByBase: modsByBaseRaw };
    return cached;
  })();

  return pending;
}

export function modsForBase(base: BaseItemSummary, idx: GearIndex): ModsForBase {
  const classKey = CLASS_TO_MODS_KEY[base.itemClass];
  if (!classKey) return { prefixes: [], suffixes: [] };

  const tagKey = base.tags.join(',');
  const classEntry = idx.modsByBase[classKey];
  const entry = classEntry?.[tagKey];
  if (!entry?.mods) return { prefixes: [], suffixes: [] };

  const collect = (genTypeData: Record<string, Record<string, number>> | undefined): ModSummary[] => {
    if (!genTypeData) return [];
    const mods: ModSummary[] = [];
    for (const group of Object.keys(genTypeData)) {
      for (const modId of Object.keys(genTypeData[group])) {
        const mod = idx.modsById.get(modId);
        if (mod) mods.push(mod);
      }
    }
    return mods.sort((a, b) => a.group.localeCompare(b.group) || a.requiredLevel - b.requiredLevel);
  };

  return {
    prefixes: collect(entry.mods.prefix),
    suffixes: collect(entry.mods.suffix),
  };
}

export function cleanModText(text: string): string {
  return text
    .replace(/\[([^\]|]*)\|([^\]]*)\]/g, '$2')
    .replace(/\[([^\]]*)\]/g, '$1');
}
