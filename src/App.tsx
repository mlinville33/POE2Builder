import { useReducer, useEffect, useState, useCallback, useMemo } from 'react';
import { TreeState, TreeAction, SkillNode, SelectedSkill } from './types';
import { ProcessedTree, loadTreeData, buildDisplayNodeMap, buildDisplayEdges } from './data/loader';
import { canAllocate, canDeallocate } from './data/graph';
import { SkillTreeCanvas } from './canvas/SkillTreeCanvas';
import { ClassSelector } from './components/ClassSelector';
import { Tooltip } from './components/Tooltip';
import { StatsPanel } from './components/StatsPanel';
import { SkillsManager } from './components/SkillsManager';
import { buildExportFile, downloadBuildFile } from './data/exportBuild';
import { loadGems, GemIndex } from './data/gems';
import { BuildTemplate } from './data/buildTemplates';

function createReducer(tree: ProcessedTree) {
  return function reducer(state: TreeState, action: TreeAction): TreeState {
    switch (action.type) {
      case 'SELECT_CLASS': {
        const allocated = new Set<string>();
        allocated.add(action.startNodeId);
        return { ...state, selectedClass: action.classIndex, selectedAscendancy: null, allocatedNodes: allocated, hoveredNode: null, skills: [], templateId: null };
      }
      case 'SELECT_ASCENDANCY': {
        return { ...state, selectedAscendancy: action.ascendancyId, hoveredNode: null };
      }
      case 'ALLOCATE_NODE': {
        if (state.selectedClass === null) return state;
        if (!canAllocate(action.nodeId, state.allocatedNodes, tree.adjacency)) return state;
        const allocated = new Set(state.allocatedNodes);
        allocated.add(action.nodeId);
        return { ...state, allocatedNodes: allocated };
      }
      case 'DEALLOCATE_NODE': {
        if (state.selectedClass === null) return state;
        const classStartId = tree.classStartNodes.get(state.selectedClass);
        if (!classStartId) return state;
        if (!canDeallocate(action.nodeId, state.allocatedNodes, classStartId, tree.adjacency)) return state;
        const allocated = new Set(state.allocatedNodes);
        allocated.delete(action.nodeId);
        return { ...state, allocatedNodes: allocated };
      }
      case 'SET_HOVER':
        if (action.nodeId === state.hoveredNode) return state;
        return { ...state, hoveredNode: action.nodeId };
      case 'LOAD_TEMPLATE': {
        const allocated = new Set<string>();
        allocated.add(action.startNodeId);
        return {
          ...state,
          selectedClass: action.classIndex,
          selectedAscendancy: action.ascendancyId,
          allocatedNodes: allocated,
          hoveredNode: null,
          skills: action.skills,
          templateId: action.templateId,
        };
      }
      case 'ADD_SKILL': {
        if (state.skills.some(s => s.gemId === action.gemId)) return state;
        return { ...state, skills: [...state.skills, { gemId: action.gemId, supportIds: [] }] };
      }
      case 'REMOVE_SKILL': {
        return { ...state, skills: state.skills.filter((_, i) => i !== action.index) };
      }
      case 'ADD_SUPPORT': {
        return {
          ...state,
          skills: state.skills.map((s, i) => {
            if (i !== action.skillIndex) return s;
            if (s.supportIds.includes(action.supportId)) return s;
            return { ...s, supportIds: [...s.supportIds, action.supportId] };
          }),
        };
      }
      case 'REMOVE_SUPPORT': {
        return {
          ...state,
          skills: state.skills.map((s, i) => {
            if (i !== action.skillIndex) return s;
            return { ...s, supportIds: s.supportIds.filter(id => id !== action.supportId) };
          }),
        };
      }
      case 'RESET':
        return initialState;
      default:
        return state;
    }
  };
}

const initialState: TreeState = {
  selectedClass: null,
  selectedAscendancy: null,
  allocatedNodes: new Set(),
  hoveredNode: null,
  skills: [],
  templateId: null,
};

