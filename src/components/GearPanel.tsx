import { useState, useMemo } from 'react';
import { TreeAction, SelectedGearPiece } from '../types';
import { GearIndex, GearSlot, GEAR_SLOTS, SLOT_LABELS, SLOT_CLASSES, BaseItemSummary, modsForBase, cleanModText, ModSummary } from '../data/gear';
import { BasePicker } from './BasePicker';

interface Props {
  gear: Record<string, SelectedGearPiece>;
  classBaseAttrs: { level: number; strength: number; dexterity: number; intelligence: number };
  gearIndex: GearIndex | null;
  dispatch: React.Dispatch<TreeAction>;
}

export function GearPanel({ gear, classBaseAttrs, gearIndex, dispatch }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState<GearSlot | null>(null);
  const [pickerSlot, setPickerSlot] = useState<GearSlot | null>(null);

  const filledCount = Object.keys(gear).length;

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: 16,
      width: 340,
      maxHeight: 'calc(100% - 32px)',
      background: 'rgba(12, 12, 14, 0.95)',
      border: '1px solid #3a3a3a',
      borderRadius: 6,
      color: '#ddd',
      fontFamily: 'system-ui, sans-serif',
      fontSize: 13,
      zIndex: 50,
      boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)',
          borderBottom: collapsed ? 'none' : '1px solid #2a2a2a',
          fontWeight: 700,
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#e0c050' }}>Gear</span>
        <span style={{ color: '#8a8a8a', fontSize: 11 }}>
          {filledCount}/{GEAR_SLOTS.length} {collapsed ? '▴' : '▾'}
        </span>
      </div>

      {!collapsed && (
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
          {GEAR_SLOTS.map(slot => (
            <GearRow
              key={slot}
              slot={slot}
              piece={gear[slot]}
              expanded={expandedSlot === slot}
              gearIndex={gearIndex}
              classBaseAttrs={classBaseAttrs}
              onToggleExpand={() => setExpandedSlot(expandedSlot === slot ? null : slot)}
              onPick={() => setPickerSlot(slot)}
              onClear={() => dispatch({ type: 'CLEAR_GEAR', slot })}
              onUniqueChange={(name) => {
                if (!gear[slot]) return;
                dispatch({ type: 'SET_GEAR', slot, piece: { ...gear[slot], uniqueName: name || undefined } });
              }}
            />
          ))}
        </div>
      )}

      {pickerSlot && (
        <BasePicker
          slot={pickerSlot}
          gearIndex={gearIndex}
          loadError={null}
          allowedClasses={SLOT_CLASSES[pickerSlot]}
          classBaseAttrs={classBaseAttrs}
          onPick={(base) => {
            dispatch({ type: 'SET_GEAR', slot: pickerSlot, piece: { basePath: base.metadataPath } });
            setPickerSlot(null);
            setExpandedSlot(pickerSlot);
          }}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
}

interface RowProps {
  slot: GearSlot;
  piece: SelectedGearPiece | undefined;
  expanded: boolean;
  gearIndex: GearIndex | null;
  classBaseAttrs: { level: number; strength: number; dexterity: number; intelligence: number };
  onToggleExpand: () => void;
  onPick: () => void;
  onClear: () => void;
  onUniqueChange: (name: string) => void;
}

function GearRow({ slot, piece, expanded, gearIndex, classBaseAttrs, onToggleExpand, onPick, onClear, onUniqueChange }: RowProps) {
  const base = piece && gearIndex ? gearIndex.basesByPath.get(piece.basePath) ?? null : null;
  const cannotEquip = base && (
    classBaseAttrs.strength < base.requirements.strength ||
    classBaseAttrs.dexterity < base.requirements.dexterity ||
    classBaseAttrs.intelligence < base.requirements.intelligence
  );

  return (
    <div style={{ borderBottom: '1px solid #1f1f23' }}>
      <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#888', fontSize: 11, width: 96, flexShrink: 0 }}>{SLOT_LABELS[slot]}</span>
        {piece ? (
          <>
            <button
              onClick={onToggleExpand}
              style={{ background: 'none', border: 'none', color: cannotEquip ? '#e08070' : '#fff', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 600, textAlign: 'left', flex: 1, fontFamily: 'inherit' }}
            >
              {expanded ? '▾' : '▸'} {piece.uniqueName || base?.name || piece.basePath.split('/').pop()}
            </button>
            <button
              onClick={onClear}
              title="Clear slot"
              style={{ background: 'none', border: 'none', color: '#c86a41', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
            >
              ×
            </button>
          </>
        ) : (
          <button
            onClick={onPick}
            style={{
              flex: 1,
              background: 'transparent',
              color: '#88c8ff',
              border: '1px dashed #4a78a8',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            + Pick base
          </button>
        )}
      </div>

      {expanded && piece && base && gearIndex && (
        <ExpandedDetails base={base} gearIndex={gearIndex} piece={piece} cannotEquip={!!cannotEquip} classBaseAttrs={classBaseAttrs} onUniqueChange={onUniqueChange} onChangeBase={onPick} />
      )}
    </div>
  );
}

interface ExpandedProps {
  base: BaseItemSummary;
  gearIndex: GearIndex;
  piece: SelectedGearPiece;
  cannotEquip: boolean;
  classBaseAttrs: { level: number; strength: number; dexterity: number; intelligence: number };
  onUniqueChange: (name: string) => void;
  onChangeBase: () => void;
}

function ExpandedDetails({ base, gearIndex, piece, cannotEquip, classBaseAttrs, onUniqueChange, onChangeBase }: ExpandedProps) {
  const [showMods, setShowMods] = useState(false);
  const mods = useMemo(() => (showMods ? modsForBase(base, gearIndex) : null), [showMods, base, gearIndex]);

  const formatRange = (r?: { min: number; max: number }) => (r ? (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`) : null);

  return (
    <div style={{ padding: '0 12px 10px 12px', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: '#aaa', fontSize: 11, marginBottom: 6 }}>
        {base.properties.armour && <span>Armour: {formatRange(base.properties.armour)}</span>}
        {base.properties.evasion && <span>Evasion: {formatRange(base.properties.evasion)}</span>}
        {base.properties.energy_shield && <span>ES: {formatRange(base.properties.energy_shield)}</span>}
        {base.properties.ward && <span>Ward: {formatRange(base.properties.ward)}</span>}
        <span>iLvl: {base.dropLevel}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, marginBottom: 8 }}>
        {base.requirements.level > 0 && <span style={{ color: classBaseAttrs.level < base.requirements.level ? '#e08070' : '#888' }}>Lv: {base.requirements.level}</span>}
        {base.requirements.strength > 0 && <span style={{ color: classBaseAttrs.strength < base.requirements.strength ? '#e08070' : '#a06030' }}>Str: {base.requirements.strength}</span>}
        {base.requirements.dexterity > 0 && <span style={{ color: classBaseAttrs.dexterity < base.requirements.dexterity ? '#e08070' : '#5ea040' }}>Dex: {base.requirements.dexterity}</span>}
        {base.requirements.intelligence > 0 && <span style={{ color: classBaseAttrs.intelligence < base.requirements.intelligence ? '#e08070' : '#6080d0' }}>Int: {base.requirements.intelligence}</span>}
      </div>

      {cannotEquip && (
        <div style={{ color: '#e08070', fontSize: 11, marginBottom: 8, fontStyle: 'italic' }}>
          Class attributes don't meet this base's requirements.
        </div>
      )}

      <input
        value={piece.uniqueName ?? ''}
        onChange={e => onUniqueChange(e.target.value)}
        placeholder="Unique name (optional)"
        style={{
          width: '100%',
          background: '#0c0c10',
          border: '1px solid #2a2a2a',
          borderRadius: 4,
          color: '#ddd',
          padding: '4px 8px',
          fontSize: 11,
          outline: 'none',
          fontFamily: 'inherit',
          marginBottom: 8,
        }}
      />

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onChangeBase}
          style={{ background: 'transparent', color: '#88c8ff', border: '1px solid #4a78a8', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Change base
        </button>
        <button
          onClick={() => setShowMods(s => !s)}
          style={{ background: 'transparent', color: '#c8a8ff', border: '1px solid #6a5a8a', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {showMods ? 'Hide mod pool' : 'View mod pool'}
        </button>
      </div>

      {showMods && mods && (
        <div style={{ marginTop: 8 }}>
          <ModColumn title="Prefixes" mods={collapseToGroups(mods.prefixes)} accent="#88c8ff" />
          <ModColumn title="Suffixes" mods={collapseToGroups(mods.suffixes)} accent="#c8a868" />
        </div>
      )}
    </div>
  );
}

function collapseToGroups(mods: ModSummary[]): { group: string; tiers: ModSummary[] }[] {
  const groups = new Map<string, ModSummary[]>();
  for (const m of mods) {
    let list = groups.get(m.group);
    if (!list) { list = []; groups.set(m.group, list); }
    list.push(m);
  }
  return [...groups.entries()].map(([group, tiers]) => ({ group, tiers: tiers.sort((a, b) => a.requiredLevel - b.requiredLevel) }));
}

function ModColumn({ title, mods, accent }: { title: string; mods: { group: string; tiers: ModSummary[] }[]; accent: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        {title} ({mods.length})
      </div>
      {mods.length === 0 && <div style={{ color: '#666', fontSize: 11, fontStyle: 'italic' }}>None available</div>}
      {mods.map(({ group, tiers }) => {
        const lo = tiers[0], hi = tiers[tiers.length - 1];
        return (
          <div key={group} style={{ marginBottom: 4 }}>
            <div style={{ color: '#bbb', fontSize: 11 }}>{cleanModText(hi.text)}</div>
            <div style={{ color: '#666', fontSize: 10, marginTop: 1 }}>
              {tiers.length > 1 ? `T1–T${tiers.length} · Lv ${lo.requiredLevel}–${hi.requiredLevel}` : `Lv ${hi.requiredLevel}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
