import { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EditPanel } from './components/EditPanel';
import { AddChildDialog } from './components/AddChildDialog';
import { WeightEditorDialog } from './components/WeightEditorDialog';
import { IconButton } from './components/ui';
import { AppShell, AppBody, AppMain, TreeCanvasEmpty, FloatingBanner } from './App.styled';
import { TreeCanvas, type TreeCanvasHandle } from './tree/TreeCanvas';
import { useMockVersion } from './hooks/useMockVersion';
import { STRINGS } from './strings';
import { CURRENT_FISCAL_YEAR } from './mock/seedData';
import {
  addChildNode,
  detachNode,
  isDirty,
  listDepartments,
  resetMockData,
  save,
  updateFirstLevelArea,
  updateNode,
  updateProgress,
  updateWeights,
  getTree,
} from './mock/mockService';

function App() {
  const storeVersion = useMockVersion(); // re-render on any mock store mutation

  const departments = listDepartments();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(departments[0]?.department_id ?? '');
  const [fiscalYear, setFiscalYear] = useState(CURRENT_FISCAL_YEAR);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [maxLevel, setMaxLevel] = useState(6);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
  const [weightEditorParentId, setWeightEditorParentId] = useState<string | null>(null);
  const [canvasBanner, setCanvasBanner] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  const treeCanvasRef = useRef<TreeCanvasHandle>(null);

  const tree = useMemo(
    () => getTree(selectedDepartmentId, fiscalYear),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDepartmentId, fiscalYear, storeVersion],
  );

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of Object.values(tree.nodesById)) {
      if (v.assignee) set.add(v.assignee);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [tree]);

  const matchCount = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return null;
    return Object.values(tree.nodesById).filter((v) => v.name.toLowerCase().includes(q)).length;
  }, [tree, searchTerm]);

  const selectedView = selectedNodeId ? tree.nodesById[selectedNodeId] ?? null : null;
  const parentView = selectedView?.parentNodeId ? tree.nodesById[selectedView.parentNodeId] ?? null : null;

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
    const parent = tree.nodesById[parentNodeId];
    if (!parent) return;
    if (parent.isLeaf && parent.outcomeProgress > 0) {
      setCanvasBanner(STRINGS.app.addChildRejectedProgress);
      return;
    }
    setCanvasBanner(null);
    setAddChildParentId(parentNodeId);
  }

  function handleAddChildSubmit(input: { name: string; subtitle?: string | null; assignee?: string | null; weight: number }) {
    if (!addChildParentId) return { ok: false as const, reason: STRINGS.app.internalNoParent };
    const result = addChildNode(selectedDepartmentId, addChildParentId, input);
    if (result.ok) setSelectedNodeId(result.nodeId);
    return result;
  }

  function suggestedWeightPct(parentNodeId: string): number {
    const parent = tree.nodesById[parentNodeId];
    if (!parent) return 100;
    const usedPct = parent.childNodeIds.reduce((sum, id) => sum + (tree.nodesById[id]?.weightFromParent ?? 0) * 100, 0);
    return Math.max(0, Math.min(100, 100 - usedPct));
  }

  function handleDetach(nodeId: string) {
    const result = detachNode(selectedDepartmentId, nodeId);
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

  function handleUpdateNode(patch: { name?: string; subtitle?: string | null; assignee?: string | null }) {
    if (!selectedNodeId) return;
    const result = updateNode(selectedDepartmentId, selectedNodeId, patch);
    setPanelError(result.ok ? null : result.reason);
  }

  function handleUpdateProgress(pct: number) {
    if (!selectedNodeId) return;
    const result = updateProgress(selectedDepartmentId, selectedNodeId, pct / 100);
    setPanelError(result.ok ? null : result.reason);
  }

  function handleUpdateArea(value: number) {
    if (!selectedNodeId) return;
    const result = updateFirstLevelArea(selectedDepartmentId, fiscalYear, selectedNodeId, value);
    setPanelError(result.ok ? null : result.reason);
  }

  function handleOpenWeightEditor(parentNodeId: string) {
    setWeightEditorParentId(parentNodeId);
  }

  function handleWeightSubmit(items: { childNodeId: string; weight: number }[]) {
    if (!weightEditorParentId) return { ok: false as const, reason: STRINGS.app.internalNoParent };
    return updateWeights(selectedDepartmentId, weightEditorParentId, items);
  }

  function handleSave() {
    save();
  }

  function handleReset() {
    resetMockData();
    setSelectedNodeId(null);
    setPanelError(null);
    setCanvasBanner(null);
  }

  const weightEditorParent = weightEditorParentId ? tree.nodesById[weightEditorParentId] : null;
  const addChildParent = addChildParentId ? tree.nodesById[addChildParentId] : null;

  return (
    <AppShell>
      <Header
        departments={departments}
        selectedDepartmentId={selectedDepartmentId}
        onChangeDepartment={handleChangeDepartment}
        fiscalYear={fiscalYear}
        onChangeFiscalYear={handleChangeFiscalYear}
        isDirty={isDirty()}
        onSave={handleSave}
        onReset={handleReset}
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
          {Object.keys(tree.nodesById).length === 0 ? (
            <TreeCanvasEmpty>
              <p>{STRINGS.app.emptyTree}</p>
            </TreeCanvasEmpty>
          ) : (
            <TreeCanvas
              ref={treeCanvasRef}
              tree={tree}
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
          siblings={weightEditorParent.childNodeIds.map((id) => tree.nodesById[id]).filter((v): v is NonNullable<typeof v> => Boolean(v))}
          onSubmit={handleWeightSubmit}
          onClose={() => setWeightEditorParentId(null)}
        />
      )}
    </AppShell>
  );
}

export default App;
