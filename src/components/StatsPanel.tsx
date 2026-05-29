import { useMemo, useState } from 'react';
import { SkillNode, SelectedGearPiece } from '../types';
import { cleanStatText } from '../data/loader';
import { GearIndex } from '../data/gear';
import { computeCharacterStats, CharacterStats } from '../data/characterStats';

interface Props {
  allocatedNodes: Set<string>;
  nodeMap: Map<string, SkillNode>;
  gear: Record<string, SelectedGearPiece>;
  gearIndex: GearIndex | null;
  classBaseAttrs: { level: number; strength: number; dexterity: number; intelligence: number };
}

interface AggregatedStats {
  numeric: Map<string, number>;
  literal: string[];
}

function parseStatNumber(stat: string): { template: string; value: number } | null {
  const match = stat.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const template = stat.slice(0, match.index!) + '#' + stat.slice(match.index! + match[0].length);
  return { template, value: parseFloat(match[0]) };
}

function aggregateStats(allocated: Set<string>, nodeMap: Map<string, SkillNode>): AggregatedStats {
  const numeric = new Map<string, number>();
  const literal: string[] = [];

  for (const nodeId of allocated) {
    const node = nodeMap.get(nodeId);
    if (!node?.stats || node.stats.length === 0) continue;
    if (node.classStartIndex) continue;

    for (const stat of node.stats) {
      const clean = cleanStatText(stat);
      const parsed = parseStatNumber(clean);
      if (parsed) {
        numeric.set(parsed.template, (numeric.get(parsed.template) ?? 0) + parsed.value);
      } else {
        literal.push(clean);
      }
    }
  }

  return { numeric, literal };
}

function formatValue(value: number): string {
  if (value % 1 === 0) return value.toString();
  return value.toFixed(1);
}

