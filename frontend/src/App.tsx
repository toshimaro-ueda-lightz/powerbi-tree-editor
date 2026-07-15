import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { DepartmentRecord } from '@powerbi-tree-editor/domain';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EditPanel } from './components/EditPanel';
import { AddChildDialog } from './components/AddChildDialog';
import { WeightEditorDialog } from './components/WeightEditorDialog';
import { IconButton } from './components/ui';
import { AppShell, AppBody, AppMain, TreeCanvasEmpty, FloatingBanner } from './App.styled';
import { TreeCanvas, type TreeCanvasHandle } from './tree/TreeCanvas';
import { useApiVersion } from './hooks/useApiVersion';
import { STRINGS } from './strings';
import { CURRENT_FISCAL_YEAR } from './config';
import type { SaveStatus, TreeSnapshot } from './types';
import {
  addChildNode,
  detachNode,
  discard,
  getTree,
  isDirty,
  listDepartments,
  save,
  updateFirstLevelArea,
  updateNode,
  updateProgress,
  updateWeights,
} from './api/apiService';

const EMPTY_TREE = (departmentId: string, fiscalYear: number): TreeSnapshot => ({
  departmentId,
  fiscalYear,
  nodesById: {},
  rootIds: [],
  kpiTarget: null,
});

function App() {
  const apiVersion = useApiVersion(); // re-render whenever the api service's session state changes

  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [fiscalYear, setFiscalYear] = useState(CURRENT_FISCAL_YEAR);
  const [tree, setTree] = useState<TreeSnapshot | null>(null);
  const [treeLoading, setTreeLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [maxLevel, setMaxLevel] = useState(6);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
  const [weightEditorParentId, setWeightEditorParentId] = useState<string | null>(null);
  const [canvasBanner, setCanvasBanner] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const treeCanvasRef = useRef<TreeCanvasHandle>(null);

  // Load the department list once on mount.
  useEffect(() => {
    let alive = true;
    listDepartments().then((depts) => {
      if (!alive) return;
      setDepartments(depts);
      setDepartmentsLoaded(true);
      setSelectedDepartmentId((prev) => prev || depts[0]?.department_id || '');
    });
    return () => {
      alive = false;
    };
  }, []);

  // (Re)fetch the tree whenever the selected department/year changes, or the
  // api service reports a mutation/save/discard (apiVersion bump).
  useEffect(() => {
    if (!selectedDepartmentId) return;
    let alive = true;
    setTreeLoading(true);
    getTree(selectedDepartmentId, fiscalYear).then((snapshot) => {
      if (!alive) return;
      setTree(snapshot);
      setTreeLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartmentId, fiscalYear, apiVersion]);

  const effectiveTree = tree ?? EMPTY_TREE(selectedDepartmentId, fiscalYear);

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of Object.values(effectiveTree.nodesById)) {
      if (v.assignee) set.add(v.assignee);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [effectiveTree]);

  const matchCount = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return null;
    return Object.values(effectiveTree.nodesById).filter((v) => v.name.toLowerCase().includes(q)).length;
  }, [effectiveTree, searchTerm]);

  const selectedView = selectedNodeId ? effectiveTree.nodesById[selectedNodeId] ?? null : null;
  const parentView = selectedView?.parentNodeId ? effectiveTree.nodesById[selectedView.parentNodeId] ?? null : null;

  function handleSelectNode(id: string) {
    setSelectedNodeId(id === '' ? null : id);
    setPanelError(null);
  }

  function handleChangeDepartment(id: string) {
    setSelectedDepartmentId(id);
    setSelectedNodeId(null);
    setPanelError(null);
    setCanvasBanner(null);
  }

  function handleChangeFiscalYear(year: number) {
    setFiscalYear(year);
    setPanelError(null);
  }

  function handleRequestAddChild(parentNodeId: string) {
    const parent = effectiveTree.nodesById[parentNodeId];
    if (!parent) return;
    if (parent.isLeaf && parent.outcomeProgress > 0) {
      setCanvasBanner(STRINGS.app.addChildRejectedProgress);
      return;
    }
    setCanvasBanner(null);
    setAddChildParentId(parentNodeId);
  }

  async function handleAddChildSubmit(input: { name: string; subtitle?: string | null; assignee?: string | null; weight: number }) {
    if (!addChildParentId) return { ok: false as const, reason: STRINGS.app.internalNoParent };
    const result = await addChildNode(selectedDepartmentId, addChildParentId, input);
    if (result.ok) setSelectedNodeId(result.nodeId);
    return result;
  }

  function suggestedWeightPct(parentNodeId: string): number {
    const parent = effectiveTree.nodesById[parentNodeId];
    if (!parent) return 100;
    const usedPct = parent.childNodeIds.reduce((sum, id) => sum + (effectiveTree.nodesById[id]?.weightFromParent ?? 0) * 100, 0);
    return Math.max(0, Math.min(100, 100 - usedPct));
  }

  async function handleDetach(nodeId: string) {
    const result = await detachNode(selectedDepartmentId, nodeId);
    if (!result.ok) {
      setCanvasBanner(result.reason);
      if (selectedNodeId === nodeId) setPanelError(result.reason);
      return;
    }
    setCanvasBanner(null);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setPanelError(null);
    }
  }

  async function handleUpdateNode(patch: { name?: string; subtitle?: string | null; assignee?: string | null }) {
    if (!selectedNodeId) return;
    const result = await updateNode(selectedDepartmentId, selectedNodeId, patch);
    setPanelError(result.ok ? null : result.reason);
  }

  async function handleUpdateProgress(pct: number) {
    if (!selectedNodeId) return;
    const result = await updateProgress(selectedDepartmentId, selectedNodeId, pct / 100);
    setPanelError(result.ok ? null : result.reason);
  }

  async function handleUpdateArea(value: number) {
    if (!selectedNodeId) return;
    const result = await updateFirstLevelArea(selectedDepartmentId, fiscalYear, selectedNodeId, value);
    setPanelError(result.ok ? null : result.reason);
  }

  function handleOpenWeightEditor(parentNodeId: string) {
    setWeightEditorParentId(parentNodeId);
  }

  async function handleWeightSubmit(items: { childNodeId: string; weight: number }[]) {
    if (!weightEditorParentId) return { ok: false as const, reason: STRINGS.app.internalNoParent };
    return updateWeights(selectedDepartmentId, weightEditorParentId, items);
  }

  async function handleSave() {
    setSaveStatus('saving');
    try {
      await save();
      setSaveStatus('idle');
    } catch {
      setSaveStatus('error');
    }
  }

  async function handleDiscard() {
    await discard();
    setSaveStatus('idle');
    setSelectedNodeId(null);
    setPanelError(null);
    setCanvasBanner(null);
  }

  const weightEditorParent = weightEditorParentId ? effectiveTree.nodesById[weightEditorParentId] : null;
  const addChildParent = addChildParentId ? effectiveTree.nodesById[addChildParentId] : null;

  return (
    <AppShell>
      <Header
        departments={departments}
        selectedDepartmentId={selectedDepartmentId}
        onChangeDepartment={handleChangeDepartment}
        fiscalYear={fiscalYear}
        onChangeFiscalYear={handleChangeFiscalYear}
        isDirty={isDirty()}
        saveStatus={saveStatus}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
      <AppBody>
        <Sidebar
          searchTerm={searchTerm}
          onChangeSearch={setSearchTerm}
          maxLevel={maxLevel}
          onChangeMaxLevel={setMaxLevel}
          assigneeFilter={assigneeFilter}
          onChangeAssigneeFilter={setAssigneeFilter}
          assigneeOptions={assigneeOptions}
          onFitView={() => treeCanvasRef.current?.fitView()}
          onFocusSelected={() => selectedNodeId && treeCanvasRef.current?.focusNode(selectedNodeId)}
          hasSelection={selectedNodeId !== null}
          matchCount={matchCount}
        />
        <AppMain>
          {canvasBanner && (
            <FloatingBanner>
              <span>{canvasBanner}</span>
              <IconButton type="button" aria-label={STRINGS.common.close} onClick={() => setCanvasBanner(null)}>
                <X size={14} />
              </IconButton>
            </FloatingBanner>
          )}
          {!departmentsLoaded || treeLoading ? (
            <TreeCanvasEmpty>
              <p>{!departmentsLoaded ? STRINGS.app.loadingDepartments : STRINGS.app.loadingTree}</p>
            </TreeCanvasEmpty>
          ) : Object.keys(effectiveTree.nodesById).length === 0 ? (
            <TreeCanvasEmpty>
              <p>{STRINGS.app.emptyTree}</p>
            </TreeCanvasEmpty>
          ) : (
            <TreeCanvas
              ref={treeCanvasRef}
              tree={effectiveTree}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              onRequestAddChild={handleRequestAddChild}
              onRequestDetach={handleDetach}
              maxLevel={maxLevel}
              searchTerm={searchTerm}
              assigneeFilter={assigneeFilter}
            />
          )}
        </AppMain>
        <EditPanel
          selected={selectedView}
          parentView={parentView}
          fiscalYear={fiscalYear}
          onUpdateNode={handleUpdateNode}
          onUpdateProgress={handleUpdateProgress}
          onUpdateArea={handleUpdateArea}
          onOpenWeightEditor={handleOpenWeightEditor}
          onDetach={handleDetach}
          errorMessage={panelError}
        />
      </AppBody>

      {addChildParent && (
        <AddChildDialog
          parentView={addChildParent}
          suggestedWeightPct={suggestedWeightPct(addChildParent.node_id)}
          onSubmit={handleAddChildSubmit}
          onClose={() => setAddChildParentId(null)}
        />
      )}

      {weightEditorParent && (
        <WeightEditorDialog
          parentView={weightEditorParent}
          siblings={weightEditorParent.childNodeIds.map((id) => effectiveTree.nodesById[id]).filter((v): v is NonNullable<typeof v> => Boolean(v))}
          onSubmit={handleWeightSubmit}
          onClose={() => setWeightEditorParentId(null)}
        />
      )}
    </AppShell>
  );
}

export default App;
