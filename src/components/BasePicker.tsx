import { useMemo, useState } from 'react';
import { GearIndex, GearSlot, SLOT_LABELS, BaseItemSummary } from '../data/gear';

interface Props {
  slot: GearSlot;
  gearIndex: GearIndex | null;
  loadError: string | null;
  allowedClasses: string[];
  classBaseAttrs: { level: number; strength: number; dexterity: number; intelligence: number };
  onPick: (base: BaseItemSummary) => void;
  onClose: () => void;
}

type DefenseFilter = 'all' | 'str' | 'dex' | 'int' | 'str_dex' | 'str_int' | 'dex_int';
type SortBy = 'level' | 'name';

const DEFENSE_TAG: Record<DefenseFilter, string | null> = {
  all: null,
  str: 'str_armour',
  dex: 'dex_armour',
  int: 'int_armour',
  str_dex: 'str_dex_armour',
  str_int: 'str_int_armour',
  dex_int: 'dex_int_armour',
};

export function BasePicker({ slot, gearIndex, loadError, allowedClasses, classBaseAttrs, onPick, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [defenseFilter, setDefenseFilter] = useState<DefenseFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('level');
  const [hideUnequipable, setHideUnequipable] = useState(false);

  const allowedClassSet = useMemo(() => new Set(allowedClasses), [allowedClasses]);
  const isArmorSlot = useMemo(
    () => allowedClasses.some(c => ['Helmet', 'Body Armour', 'Gloves', 'Boots'].includes(c)),
    [allowedClasses],
  );

  const options = useMemo<BaseItemSummary[]>(() => {
    if (!gearIndex) return [];
    const q = search.trim().toLowerCase();

    const pool: BaseItemSummary[] = [];
    for (const cls of allowedClasses) {
      const list = gearIndex.basesByClass.get(cls);
      if (list) pool.push(...list);
    }

    const requiredTag = DEFENSE_TAG[defenseFilter];

    const filtered = pool.filter(b => {
      if (!allowedClassSet.has(b.itemClass)) return false;
      if (requiredTag && !b.tags.includes(requiredTag)) return false;
      if (hideUnequipable) {
        if (classBaseAttrs.strength < b.requirements.strength) return false;
        if (classBaseAttrs.dexterity < b.requirements.dexterity) return false;
        if (classBaseAttrs.intelligence < b.requirements.intelligence) return false;
      }
      if (q && !b.name.toLowerCase().includes(q)) return false;
      return true;
    });

    if (sortBy === 'name') return filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [gearIndex, allowedClasses, allowedClassSet, defenseFilter, hideUnequipable, classBaseAttrs, search, sortBy]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 540,
          maxHeight: '85vh',
          background: '#15151a',
          border: '1px solid #3a3a3a',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0,0,0,0.85)',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 14 }}>
            Pick {SLOT_LABELS[slot]} Base
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a' }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search base name..."
            style={{
              background: '#0c0c10',
              border: 'none',
              color: '#ddd',
              padding: '10px 16px',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
              flex: 1,
            }}
          />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            style={{
              background: '#15151c',
              border: 'none',
              borderLeft: '1px solid #2a2a2a',
              color: '#bbb',
              padding: '0 12px',
              fontSize: 12,
              outline: 'none',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="level">Sort: iLvl</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        {isArmorSlot && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 16px', borderBottom: '1px solid #2a2a2a', background: '#101015' }}>
            {(['all', 'str', 'dex', 'int', 'str_dex', 'str_int', 'dex_int'] as const).map(d => {
              const active = defenseFilter === d;
              const label = d === 'all' ? 'All' : d === 'str' ? 'Str' : d === 'dex' ? 'Dex' : d === 'int' ? 'Int' : d === 'str_dex' ? 'Str/Dex' : d === 'str_int' ? 'Str/Int' : 'Dex/Int';
              return (
                <button
                  key={d}
                  onClick={() => setDefenseFilter(d)}
                  style={{
                    background: active ? 'rgba(168,200,255,0.14)' : 'transparent',
                    color: active ? '#a8c8ff' : '#888',
                    border: `1px solid ${active ? '#5878a8' : '#2a2a2a'}`,
                    borderRadius: 4,
                    padding: '3px 10px',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {label}
                </button>
              );
            })}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#888', fontSize: 11, marginLeft: 'auto', cursor: 'pointer' }}>
              <input type="checkbox" checked={hideUnequipable} onChange={e => setHideUnequipable(e.target.checked)} />
              Hide unequipable
            </label>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loadError && (
            <div style={{ padding: 20, color: '#e08070', fontSize: 13, textAlign: 'center' }}>
              Failed to load gear data: {loadError}
            </div>
          )}
          {!loadError && !gearIndex && (
            <div style={{ padding: 20, color: '#888', fontSize: 13, textAlign: 'center', fontStyle: 'italic' }}>
              Loading gear data… (this may take a few seconds — ~15 MB)
            </div>
          )}
          {gearIndex && options.length === 0 && (
            <div style={{ padding: 20, color: '#666', fontSize: 13, textAlign: 'center', fontStyle: 'italic' }}>
              No matches
            </div>
          )}
          {gearIndex && options.slice(0, 200).map(base => {
            const cannotEquip =
              classBaseAttrs.strength < base.requirements.strength ||
              classBaseAttrs.dexterity < base.requirements.dexterity ||
              classBaseAttrs.intelligence < base.requirements.intelligence;
            return (
              <button
                key={base.metadataPath}
                onClick={() => onPick(base)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #1f1f23',
                  color: '#ddd',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(120,160,220,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: cannotEquip ? '#e08070' : '#fff', fontWeight: 600, fontSize: 13 }}>{base.name}</span>
                  <span style={{ color: '#666', fontSize: 11 }}>iLvl {base.dropLevel}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888', display: 'flex', gap: 8 }}>
                    {base.properties.armour && <span>A {base.properties.armour.min}</span>}
                    {base.properties.evasion && <span>E {base.properties.evasion.min}</span>}
                    {base.properties.energy_shield && <span>ES {base.properties.energy_shield.min}</span>}
                    {base.properties.ward && <span>W {base.properties.ward.min}</span>}
                  </span>
                </div>
                <div style={{ color: '#666', fontSize: 10, marginTop: 2, display: 'flex', gap: 8 }}>
                  {base.requirements.level > 0 && <span>Lv {base.requirements.level}</span>}
                  {base.requirements.strength > 0 && <span style={{ color: classBaseAttrs.strength < base.requirements.strength ? '#e08070' : '#a06030' }}>Str {base.requirements.strength}</span>}
                  {base.requirements.dexterity > 0 && <span style={{ color: classBaseAttrs.dexterity < base.requirements.dexterity ? '#e08070' : '#5ea040' }}>Dex {base.requirements.dexterity}</span>}
                  {base.requirements.intelligence > 0 && <span style={{ color: classBaseAttrs.intelligence < base.requirements.intelligence ? '#e08070' : '#6080d0' }}>Int {base.requirements.intelligence}</span>}
                  <span style={{ marginLeft: 'auto' }}>{base.itemClass}</span>
                </div>
              </button>
            );
          })}
          {gearIndex && options.length > 200 && (
            <div style={{ padding: 12, color: '#666', textAlign: 'center', fontSize: 11 }}>
              Showing first 200 of {options.length}. Refine search/filters to narrow.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
