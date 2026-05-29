export type GemAttribute = 'strength' | 'dexterity' | 'intelligence';

export interface GemEntry {
  id: string;
  display_name: string;
  color: 'r' | 'g' | 'b' | 'w' | null;
  gem_type: 'active' | 'support' | string;
  tags: string[];
  recommended_supports: string[];
  primary_attribute: GemAttribute | null;
  attributes: Set<GemAttribute>;
  categories: string[];
  crafting_level: number;
}

export interface GemIndex {
  byId: Map<string, GemEntry>;
  byDisplayName: Map<string, GemEntry>;
  active: GemEntry[];
  support: GemEntry[];
}

interface RawGemEntry {
  base_item?: { display_name?: string; id?: string };
  color?: string;
  gem_type?: string;
  tags?: string[];
  recommended_supports?: string[];
  requirement_weights?: { strength?: number; dexterity?: number; intelligence?: number };
  crafting_types?: string[];
  crafting_level?: number;
}

let cached: GemIndex | null = null;
let pending: Promise<GemIndex> | null = null;

function attributesFor(weights: RawGemEntry['requirement_weights']): { primary: GemAttribute | null; all: Set<GemAttribute> } {
  const all = new Set<GemAttribute>();
  if (!weights) return { primary: null, all };
  const entries: [GemAttribute, number][] = [
    ['strength', weights.strength ?? 0],
    ['dexterity', weights.dexterity ?? 0],
    ['intelligence', weights.intelligence ?? 0],
  ];
  for (const [attr, w] of entries) {
    if (w > 0) all.add(attr);
  }
  const winner = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { primary: winner[1] > 0 ? winner[0] : null, all };
}

export async function loadGems(): Promise<GemIndex> {
  if (cached) return cached;
  if (pending) return pending;

  pending = (async () => {
    const resp = await fetch('/skill_gems.json');
    const raw = (await resp.json()) as Record<string, RawGemEntry>;

    const byId = new Map<string, GemEntry>();
    const byDisplayName = new Map<string, GemEntry>();
    const active: GemEntry[] = [];
    const support: GemEntry[] = [];

    for (const [key, entry] of Object.entries(raw)) {
      const id = entry.base_item?.id ?? key;
      const display_name = entry.base_item?.display_name ?? id;
      if (display_name.startsWith('[DNT')) continue;
      if (display_name === 'Coming Soon') continue;
      if (display_name === 'Removed Skill') continue;
      if (display_name.startsWith('Playtest ')) continue;

      const tags = entry.tags ?? [];
      const isSupport = entry.gem_type === 'support' || tags.includes('support');
      const { primary, all } = attributesFor(entry.requirement_weights);

      const gem: GemEntry = {
        id,
        display_name,
        color: (entry.color as GemEntry['color']) ?? null,
        gem_type: isSupport ? 'support' : (entry.gem_type ?? 'active'),
        tags,
        recommended_supports: entry.recommended_supports ?? [],
        primary_attribute: primary,
        attributes: all,
        categories: entry.crafting_types ?? [],
        crafting_level: entry.crafting_level ?? 0,
      };

      byId.set(id, gem);
      byDisplayName.set(display_name, gem);
      (isSupport ? support : active).push(gem);
    }

    cached = { byId, byDisplayName, active, support };
    return cached;
  })();

  return pending;
}
