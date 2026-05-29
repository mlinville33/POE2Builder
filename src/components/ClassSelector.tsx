import { useMemo, useState, useEffect, useRef } from 'react';
import { ClassDef, AscendancyDef, TreeAction } from '../types';
import { BuildTemplate, BUILD_TEMPLATES } from '../data/buildTemplates';

interface Props {
  classes: ClassDef[];
  selectedClass: number | null;
  selectedAscendancy: string | null;
  classStartNodes: Map<number, string>;
  allocatedCount: number;
  dispatch: React.Dispatch<TreeAction>;
  onExport: () => void;
  onLoadTemplate: (template: BuildTemplate) => void;
  templatesReady: boolean;
}

const CLASS_COLORS: Record<string, string> = {
  Witch: '#a855e0',
  Ranger: '#41c868',
  Warrior: '#c86a41',
  Sorceress: '#6a6ac8',
  Huntress: '#e0a040',
  Mercenary: '#c8a641',
  Monk: '#41c8c8',
  Druid: '#5aa860',
};

function getAscendanciesForClass(classes: ClassDef[], classIndex: number): AscendancyDef[] {
  const cls = classes[classIndex];
  if (!cls) return [];
  return cls.ascendancies.filter(a => a.name != null);
}

export function ClassSelector({ classes, selectedClass, selectedAscendancy, classStartNodes, allocatedCount, dispatch, onExport, onLoadTemplate, templatesReady }: Props) {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const templatesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!templatesOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (!templatesRef.current?.contains(e.target as Node)) setTemplatesOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [templatesOpen]);

  const playableClasses = useMemo(() => {
    return classes
      .map((cls, index) => ({ cls, index }))
      .filter(({ cls }) => cls.ascendancies.some(a => a.name != null))
      .map(({ cls, index }) => ({
        index,
        name: cls.name,
        color: CLASS_COLORS[cls.name] ?? '#8a8a8a',
      }));
  }, [classes]);

  const ascendancies = selectedClass !== null ? getAscendanciesForClass(classes, selectedClass) : [];

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 16px',
      background: 'rgba(12, 12, 14, 0.9)',
      borderBottom: '1px solid #2a2a2a',
      zIndex: 100,
      fontFamily: 'system-ui, sans-serif',
      flexWrap: 'wrap',
    }}>
      <span style={{ color: '#8a8a8a', fontSize: 13, marginRight: 4 }}>Class:</span>
      {playableClasses.map(cls => {
        const isActive = selectedClass === cls.index;
        const startNode = classStartNodes.get(cls.index);
        return (
          <button
            key={cls.index}
            onClick={() => {
              if (startNode) {
                dispatch({ type: 'SELECT_CLASS', classIndex: cls.index, startNodeId: startNode });
              }
            }}
            style={{
              background: isActive ? cls.color : 'transparent',
              color: isActive ? '#fff' : '#a8a8a8',
              border: `1px solid ${isActive ? cls.color : '#3a3a3a'}`,
              borderRadius: 4,
              padding: '4px 12px',
              fontSize: 13,
              fontWeight: isActive ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {cls.name}
          </button>
        );
      })}

      {ascendancies.length > 0 && (
        <>
          <div style={{ width: 1, height: 20, background: '#3a3a3a', margin: '0 4px' }} />
          <span style={{ color: '#8a8a8a', fontSize: 13, marginRight: 4 }}>Ascendancy:</span>
          {ascendancies.map(asc => {
            const isActive = selectedAscendancy === asc.id;
            return (
              <button
                key={asc.id}
                onClick={() => {
                  dispatch({ type: 'SELECT_ASCENDANCY', ascendancyId: isActive ? null : asc.id });
                }}
                style={{
                  background: isActive ? '#6a5a8a' : 'transparent',
                  color: isActive ? '#e0d0ff' : '#a8a8a8',
                  border: `1px solid ${isActive ? '#9a85c0' : '#3a3a3a'}`,
                  borderRadius: 4,
                  padding: '4px 12px',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {asc.name}
              </button>
            );
          })}
        </>
      )}

      <div style={{ marginLeft: 'auto', color: '#8a8a8a', fontSize: 13 }}>
        {allocatedCount > 0 && (
          <>
            <span style={{ color: '#e0c050', fontWeight: 700 }}>{allocatedCount - 1}</span>
            <span> points</span>
          </>
        )}
      </div>
      <div ref={templatesRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setTemplatesOpen(o => !o)}
          disabled={!templatesReady}
          title={templatesReady ? 'Load a pre-built starter build' : 'Loading gem data...'}
          style={{
            background: templatesOpen ? '#3a3050' : 'transparent',
            color: templatesReady ? '#c8a8ff' : '#5a5a5a',
            border: `1px solid ${templatesOpen ? '#8a6ac8' : '#4a3a6a'}`,
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 12,
            cursor: templatesReady ? 'pointer' : 'not-allowed',
            fontWeight: 600,
          }}
        >
          Templates {templatesOpen ? '▴' : '▾'}
        </button>
        {templatesOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 320,
            background: 'rgba(12, 12, 14, 0.98)',
            border: '1px solid #4a3a6a',
            borderRadius: 6,
            padding: 6,
            zIndex: 200,
            boxShadow: '0 6px 18px rgba(0,0,0,0.8)',
          }}>
            {BUILD_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => { onLoadTemplate(t); setTemplatesOpen(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  color: '#ddd',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(138,106,200,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ color: '#c8a8ff', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{t.name}</div>
                <div style={{ color: '#888', fontSize: 11, lineHeight: 1.4 }}>{t.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedClass !== null && (
        <>
          <button
            onClick={onExport}
            title="Download a .build file compatible with POE2 0.5+"
            style={{
              background: 'transparent',
              color: '#88c8ff',
              border: '1px solid #4a78a8',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Export .build
          </button>
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            style={{
              background: 'transparent',
              color: '#c86a41',
              border: '1px solid #c86a41',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </>
      )}
    </div>
  );
}