export function StatsPanel({ allocatedNodes, nodeMap, gear, gearIndex, classBaseAttrs }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [level, setLevel] = useState(90);
  const [showDetail, setShowDetail] = useState(false);

  const character = useMemo<CharacterStats>(() => computeCharacterStats(
    allocatedNodes, nodeMap, gear, gearIndex,
    { strength: classBaseAttrs.strength, dexterity: classBaseAttrs.dexterity, intelligence: classBaseAttrs.intelligence },
    level,
  ), [allocatedNodes, nodeMap, gear, gearIndex, classBaseAttrs, level]);

  const stats = useMemo(
    () => aggregateStats(allocatedNodes, nodeMap),
    [allocatedNodes, nodeMap],
  );

  const numericRows = useMemo(() => {
    return [...stats.numeric.entries()]
      .map(([template, value]) => ({ text: template.replace('#', formatValue(value)) }))
      .sort((a, b) => a.text.localeCompare(b.text));
  }, [stats]);

  const allocatedPoints = Math.max(0, allocatedNodes.size - 1);

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      width: 320,
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
        <span style={{ color: '#f0d070' }}>Character Overview</span>
        <span style={{ color: '#8a8a8a', fontSize: 11 }}>
          {allocatedPoints} pts {collapsed ? '▾' : '▴'}
        </span>
      </div>

      {!collapsed && (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #232323' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: '#888' }}>Planning level:</label>
              <input
                type="number"
                min={1}
                max={100}
                value={level}
                onChange={e => setLevel(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                style={{ background: '#0c0c10', border: '1px solid #2a2a2a', borderRadius: 4, color: '#ddd', padding: '2px 6px', fontSize: 12, width: 50, fontFamily: 'inherit' }}
              />
            </div>

            <Section title="Attributes">
              <Row label="Strength" value={character.attributes.strength} subValue={`base ${character.baseAttributes.strength}`} color="#e08070" />
              <Row label="Dexterity" value={character.attributes.dexterity} subValue={`base ${character.baseAttributes.dexterity}`} color="#80d070" />
              <Row label="Intelligence" value={character.attributes.intelligence} subValue={`base ${character.baseAttributes.intelligence}`} color="#80a8e8" />
              {character.unspentAttributes > 0 && (
                <Row label="Unspent (any)" value={`+${character.unspentAttributes}`} color="#c8a8ff" subValue="allocate as needed" />
              )}
            </Section>

            <Section title="Resources">
              <Row label="Life" value={character.life} color="#e85070" />
              <Row label="Mana" value={character.mana} color="#5070e8" />
              {character.energyShield > 0 && <Row label="Energy Shield" value={character.energyShield} color="#80a8ff" />}
              {character.ward > 0 && <Row label="Ward" value={character.ward} color="#c8a8ff" />}
              {character.spirit > 0 && <Row label="Spirit" value={character.spirit} color="#a8e0d0" />}
            </Section>

            {(character.armour > 0 || character.evasion > 0) && (
              <Section title="Defenses">
                {character.armour > 0 && <Row label="Armour" value={character.armour} color="#c0a070" />}
                {character.evasion > 0 && <Row label="Evasion" value={character.evasion} color="#80d098" />}
              </Section>
            )}

            <Section title="Resistances">
              <ResRow label="Fire" value={character.resistances.fire} max={character.maxResistances.fire} color="#e08070" />
              <ResRow label="Cold" value={character.resistances.cold} max={character.maxResistances.cold} color="#80a8e8" />
              <ResRow label="Lightning" value={character.resistances.lightning} max={character.maxResistances.lightning} color="#f0d070" />
              <ResRow label="Chaos" value={character.resistances.chaos} max={character.maxResistances.chaos} color="#a060c0" />
            </Section>

            {character.movementSpeed !== 0 && (
              <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                Movement Speed: <span style={{ color: '#fff', fontWeight: 600 }}>+{character.movementSpeed}%</span>
              </div>
            )}

            {!gearIndex && Object.keys(gear).length > 0 && (
              <div style={{ fontSize: 10, color: '#888', marginTop: 6, fontStyle: 'italic' }}>
                Loading gear data to include in totals…
              </div>
            )}
            {character.unparsedCount > 0 && (
              <div style={{ fontSize: 10, color: '#666', marginTop: 6, fontStyle: 'italic' }}>
                {character.unparsedCount} stat{character.unparsedCount === 1 ? '' : 's'} not aggregated above — see Detail
              </div>
            )}
          </div>

          <div
            onClick={() => setShowDetail(d => !d)}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              cursor: 'pointer',
              userSelect: 'none',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            {showDetail ? '▾' : '▸'} All Allocated Stats ({numericRows.length + stats.literal.length})
          </div>

          {showDetail && (
            <div style={{ padding: '8px 12px' }}>
              {numericRows.length === 0 && stats.literal.length === 0 && (
                <div style={{ color: '#6a6a6a', fontStyle: 'italic', fontSize: 12 }}>
                  No stats allocated yet
                </div>
              )}
              {numericRows.length > 0 && (
                <div style={{ marginBottom: stats.literal.length > 0 ? 12 : 0 }}>
                  {numericRows.map((row, i) => (
                    <div key={i} style={{ color: '#a0c8ff', fontSize: 12, lineHeight: 1.5 }}>{row.text}</div>
                  ))}
                </div>
              )}
              {stats.literal.length > 0 && (
                <div>
                  <div style={{ color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Effects</div>
                  {stats.literal.map((text, i) => (
                    <div key={i} style={{ color: '#c0a0f0', fontSize: 12, lineHeight: 1.5, marginBottom: 2 }}>{text}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: '#8a8a8a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, value, color, subValue }: { label: string; value: string | number; color: string; subValue?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontSize: 12, lineHeight: 1.5 }}>
      <span style={{ color: '#bbb' }}>{label}</span>
      <span>
        <span style={{ color, fontWeight: 700 }}>{value}</span>
        {subValue && <span style={{ color: '#555', fontSize: 10, marginLeft: 6 }}>{subValue}</span>}
      </span>
    </div>
  );
}

function ResRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const overcap = value > max;
  const atCap = value >= max;
  const displayValue = atCap ? max : value;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontSize: 12, lineHeight: 1.5 }}>
      <span style={{ color }}>{label}</span>
      <span>
        <span style={{ color: overcap ? '#888' : atCap ? '#fff' : value < 0 ? '#e85060' : '#fff', fontWeight: 700 }}>
          {displayValue}%
        </span>
        <span style={{ color: '#555', fontSize: 10, marginLeft: 6 }}>
          /{max}%{overcap && ` (+${value - max} over)`}
        </span>
      </span>
    </div>
  );
}
