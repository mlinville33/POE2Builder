import { useMemo, useState } from 'react';
import { SkillNode } from '../types';
import { cleanStatText } from '../data/loader';

interface Props {
  allocatedNodes: Set<string>;
  nodeMap: Map<string, SkillNode>;
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
  if (value % 1 === 0) return (value >= 0 ? '' : '') + value.toString();
  return value.toFixed(1);
}

export function StatsPanel({ allocatedNodes, nodeMap }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const stats = useMemo(
    () => aggregateStats(allocatedNodes, nodeMap),
    [allocatedNodes, nodeMap],
  );

  const numericRows = useMemo(() => {
    return [...stats.numeric.entries()]
      .map(([template, value]) => ({
        text: template.replace('#', formatValue(value)),
      }))
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
        <span style={{ color: '#f0d070' }}>Build Summary</span>
        <span style={{ color: '#8a8a8a', fontSize: 11 }}>
          {allocatedPoints} pts {collapsed ? '▾' : '▴'}
        </span>
      </div>

      {!collapsed && (
        <div style={{ overflowY: 'auto', padding: '8px 12px', flex: 1 }}>
          {numericRows.length === 0 && stats.literal.length === 0 && (
            <div style={{ color: '#6a6a6a', fontStyle: 'italic', fontSize: 12 }}>
              No stats allocated yet
            </div>
          )}

          {numericRows.length > 0 && (
            <div style={{ marginBottom: stats.literal.length > 0 ? 12 : 0 }}>
              {numericRows.map((row, i) => (
                <div key={i} style={{ color: '#a0c8ff', fontSize: 12, lineHeight: 1.5 }}>
                  {row.text}
                </div>
              ))}
            </div>
          )}

          {stats.literal.length > 0 && (
            <div>
              <div style={{ color: '#8a8a8a', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Effects
              </div>
              {stats.literal.map((text, i) => (
                <div key={i} style={{ color: '#c0a0f0', fontSize: 12, lineHeight: 1.5, marginBottom: 2 }}>
                  {text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