export default function App() {
  const [tree, setTree] = useState<ProcessedTree | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTreeData().then(setTree).catch(e => setError(e.message));
  }, []);

  if (error) {
    return <div style={{ color: '#c86a41', padding: 40, fontFamily: 'monospace' }}>Failed to load skill tree: {error}</div>;
  }

  if (!tree) {
    return <div style={{ color: '#8a8a8a', padding: 40, fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading skill tree...</div>;
  }

  return <TreeApp tree={tree} />;
}

function TreeApp({ tree }: { tree: ProcessedTree }) {
  const [state, dispatch] = useReducer(createReducer(tree), initialState);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [gems, setGems] = useState<GemIndex | null>(null);

  useEffect(() => {
    loadGems().then(setGems).catch(e => console.error('Failed to load gems:', e));
  }, []);

  const onLoadTemplate = useCallback((template: BuildTemplate) => {
    if (!gems) {
      console.warn('Gems not yet loaded; cannot apply template');
      return;
    }
    const startNodeId = tree.classStartNodes.get(template.classIndex);
    if (!startNodeId) return;

    const skills: SelectedSkill[] = [];
    for (const tplSkill of template.skills) {
      const gem = gems.byDisplayName.get(tplSkill.gemDisplayName);
      if (!gem) {
        console.warn(`Gem not found in data: ${tplSkill.gemDisplayName}`);
        continue;
      }
      const maxSupports = tplSkill.maxSupports ?? 0;
      const supportIds = gem.recommended_supports.slice(0, maxSupports);
      skills.push({
        gemId: gem.id,
        supportIds,
        note: tplSkill.note,
      });
    }

    dispatch({
      type: 'LOAD_TEMPLATE',
      templateId: template.id,
      classIndex: template.classIndex,
      startNodeId,
      ascendancyId: template.ascendancyId,
      skills,
    });
  }, [gems, tree.classStartNodes]);

  const displayNodeMap = useMemo(
    () => buildDisplayNodeMap(tree.nodeMap, state.selectedAscendancy, tree.ascendancies),
    [tree, state.selectedAscendancy],
  );

  const displayEdges = useMemo(
    () => buildDisplayEdges(tree.raw.edges, tree.nodeMap, state.selectedAscendancy, tree.ascendancies),
    [tree, state.selectedAscendancy],
  );

  const fitBounds = useMemo(() => ({
    minX: tree.raw.min_x,
    minY: tree.raw.min_y,
    maxX: tree.raw.max_x,
    maxY: tree.raw.max_y,
  }), [tree]);

  const nameOverrides = useMemo(() => {
    const map = new Map<string, string>();
    if (state.selectedClass !== null) {
      const startNodeId = tree.classStartNodes.get(state.selectedClass);
      const cls = tree.raw.classes[state.selectedClass];
      if (startNodeId && cls) {
        map.set(startNodeId, cls.name.toUpperCase());
      }
    }
    return map;
  }, [state.selectedClass, tree]);

  const hoveredNodeData: SkillNode | null = state.hoveredNode
    ? displayNodeMap.get(state.hoveredNode) ?? tree.nodeMap.get(state.hoveredNode) ?? null
    : null;

  const onHoverScreenPos = useCallback((pos: { x: number; y: number } | null) => {
    setHoverPos(pos);
  }, []);

  const onExport = useCallback(() => {
    const { filename, content } = buildExportFile({
      selectedClass: state.selectedClass,
      selectedAscendancy: state.selectedAscendancy,
      allocatedNodes: state.allocatedNodes,
      nodeMap: tree.nodeMap,
      classes: tree.raw.classes,
      skills: state.skills,
    });
    downloadBuildFile(filename, content);
  }, [state.selectedClass, state.selectedAscendancy, state.allocatedNodes, state.skills, tree]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ClassSelector
        classes={tree.raw.classes}
        selectedClass={state.selectedClass}
        selectedAscendancy={state.selectedAscendancy}
        classStartNodes={tree.classStartNodes}
        allocatedCount={state.allocatedNodes.size}
        dispatch={dispatch}
        onExport={onExport}
        onLoadTemplate={onLoadTemplate}
        templatesReady={gems !== null}
      />
      <div style={{ position: 'absolute', top: 45, left: 0, right: 0, bottom: 0 }}>
        <SkillTreeCanvas
          displayNodeMap={displayNodeMap}
          displayEdges={displayEdges}
          allocatedNodes={state.allocatedNodes}
          hoveredNode={state.hoveredNode}
          dispatch={dispatch}
          onHoverScreenPos={onHoverScreenPos}
          fitBounds={fitBounds}
          nameOverrides={nameOverrides}
        />
      </div>
      {state.selectedClass !== null && gems && (
        <SkillsManager skills={state.skills} gems={gems} dispatch={dispatch} />
      )}
      {state.selectedClass !== null && (
        <StatsPanel
          allocatedNodes={state.allocatedNodes}
          nodeMap={tree.nodeMap}
        />
      )}
      <Tooltip node={hoveredNodeData} screenPos={hoverPos} />
    </div>
  );
}
