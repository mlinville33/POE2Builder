import { useMemo, useState } from 'react';
import { SelectedSkill, TreeAction } from '../types';
import { GemIndex, GemEntry } from '../data/gems';

interface Props {
  skills: SelectedSkill[];
  gems: GemIndex;
  dispatch: React.Dispatch<TreeAction>;
}

const GEM_COLOR_HEX: Record<string, string> = {
  r: '#e08070',
  g: '#80d070',
  b: '#80a8e8',
};

type PickerMode =
  | { kind: 'closed' }
  | { kind: 'skill' }
  | { kind: 'support'; skillIndex: number; recommendedIds: string[] };

type SortBy = 'name' | 'attribute' | 'category' | 'recommended';

const ATTR_ORDER: Record<string, number> = { strength: 0, dexterity: 1, intelligence: 2 };
const CATEGORIES = ['Elemental', 'Occult', 'Primal', 'Mace', 'Bow', 'Spear', 'Crossbow', 'Quarterstaff', 'Flail'];

export function SkillsManager({ skills, gems, dispatch }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSkillIdx, setExpandedSkillIdx] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerMode>({ kind: 'closed' });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const onSortChange = (next: SortBy) => {
    setSortBy(next);
    if (next !== 'category') setCategoryFilter('all');
  };

  const selectedGemIds = useMemo(() => new Set(skills.map(s => s.gemId)), [skills]);

  const pickerOptions = useMemo<GemEntry[]>(() => {
    if (picker.kind === 'closed') return [];
    const pool = picker.kind === 'skill' ? gems.active : gems.support;
    const recommendedSet = picker.kind === 'support' ? new Set(picker.recommendedIds) : new Set<string>();
    const q = search.trim().toLowerCase();

    const filtered = pool.filter(g => {
      if (picker.kind === 'skill' && selectedGemIds.has(g.id)) return false;
      if (picker.kind === 'support') {
        const sk = skills[picker.skillIndex];
        if (sk?.supportIds.includes(g.id)) return false;
      }
      if (sortBy === 'category' && categoryFilter !== 'all') {
        if (!g.categories.includes(categoryFilter)) return false;
      }
      if (!q) return true;
      return g.display_name.toLowerCase().includes(q) || g.tags.some(t => t.includes(q));
    });

    const nameSort = (a: GemEntry, b: GemEntry) => a.display_name.localeCompare(b.display_name);

    return filtered.sort((a, b) => {
      if (sortBy === 'recommended' && picker.kind === 'support') {
        const ar = recommendedSet.has(a.id) ? 0 : 1;
        const br = recommendedSet.has(b.id) ? 0 : 1;
        if (ar !== br) return ar - br;
        return nameSort(a, b);
      }
      if (sortBy === 'category') {
        if (a.crafting_level !== b.crafting_level) return a.crafting_level - b.crafting_level;
        return nameSort(a, b);
      }
      if (sortBy === 'attribute') {
        const aa = a.primary_attribute ? ATTR_ORDER[a.primary_attribute] ?? 9 : 9;
        const ba = b.primary_attribute ? ATTR_ORDER[b.primary_attribute] ?? 9 : 9;
        if (aa !== ba) return aa - ba;
        return nameSort(a, b);
      }
      return nameSort(a, b);
    });
  }, [picker, gems, search, sortBy, categoryFilter, selectedGemIds, skills]);

  const openSkillPicker = () => {
    setPicker({ kind: 'skill' });
    setSearch('');
    setSortBy('name');
  };

  const openSupportPicker = (skillIndex: number) => {
    const gem = gems.byId.get(skills[skillIndex].gemId);
    setPicker({ kind: 'support', skillIndex, recommendedIds: gem?.recommended_supports ?? [] });
    setSearch('');
    setSortBy('recommended');
  };

  const closePicker = () => setPicker({ kind: 'closed' });

  const handlePick = (gem: GemEntry) => {
    if (picker.kind === 'skill') {
      dispatch({ type: 'ADD_SKILL', gemId: gem.id });
    } else if (picker.kind === 'support') {
      dispatch({ type: 'ADD_SUPPORT', skillIndex: picker.skillIndex, supportId: gem.id });
    }
    closePicker();
  };

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      left: 16,
      width: 320,
      maxHeight: 'calc(100vh - 80px)',
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
        <span style={{ color: '#88c8ff' }}>Skills</span>
        <span style={{ color: '#8a8a8a', fontSize: 11 }}>
          {skills.length} {collapsed ? '▾' : '▴'}
        </span>
      </div>

      {!collapsed && (
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 12px' }}>
          {skills.length === 0 && (
            <div style={{ color: '#6a6a6a', fontStyle: 'italic', fontSize: 12, marginBottom: 12 }}>
              No skills selected. Use a template or add one below.
            </div>
          )}

          {skills.map((s, i) => {
            const gem = gems.byId.get(s.gemId);
            const name = gem?.display_name ?? s.gemId.split('/').pop() ?? s.gemId;
            const color = gem?.color ? GEM_COLOR_HEX[gem.color] : '#ccc';
            const expanded = expandedSkillIdx === i;
            return (
              <div key={`${s.gemId}-${i}`} style={{
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: i < skills.length - 1 ? '1px solid #232323' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => setExpandedSkillIdx(expanded ? null : i)}
                    style={{ background: 'none', border: 'none', color, fontWeight: 600, fontSize: 13, padding: 0, cursor: 'pointer', flex: 1, textAlign: 'left' }}
                  >
                    {expanded ? '▾' : '▸'} {name}
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_SKILL', index: i })}
                    title="Remove skill"
                    style={{ background: 'none', border: 'none', color: '#c86a41', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                  >
                    ×
                  </button>
                </div>

                {s.note && (
                  <div style={{ color: '#999', fontSize: 11, fontStyle: 'italic', marginTop: 2 }}>{s.note}</div>
                )}

                {s.supportIds.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {s.supportIds.map(sid => {
                      const sg = gems.byId.get(sid);
                      const sname = sg?.display_name ?? sid.split('/').pop() ?? sid;
                      return (
                        <div
                          key={sid}
                          style={{
                            background: '#1a2435',
                            color: '#8898b0',
                            border: '1px solid #2a3450',
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>{sname}</span>
                          <button
                            onClick={() => dispatch({ type: 'REMOVE_SUPPORT', skillIndex: i, supportId: sid })}
                            title="Remove support"
                            style={{ background: 'none', border: 'none', color: '#c86a41', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {expanded && (
                  <button
                    onClick={() => openSupportPicker(i)}
                    style={{
                      marginTop: 8,
                      background: 'transparent',
                      color: '#88a8d8',
                      border: '1px dashed #4a5a78',
                      borderRadius: 4,
                      padding: '3px 8px',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    + Add support gem
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={openSkillPicker}
            style={{
              width: '100%',
              marginTop: 8,
              background: 'transparent',
              color: '#88c8ff',
              border: '1px dashed #4a78a8',
              borderRadius: 4,
              padding: '6px 10px',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            + Add Skill
          </button>
        </div>
      )}

      {picker.kind !== 'closed' && (
        <GemPickerModal
          mode={picker}
          options={pickerOptions}
          search={search}
          onSearch={setSearch}
          sortBy={sortBy}
          onSortChange={onSortChange}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          onPick={handlePick}
          onClose={closePicker}
        />
      )}
    </div>
  );
}

interface GemPickerProps {
  mode: PickerMode;
  options: GemEntry[];
  search: string;
  onSearch: (s: string) => void;
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
  categoryFilter: string;
  onCategoryFilterChange: (c: string) => void;
  onPick: (gem: GemEntry) => void;
  onClose: () => void;
}

function GemPickerModal({ mode, options, search, onSearch, sortBy, onSortChange, categoryFilter, onCategoryFilterChange, onPick, onClose }: GemPickerProps) {
  if (mode.kind === 'closed') return null;
  const recommendedSet = mode.kind === 'support' ? new Set(mode.recommendedIds) : new Set<string>();
  const title = mode.kind === 'skill' ? 'Add Active Skill' : 'Add Support Gem';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480,
          maxHeight: '80vh',
          background: '#15151a',
          border: '1px solid #3a3a3a',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 14 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a' }}>
          <input
            autoFocus
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search by name or tag..."
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
            onChange={e => onSortChange(e.target.value as SortBy)}
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
              minWidth: 130,
            }}
          >
            {mode.kind === 'support' && <option value="recommended">Sort: Recommended</option>}
            <option value="name">Sort: Name (A-Z)</option>
            <option value="category">Sort: Category</option>
            <option value="attribute">Sort: Attribute</option>
          </select>
        </div>

        {sortBy === 'category' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 16px', borderBottom: '1px solid #2a2a2a', background: '#101015' }}>
            {['all', ...CATEGORIES].map(cat => {
              const isActive = categoryFilter === cat;
              const label = cat === 'all' ? 'All' : cat;
              return (
                <button
                  key={cat}
                  onClick={() => onCategoryFilterChange(cat)}
                  style={{
                    background: isActive ? 'rgba(168, 200, 255, 0.14)' : 'transparent',
                    color: isActive ? '#a8c8ff' : '#888',
                    border: `1px solid ${isActive ? '#5878a8' : '#2a2a2a'}`,
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
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {options.length === 0 && (
            <div style={{ padding: 20, color: '#6a6a6a', fontStyle: 'italic', textAlign: 'center', fontSize: 13 }}>
              No matches
            </div>
          )}
          {(() => {
            let lastLevel: number | null = null;
            return options.slice(0, 200).map(gem => {
              const color = gem.color ? GEM_COLOR_HEX[gem.color] : '#ccc';
              const isRecommended = recommendedSet.has(gem.id);
              const showHeader = sortBy === 'category' && gem.crafting_level !== lastLevel;
              if (showHeader) lastLevel = gem.crafting_level;
              return (
                <div key={gem.id}>
                  {showHeader && (
                    <div style={{
                      padding: '6px 16px',
                      background: '#101015',
                      color: '#88c8ff',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      borderTop: '1px solid #1f1f23',
                      borderBottom: '1px solid #1f1f23',
                    }}>
                      Level {gem.crafting_level}
                    </div>
                  )}
                  <button
                    onClick={() => onPick(gem)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      background: isRecommended ? 'rgba(120, 200, 255, 0.06)' : 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #1f1f23',
                      color: '#ddd',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(120, 160, 220, 0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isRecommended ? 'rgba(120, 200, 255, 0.06)' : 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color, fontWeight: 600, fontSize: 13 }}>{gem.display_name}</span>
                      {isRecommended && (
                        <span style={{ fontSize: 9, color: '#88c8ff', background: 'rgba(120,160,220,0.18)', padding: '1px 6px', borderRadius: 3, fontWeight: 700, letterSpacing: 0.5 }}>
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    {gem.tags.length > 0 && (
                      <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
                        {gem.tags.filter(t => t !== 'gem' && t !== 'default' && t !== 'support' && t !== 'support_gem' && t !== 'grants_active_skill').slice(0, 6).join(' · ')}
                      </div>
                    )}
                  </button>
                </div>
              );
            });
          })()}
          {options.length > 200 && (
            <div style={{ padding: 12, color: '#666', textAlign: 'center', fontSize: 11 }}>
              Showing first 200 of {options.length}. Refine search to narrow.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
