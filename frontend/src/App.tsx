import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { DepartmentRecord } from '@powerbi-tree-editor/domain';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { EditPanel } from './components/EditPanel';
import { WeightEditorDialog } from './components/WeightEditorDialog';
import { UnsavedSwitchDialog } from './components/UnsavedSwitchDialog';
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [maxLevel, setMaxLevel] = useState(6);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [weightEditorParentId, setWeightEditorParentId] = useState<string | null>(null);
  const [canvasBanner, setCanvasBanner] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [pendingSwitch, setPendingSwitch] = useState<null | { kind: 'dept' | 'year'; value: string | number }>(null);

  const treeCanvasRef = useRef<TreeCanvasHandle>(null);
  const modeInitializedRef = useRef(false);

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

  // Decide the initial mode from the server's session state: if a dirty
  // session already exists (e.g. the user reloaded mid-edit — the session
  // lives on the server, not in this tab), start in 'edit' so the "discard
  // returns to edit-start state" guarantee still holds. Runs exactly once,
  // gated on both the department list and the api service's initial dirty-
  // state fetch (apiVersion bumps once refreshDirtyState() resolves) so
  // isDirty() reflects the real server value rather than its false default.
  useEffect(() => {
    if (modeInitializedRef.current) return;
    if (!departmentsLoaded || apiVersion < 1) return;
    modeInitializedRef.current = true;
    setMode(isDirty() ? 'edit' : 'view');
  }, [departmentsLoaded, apiVersion]);

  // (Re)fetch the tree whenever the selected department/year changes, or the
  // api service reports a mutation/save/discard (apiVersion bump).
  useEffect(() => {
    if (!selectedDepartmentId) return;
    let alive = true;
    getTree(selectedDepartmentId, fiscalYear).then((snapshot) => {
      if (!alive) return;
      setTree(snapshot);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartmentId, fiscalYear, apiVersion]);

  // Loading is derived, not stored: `tree` still holds the previous
  // snapshot while a mutation-triggered refetch (apiVersion bump) is in
  // flight, so TreeCanvas stays mounted and keeps its collapse/zoom state.
  // Only a department/year switch — where `tree`'s key no longer matches
  // the current selection — should show the loading placeholder and remount
  // TreeCanvas (画面設計書 §4.3: ローディング表示は初回読込と部署・年度切替時のみ).
  const treeLoading =
    tree === null || tree.departmentId !== selectedDepartmentId || tree.fiscalYear !== fiscalYear;

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

  function applyDepartmentChange(id: string) {
    setSelectedDepartmentId(id);
    setSelectedNodeId(null);
    setPanelError(null);
    setCanvasBanner(null);
  }

  function applyFiscalYearChange(year: number) {
    setFiscalYear(year);
    setPanelError(null);
  }

  function handleChangeDepartment(id: string) {
    if (mode === 'edit' && isDirty()) {
      setPendingSwitch({ kind: 'dept', value: id });
      return;
    }
    applyDepartmentChange(id);
  }

  function handleChangeFiscalYear(year: number) {
    if (mode === 'edit' && isDirty()) {
      setPendingSwitch({ kind: 'year', value: year });
      return;
    }
    applyFiscalYearChange(year);
  }

  function handleEnterEdit() {
    setMode('edit');
  }

  function handleCancelPendingSwitch() {
    setPendingSwitch(null);
  }

  async function handleConfirmDiscardAndSwitch() {
    if (!pendingSwitch) return;
    await performDiscard();
    if (pendingSwitch.kind === 'dept') {
      applyDepartmentChange(pendingSwitch.value as string);
    } else {
      applyFiscalYearChange(pendingSwitch.value as number);
    }
    setMode('view');
    setPendingSwitch(null);
  }

  // No input dialog: the "+" adds the child immediately with default values
  // (画面設計書 §4.3 / addChild). Name is a placeholder the user renames via
  // PNL-01; weight is whatever keeps the sibling total at 100%.
  async function handleRequestAddChild(parentNodeId: string) {
    const parent = effectiveTree.nodesById[parentNodeId];
    if (!parent) return;
    if (parent.isLeaf && parent.outcomeProgress > 0) {
      setCanvasBanner(STRINGS.app.addChildRejectedProgress);
      return;
    }
    setCanvasBanner(null);
    const result = await addChildNode(selectedDepartmentId, parentNodeId, {
      name: STRINGS.app.newChildDefaultName,
      subtitle: null,
      assignee: null,
      weight: suggestedWeightPct(parentNodeId) / 100,
    });
    if (result.ok) {
      setSelectedNodeId(result.nodeId);
    } else {
      setCanvasBanner(result.reason);
    }
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
      const idMap = await save();
      // Nodes added during the session were keyed by placeholder ids; the save
      // just assigned their real ones. Re-key every piece of state that can
      // still hold a placeholder, or the tree re-fetch (keyed by real ids)
      // would leave them pointing at nothing — e.g. the node you just added
      // would silently deselect itself (画面設計書 §11.2 手順7 requires it
      // stay selected). Unmapped ids keep their current value: an id that
      // isn't in the map is a pre-existing real id and is already correct.
      const remap = (id: string | null): string | null => (id === null ? null : idMap[id] ?? id);
      setSelectedNodeId(remap);
      setWeightEditorParentId(remap);
      setSaveStatus('idle');
      setMode('view');
    } catch {
      setSaveStatus('error');
    }
  }

  // Shared discard logic (used both by the header's discard button and by
  // DLG-04's "破棄して切替"); callers decide what happens to `mode` afterward.
  async function performDiscard() {
    await discard();
    setSaveStatus('idle');
    setSelectedNodeId(null);
    setPanelError(null);
    setCanvasBanner(null);
  }

  async function handleDiscard() {
    await performDiscard();
    setMode('view');
  }

  const weightEditorParent = weightEditorParentId ? effectiveTree.nodesById[weightEditorParentId] : null;

  return (
    <AppShell>
      <Header
        departments={departments}
        selectedDepartmentId={selectedDepartmentId}
        onChangeDepartment={handleChangeDepartment}
        fiscalYear={fiscalYear}
        onChangeFiscalYear={handleChangeFiscalYear}
        mode={mode}
        onEnterEdit={handleEnterEdit}
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
              editable={mode === 'edit'}
            />
          )}
        </AppMain>
        <EditPanel
          selected={selectedView}
          parentView={parentView}
          fiscalYear={fiscalYear}
          readOnly={mode === 'view'}
          onUpdateNode={handleUpdateNode}
          onUpdateProgress={handleUpdateProgress}
          onUpdateArea={handleUpdateArea}
          onOpenWeightEditor={handleOpenWeightEditor}
          onDetach={handleDetach}
          errorMessage={panelError}
        />
      </AppBody>

      {weightEditorParent && (
        <WeightEditorDialog
          parentView={weightEditorParent}
          siblings={weightEditorParent.childNodeIds.map((id) => effectiveTree.nodesById[id]).filter((v): v is NonNullable<typeof v> => Boolean(v))}
          onSubmit={handleWeightSubmit}
          onClose={() => setWeightEditorParentId(null)}
        />
      )}

      {pendingSwitch && (
        <UnsavedSwitchDialog onDiscardAndSwitch={handleConfirmDiscardAndSwitch} onCancel={handleCancelPendingSwitch} />
      )}
    </AppShell>
  );
}

export default App;
