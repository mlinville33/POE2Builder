export interface BuildTemplateSkill {
  gemDisplayName: string;
  note?: string;
  maxSupports?: number;
}

export interface BuildTemplate {
  id: string;
  name: string;
  classIndex: number;
  ascendancyId: string;
  description: string;
  skills: BuildTemplateSkill[];
}

export const BUILD_TEMPLATES: BuildTemplate[] = [
  {
    id: 'ed-contagion-lich',
    name: 'ED Contagion Lich',
    classIndex: 1,
    ascendancyId: 'Witch3',
    description:
      'Chaos damage-over-time mapper. Essence Drain applies a powerful DoT; Contagion spreads it to every enemy in the area. Untouched by 0.5 nerfs, bypasses elemental resists, very low gear floor.',
    skills: [
      { gemDisplayName: 'Essence Drain', note: 'Main DoT — fire at one enemy to spread via Contagion', maxSupports: 4 },
      { gemDisplayName: 'Contagion', note: 'Spread vector — cast on packs before ED', maxSupports: 3 },
      { gemDisplayName: 'Bonestorm', note: 'Boss damage burst', maxSupports: 4 },
      { gemDisplayName: 'Dark Effigy', note: 'Bossing totem — channels chaos damage', maxSupports: 3 },
      { gemDisplayName: 'Despair', note: 'Lowers chaos resistance, multiplies ED ticks' },
      { gemDisplayName: 'Sigil of Power', note: 'Cast before boss windows', maxSupports: 2 },
    ],
  },
  {
    id: 'twister-spirit-walker',
    name: 'Twister Spirit Walker',
    classIndex: 8,
    ascendancyId: 'Huntress2',
    description:
      "Top-tier 0.5 starter. Whirling Slash builds Whirlwind stacks, Twister consumes them for piercing bouncing projectiles. Spirit Walker's Owl provides projectile speed for free. Evasion-based, gear-light.",
    skills: [
      { gemDisplayName: 'Whirling Slash', note: 'Build 3 stacks before firing Twister', maxSupports: 3 },
      { gemDisplayName: 'Twister', note: 'Main damage skill — consumes Whirlwind stacks', maxSupports: 4 },
      { gemDisplayName: 'Herald of Ice', note: 'Shatter explosions on frozen enemies' },
      { gemDisplayName: 'Wind Dancer', note: 'Evasion buff aura' },
      { gemDisplayName: 'Freezing Mark', note: '30% damage as cold debuff' },
    ],
  },
  {
    id: 'hollow-palm-martial-artist',
    name: 'Hollow Palm Martial Artist',
    classIndex: 10,
    ascendancyId: 'Monk1',
    description:
      'Way of the Stonefist converts gloves into Fists of Stone (no weapon required). Tempest Bell + Gathering Storm combo for bossing. Strongest mid-late curve; weaker early acts.',
    skills: [
      { gemDisplayName: 'Ice Strike', note: 'Primary attack — builds Power Charges', maxSupports: 4 },
      { gemDisplayName: 'Tempest Bell', note: '3 active bells in 0.5; Ancestrally Boost on bosses', maxSupports: 3 },
      { gemDisplayName: 'Gathering Storm', note: 'Reworked in 0.5 — explodes Bell on hit', maxSupports: 3 },
      { gemDisplayName: 'Falling Thunder', note: 'AoE clear secondary' },
      { gemDisplayName: 'Combat Frenzy', note: 'Frenzy Charges from skills' },
    ],
  },
];
