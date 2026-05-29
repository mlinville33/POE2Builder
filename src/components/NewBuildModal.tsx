import { useMemo, useState } from 'react';
import { ClassDef } from '../types';

interface Props {
  classes: ClassDef[];
  classStartNodes: Map<number, string>;
  onCreate: (args: { name: string; classIndex: number; startNodeId: string; ascendancyId: string | null }) => void;
  onCancel: () => void;
}

export function NewBuildModal({ classes, classStartNodes, onCreate, onCancel }: Props) {
  const playableClasses = useMemo(() => {
    return classes
      .map((cls, index) => ({ cls, index }))
      .filter(({ cls }) => cls.ascendancies.some(a => a.name != null))
      .map(({ cls, index }) => ({ index, name: cls.name }));
  }, [classes]);

  const [name, setName] = useState('');
  const [classIndex, setClassIndex] = useState<number>(playableClasses[0]?.index ?? -1);
  const [ascendancyId, setAscendancyId] = useState<string>('');

  const ascendancies = useMemo(() => {
    if (classIndex < 0) return [];
    return classes[classIndex]?.ascendancies.filter(a => a.name != null && a.id) ?? [];
  }, [classes, classIndex]);

  const canCreate = name.trim().length > 0 && classIndex >= 0;

  const handleCreate = () => {
    if (!canCreate) return;
    const startNodeId = classStartNodes.get(classIndex);
    if (!startNodeId) return;
    onCreate({
      name: name.trim(),
      classIndex,
      startNodeId,
      ascendancyId: ascendancyId || null,
    });
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 440,
          background: '#15151a',
          border: '1px solid #3a3a3a',
          borderRadius: 8,
          padding: 20,
          boxShadow: '0 12px 36px rgba(0,0,0,0.8)',
          color: '#ddd',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
          Start a new build
        </div>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Name</div>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My ED Contagion Lich"
            onKeyDown={e => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
            style={{
              width: '100%',
              background: '#0c0c10',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              color: '#ddd',
              padding: '8px 10px',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Class</div>
          <select
            value={classIndex}
            onChange={e => { setClassIndex(Number(e.target.value)); setAscendancyId(''); }}
            style={{
              width: '100%',
              background: '#0c0c10',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              color: '#ddd',
              padding: '8px 10px',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {playableClasses.map(c => (
              <option key={c.index} value={c.index}>{c.name}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Ascendancy <span style={{ color: '#555', textTransform: 'none' }}>(optional)</span>
          </div>
          <select
            value={ascendancyId}
            onChange={e => setAscendancyId(e.target.value)}
            style={{
              width: '100%',
              background: '#0c0c10',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              color: '#ddd',
              padding: '8px 10px',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="">(none)</option>
            {ascendancies.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: '#999',
              border: '1px solid #3a3a3a',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            style={{
              background: canCreate ? '#4a78a8' : '#2a3a4a',
              color: canCreate ? '#fff' : '#666',
              border: '1px solid #4a78a8',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 13,
              cursor: canCreate ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              fontWeight: 600,
            }}
          >
            Create Build
          </button>
        </div>
      </div>
    </div>
  );
}
