import { useReducer, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { TreeState, TreeAction, SkillNode } from './types';
import { ProcessedTree, loadTreeData, buildDisplayNodeMap, buildDisplayEdges } from './data/loader';
import { canAllocate, canDeallocate } from './data/graph';
import { SkillTreeCanvas } from './canvas/SkillTreeCanvas';
import { ClassSelector } from './components/ClassSelector';
import { Tooltip } from './components/Tooltip';
import { StatsPanel } from './components/StatsPanel';
import { SkillsManager } from './components/SkillsManager';
import { GearPanel } from './components/GearPanel';
import { NewBuildModal } from './components/NewBuildModal';
import { buildExportFile, downloadBuildFile } from './data/exportBuild';
import { loadGems, GemIndex } from './data/gems';
import { loadGear, GearIndex } from './data/gear';
import { saveBuild, loadBuild } from './data/buildStorage';

function createReducer(tree: ProcessedTree) {
  return function reducer(state: TreeState, action: TreeAction): TreeState {
    switch (action.type) {
      case 'SELECT_CLASS': {
        const allocated = new Set<string>();
        allocated.add(action.startNodeId);
        return { ...state, selectedClass: action.classIndex, selectedAscendancy: null, allocatedNodes: allocated, hoveredNode: null, skills: [], gear: {}, attributeChoices: {} };
      }
      case 'SELECT_ASCENDANCY': {
        return { ...state, selectedAscendancy: action.ascendancyId, hoveredNode: null };
      }
      case 'NEW_BUILD': {
        const allocated = new Set<string>();
        allocated.add(action.startNodeId);
        return {
          ...state,
          buildName: action.name,
          selectedClass: action.classIndex,
          selectedAscendancy: action.ascendancyId,
          allocatedNodes: allocated,
          hoveredNode: null,
          skills: [],
          gear: {},
          attributeChoices: {},
        };
      }
      case 'LOAD_BUILD': {
        return {
          ...state,
          buildName: action.name,
          selectedClass: action.classIndex,
          selectedAscendancy: action.ascendancyId,
          allocatedNodes: new Set(action.allocatedNodes),
          hoveredNode: null,
          skills: action.skills,
          gear: action.gear ?? {},
          attributeChoices: action.attributeChoices ?? {},
        };
      }
      case 'SET_ATTRIBUTE_CHOICE': {
        return { ...state, attributeChoices: { ...state.attributeChoices, [action.nodeId]: action.choice } };
      }
      case 'ASSIGN_UNSPENT_ATTRIBUTES': {
        const next = { ...state.attributeChoices };
        for (const id of action.nodeIds) next[id] = action.choice;
        return { ...state, attributeChoices: next };
      }
      case 'CLEAR_ATTRIBUTE_CHOICES': {
        return { ...state, attributeChoices: {} };
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
        const choices = { ...state.attributeChoices };
        delete choices[action.nodeId];
        return { ...state, allocatedNodes: allocated, attributeChoices: choices };
      }
      case 'SET_HOVER':
        if (action.nodeId === state.hoveredNode) return state;
        return { ...state, hoveredNode: action.nodeId };
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
      case 'SET_GEAR': {
        return { ...state, gear: { ...state.gear, [action.slot]: action.piece } };
      }
      case 'CLEAR_GEAR': {
        const next = { ...state.gear };
        delete next[action.slot];
        return { ...state, gear: next };
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
  gear: {},
  attributeChoices: {},
  buildName: null,
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
  const [gearIndex, setGearIndex] = useState<GearIndex | null>(null);
  const [newBuildOpen, setNewBuildOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ savedAt: string; pending: boolean } | null>(null);

  useEffect(() => {
    loadGems().then(setGems).catch(e => console.error('Failed to load gems:', e));
  }, []);

  useEffect(() => {
    if (state.selectedClass === null) return;
    if (gearIndex) return;
    loadGear().then(setGearIndex).catch(e => console.error('Failed to load gear:', e));
  }, [state.selectedClass, gearIndex]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const doSave = useCallback(async () => {
    const s = stateRef.current;
    if (!s.buildName || s.selectedClass === null) return;
    setSaveStatus(prev => ({ savedAt: prev?.savedAt ?? '', pending: true }));
    try {
      const result = await saveBuild(s);
      setSaveStatus({ savedAt: result.savedAt, pending: false });
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus(prev => ({ savedAt: prev?.savedAt ?? '', pending: false }));
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (stateRef.current.buildName) doSave();
    }, 60000);
    return () => clearInterval(id);
  }, [doSave]);

  const onCreateBuild = useCallback((args: { name: string; classIndex: number; startNodeId: string; ascendancyId: string | null }) => {
    dispatch({ type: 'NEW_BUILD', ...args });
    setNewBuildOpen(false);
    setSaveStatus(null);
    setTimeout(() => doSave(), 0);
  }, [doSave]);

  const onLoadBuild = useCallback(async (slug: string) => {
    try {
      const data = await loadBuild(slug);
      dispatch({
        type: 'LOAD_BUILD',
        name: data.name,
        classIndex: data.selectedClass,
        ascendancyId: data.selectedAscendancy,
        allocatedNodes: data.allocatedNodes,
        skills: data.skills,
        gear: data.gear,
        attributeChoices: data.attributeChoices,
      });
      setSaveStatus({ savedAt: (data as { savedAt?: string }).savedAt ?? '', pending: false });
    } catch (err) {
      console.error('Load failed:', err);
    }
  }, []);

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

  const classBaseAttrs = useMemo(() => {
    if (state.selectedClass === null) return { level: 1, strength: 0, dexterity: 0, intelligence: 0 };
    const cls = tree.raw.classes[state.selectedClass];
    return {
      level: 1,
      strength: cls?.base_str ?? 0,
      dexterity: cls?.base_dex ?? 0,
      intelligence: cls?.base_int ?? 0,
    };
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
      gear: state.gear,
    });
    downloadBuildFile(filename, content);
  }, [state.selectedClass, state.selectedAscendancy, state.allocatedNodes, state.skills, state.gear, tree]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ClassSelector
        classes={tree.raw.classes}
        selectedClass={state.selectedClass}
        selectedAscendancy={state.selectedAscendancy}
        classStartNodes={tree.classStartNodes}
        allocatedCount={state.allocatedNodes.size}
        dispatch={dispatch}
        onExport={onExport}
        onNewBuild={() => setNewBuildOpen(true)}
        onLoadBuild={onLoadBuild}
        onSave={doSave}
        buildName={state.buildName}
        saveStatus={saveStatus}
      />
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
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
        {state.selectedClass !== null && gems && (
          <SkillsManager skills={state.skills} gems={gems} dispatch={dispatch} />
        )}
        {state.selectedClass !== null && (
          <GearPanel gear={state.gear} classBaseAttrs={classBaseAttrs} gearIndex={gearIndex} dispatch={dispatch} />
        )}
        {state.selectedClass !== null && (
          <StatsPanel
            allocatedNodes={state.allocatedNodes}
            nodeMap={tree.nodeMap}
            gear={state.gear}
            gearIndex={gearIndex}
            classBaseAttrs={classBaseAttrs}
            attributeChoices={state.attributeChoices}
            dispatch={dispatch}
          />
        )}
      </div>
      <Tooltip node={hoveredNodeData} screenPos={hoverPos} />
      {newBuildOpen && (
        <NewBuildModal
          classes={tree.raw.classes}
          classStartNodes={tree.classStartNodes}
          onCreate={onCreateBuild}
          onCancel={() => setNewBuildOpen(false)}
        />
      )}
    </div>
  );
}
