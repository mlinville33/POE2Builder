import { SkillNode } from '../types';
import { cleanStatText } from '../data/loader';

interface Props {
  node: SkillNode | null;
  screenPos: { x: number; y: number } | null;
}

function getNodeType(node: SkillNode): string {
  if (node.classStartIndex) return 'Class Start';
  if (node.isKeystone) return 'Keystone';
  if (node.isNotable) return 'Notable';
  if (node.isMastery) return 'Mastery';
  if (node.isJewelSocket) return 'Jewel Socket';
  if (node.isAscendancyStart) return 'Ascendancy Start';
  if (node.ascendancyId) return 'Ascendancy';
  return 'Passive';
}

function getTypeBadgeColor(type: string): string {
  switch (type) {
    case 'Keystone': return '#c86a41';
    case 'Notable': return '#6aad35';
    case 'Mastery': return '#6a6ac8';
    case 'Jewel Socket': return '#41c8c8';
    case 'Class Start': return '#4a6ac8';
    case 'Ascendancy Start': return '#c8a641';
    case 'Ascendancy': return '#8a8adb';
    default: return '#8a7428';
  }
}

export function Tooltip({ node, screenPos }: Props) {
  if (!node || !screenPos || !node.name) return null;

  const type = getNodeType(node);
  const badgeColor = getTypeBadgeColor(type);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: screenPos.x + 15,
    top: screenPos.y - 10,
    background: 'rgba(12, 12, 14, 0.95)',
    border: '1px solid #3a3a3a',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#ddd',
    fontSize: 13,
    fontFamily: 'system-ui, sans-serif',
    maxWidth: 320,
    pointerEvents: 'none' as const,
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
  };

  return (
    <div style={style}>
      <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4, color: '#fff' }}>
        {node.name}
      </div>
      <div style={{
        display: 'inline-block',
        background: badgeColor,
        color: '#fff',
        fontSize: 10,
        padding: '1px 6px',
        borderRadius: 3,
        marginBottom: 6,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        {type}
      </div>
      {node.ascendancyId && (
        <div style={{ fontSize: 11, color: '#8a8adb', marginBottom: 4 }}>
          {node.ascendancyId}
        </div>
      )}
      {node.stats && node.stats.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {node.stats.map((stat, i) => (
            <div key={i} style={{ color: '#a0c8ff', fontSize: 12, lineHeight: 1.4 }}>
              {cleanStatText(stat)}
            </div>
          ))}
        </div>
      )}
      {node.flavourText && node.flavourText.length > 0 && (
        <div style={{ marginTop: 6, fontStyle: 'italic', color: '#7a7a6a', fontSize: 11 }}>
          {node.flavourText.map((t, i) => <div key={i}>{t}</div>)}
        </div>
      )}
    </div>
  );
}
