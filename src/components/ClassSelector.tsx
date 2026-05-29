import { useMemo, useState, useEffect, useRef } from 'react';
import { ClassDef, AscendancyDef, TreeAction } from '../types';
import { listBuilds, BuildListItem } from '../data/buildStorage';

interface Props {
  classes: ClassDef[];
  selectedClass: number | null;
  selectedAscendancy: string | null;
  classStartNodes: Map<number, string>;
  allocatedCount: number;
  dispatch: React.Dispatch<TreeAction>;
  onExport: () => void;
  onNewBuild: () => void;
  onLoadBuild: (slug: string) => void;
  onSave: () => void;
  buildName: string | null;
  saveStatus: { savedAt: string; pending: boolean } | null;
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

function formatSaveStatus(savedAt: string, now: number): string {
  if (!savedAt) return 'Not saved';
  const ageSec = Math.floor((now - new Date(savedAt).getTime()) / 1000);
  if (ageSec < 5) return 'Saved just now';
  if (ageSec < 60) return `Saved ${ageSec}s ago`;
  if (ageSec < 3600) return `Saved ${Math.floor(ageSec / 60)}m ago`;
  return `Saved ${Math.floor(ageSec / 3600)}h ago`;
}

export function ClassSelector({ classes, selectedClass, selectedAscendancy, classStartNodes, allocatedCount, dispatch, onExport, onNewBuild, onLoadBuild, onSave, buildName, saveStatus }: Props) {
  const [buildsOpen, setBuildsOpen] = useState(false);
  const [savedBuilds, setSavedBuilds] = useState<BuildListItem[] | null>(null);
  const [buildsLoading, setBuildsLoading] = useState(false);
  const buildsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buildsOpen) return;
    setBuildsLoading(true);
    listBuilds()
      .then(list => setSavedBuilds(list.sort((a, b) => b.savedAt.localeCompare(a.savedAt))))
      .catch(err => { console.error('Failed to list builds:', err); setSavedBuilds([]); })
      .finally(() => setBuildsLoading(false));
  }, [buildsOpen]);

  useEffect(() => {
    if (!buildsOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (!buildsRef.current?.contains(e.target as Node)) setBuildsOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [buildsOpen]);

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
      flexShrink: 0,
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
      {buildName && (
        <div style={{ color: '#fff', fontSize: 12, padding: '3px 8px', background: 'rgba(168,200,255,0.1)', border: '1px solid #2a4a78', borderRadius: 4 }}>
          <span style={{ fontWeight: 700 }}>{buildName}</span>
          {saveStatus && (
            <span style={{ color: '#888', marginLeft: 8, fontSize: 11 }}>
              {saveStatus.pending ? 'Saving…' : formatSaveStatus(saveStatus.savedAt, Date.now())}
            </span>
          )}
        </div>
      )}

      <div ref={buildsRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setBuildsOpen(o => !o)}
          style={{
            background: buildsOpen ? '#3a3050' : 'transparent',
            color: '#c8a8ff',
            border: `1px solid ${buildsOpen ? '#8a6ac8' : '#4a3a6a'}`,
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Builds {buildsOpen ? '▴' : '▾'}
        </button>
        {buildsOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 280,
            maxHeight: 360,
            overflowY: 'auto',
            background: 'rgba(12, 12, 14, 0.98)',
            border: '1px solid #4a3a6a',
            borderRadius: 6,
            padding: 4,
            zIndex: 200,
            boxShadow: '0 6px 18px rgba(0,0,0,0.8)',
          }}>
            {buildsLoading && (
              <div style={{ padding: 12, color: '#888', fontSize: 12, textAlign: 'center', fontStyle: 'italic' }}>Loading…</div>
            )}
            {!buildsLoading && savedBuilds && savedBuilds.length === 0 && (
              <div style={{ padding: 12, color: '#888', fontSize: 12, textAlign: 'center', fontStyle: 'italic' }}>No saved builds yet</div>
            )}
            {!buildsLoading && savedBuilds && savedBuilds.map(b => (
              <button
                key={b.slug}
                onClick={() => { onLoadBuild(b.slug); setBuildsOpen(false); }}
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
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>{new Date(b.savedAt).toLocaleString()}</div>
              </button>
            ))}
            <div style={{ borderTop: '1px solid #2a2a2a', marginTop: 4, paddingTop: 4 }}>
              <button
                onClick={() => { setBuildsOpen(false); onNewBuild(); }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  color: '#c8a8ff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: 13,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(138,106,200,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                + Create new build
              </button>
            </div>
          </div>
        )}
      </div>

      {buildName && (
        <button
          onClick={onSave}
          disabled={saveStatus?.pending}
          title="Save build to disk now"
          style={{
            background: 'transparent',
            color: '#80d070',
            border: '1px solid #4a8a35',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 12,
            cursor: saveStatus?.pending ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {saveStatus?.pending ? 'Saving…' : 'Save'}
        </button>
      )}

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
