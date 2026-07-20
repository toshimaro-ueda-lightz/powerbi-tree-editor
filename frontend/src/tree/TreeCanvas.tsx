import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { TreeSnapshot } from '../types';
import { STRINGS } from '../strings';
import { TreeCanvasEmpty } from '../App.styled';
import { TreeNodeCard } from './TreeNodeCard';
import { ColumnHeaders } from './ColumnHeaders';
import { computeColumnPositions, computeLayout, toFlowElements } from './layout';
import { useAnimatedNodes } from './useAnimatedNodes';
import { NODE_HEIGHT, NODE_WIDTH, type TreeNodeCardData } from './types';
import { ReactFlowViewport, TreeCanvasRoot } from './TreeCanvas.styled';

const nodeTypes: NodeTypes = { treeNode: TreeNodeCard };

export interface TreeCanvasProps {
  tree: TreeSnapshot;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onRequestAddChild: (parentNodeId: string) => void;
  onRequestDetach: (nodeId: string) => void;
  maxLevel: number;
  searchTerm: string;
  assigneeFilter: string;
  editable: boolean;
}

export interface TreeCanvasHandle {
  fitView: () => void;
  focusNode: (nodeId: string) => void;
}

export const TreeCanvas = forwardRef<TreeCanvasHandle, TreeCanvasProps>((props, ref) => {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner {...props} forwardedRef={ref} />
    </ReactFlowProvider>
  );
});
TreeCanvas.displayName = 'TreeCanvas';

function TreeCanvasInner({
  tree,
  selectedNodeId,
  onSelectNode,
  onRequestAddChild,
  onRequestDetach,
  maxLevel,
  searchTerm,
  assigneeFilter,
  editable,
  forwardedRef,
}: TreeCanvasProps & { forwardedRef: React.ForwardedRef<TreeCanvasHandle> }) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [flowNodes, setFlowNodes] = useState<Node<TreeNodeCardData>[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [columnPositions, setColumnPositions] = useState<Map<number, number>>(new Map());
  const rf = useReactFlow();
  // Tracks the `departmentId:fiscalYear` key we still owe an initial
  // center-on-level-3 for (§4.3). Set whenever department/year changes,
  // consumed the first time flowNodes for that key are ready — so
  // collapsing/filtering/selecting afterwards never re-triggers it (B.1/B.2).
  const pendingCenterKeyRef = useRef<string | null>(`${tree.departmentId}:${tree.fiscalYear}`);
  // Position-only tween of `flowNodes` toward each new ELK/mrtree layout
  // (§4.3: additions/removals must move siblings, not teleport them). Only
  // used for the actual `<ReactFlow>` render below — `focusNode` and the
  // auto-centering effect intentionally keep reading `flowNodes` (the
  // layout's final positions), not this, so they never center on a
  // mid-animation position (see their comments).
  const animatedNodes = useAnimatedNodes(flowNodes);

  const toggleCollapse = (nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const { visibleIds, hasHiddenChildrenSet, pathIds, matchedIds } = useMemo(() => {
    const allIds = Object.keys(tree.nodesById);
    const levelFilteredSet = new Set(allIds.filter((id) => tree.nodesById[id]!.level <= maxLevel));

    const hasHiddenChildrenSet = new Set<string>();
    for (const id of levelFilteredSet) {
      const view = tree.nodesById[id]!;
      if (view.childNodeIds.some((c) => levelFilteredSet.has(c))) hasHiddenChildrenSet.add(id);
    }

    const hiddenByCollapse = new Set<string>();
    const collectDescendants = (id: string) => {
      const view = tree.nodesById[id];
      if (!view) return;
      for (const childId of view.childNodeIds) {
        if (!levelFilteredSet.has(childId) || hiddenByCollapse.has(childId)) continue;
        hiddenByCollapse.add(childId);
        collectDescendants(childId);
      }
    };
    for (const cid of collapsedIds) {
      if (levelFilteredSet.has(cid)) collectDescendants(cid);
    }

    const visibleIds = [...levelFilteredSet].filter((id) => !hiddenByCollapse.has(id));

    const pathIds = new Set<string>();
    let current: string | null = selectedNodeId;
    while (current) {
      pathIds.add(current);
      current = tree.nodesById[current]?.parentNodeId ?? null;
    }

    const search = searchTerm.trim().toLowerCase();
    const matchedIds = new Set<string>();
    if (search || assigneeFilter) {
      for (const id of allIds) {
        const view = tree.nodesById[id]!;
        const matchesSearch = search ? view.name.toLowerCase().includes(search) : true;
        const matchesAssignee = assigneeFilter ? view.assignee === assigneeFilter : true;
        if (matchesSearch && matchesAssignee) matchedIds.add(id);
      }
    }

    return { visibleIds, hasHiddenChildrenSet, pathIds, matchedIds };
  }, [tree, maxLevel, collapsedIds, selectedNodeId, searchTerm, assigneeFilter]);

  const filterActive = searchTerm.trim().length > 0 || assigneeFilter.length > 0;

  useEffect(() => {
    let cancelled = false;
    const visibleSet = new Set(visibleIds);
    const edgeDefs = visibleIds.flatMap((id) => {
      const view = tree.nodesById[id]!;
      return view.childNodeIds
        .filter((childId) => visibleSet.has(childId))
        .map((childId) => {
          const childView = tree.nodesById[childId]!;
          return {
            id: childView.parentEdgeId ?? `${id}-${childId}`,
            source: id,
            target: childId,
            label: childView.weightFromParent !== null ? childView.weightFromParent.toFixed(2) : '',
            highlighted: pathIds.has(id) && pathIds.has(childId),
          };
        });
    });

    computeLayout({
      nodes: visibleIds.map((id) => ({ id, level: tree.nodesById[id]!.level })),
      edges: edgeDefs.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    }).then(({ positions }) => {
      if (cancelled) return;
      const { nodes, edges } = toFlowElements<TreeNodeCardData>(
        visibleIds,
        positions,
        (id) => {
          const view = tree.nodesById[id]!;
          return {
            view,
            isSelected: id === selectedNodeId,
            isOnPath: pathIds.has(id),
            isDimmed: filterActive && !matchedIds.has(id),
            isCollapsed: collapsedIds.has(id),
            hasHiddenChildren: hasHiddenChildrenSet.has(id),
            canAddChild: editable && view.level >= 3 && view.level <= 5,
            canDetach: editable && view.isLeaf,
            onSelect: onSelectNode,
            onToggleCollapse: toggleCollapse,
            onAddChild: onRequestAddChild,
            onDetach: onRequestDetach,
          };
        },
        edgeDefs,
      );
      setFlowNodes(nodes);
      setFlowEdges(edges);
      setColumnPositions(
        computeColumnPositions(
          visibleIds.map((id) => ({ level: tree.nodesById[id]!.level, x: positions.get(id)?.x ?? 0 })),
        ),
      );
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds.join(','), tree, selectedNodeId, collapsedIds, filterActive, editable]);

  useImperativeHandle(forwardedRef, () => ({
    // Full-tree fit — kept for the sidebar's explicit "全体表示" button only.
    // Everything else (initial display, department/year switch, "選択ノードへ
    // 移動") zooms to a single node/column instead (issue #10, B).
    fitView: () => rf.fitView({ padding: 0.2, duration: 300 }),
    focusNode: (nodeId: string) => {
      const node = flowNodes.find((n) => n.id === nodeId);
      if (!node) return;
      rf.setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, {
        zoom: 1,
        duration: 400,
      });
    },
  }));

  // Center on the selected node (if it's in this tree) or the first level-3
  // node, at a readable zoom (§4.3: "初期表示は選択中の第3階層を中心に…"),
  // exactly once per department/fiscal-year switch. `flowNodes` also changes
  // on every collapse/filter/select (layout recompute), so a plain
  // dependency-array effect would re-center on those too (issue #10, B.1) —
  // `pendingCenterKeyRef` gates this to only the first flowNodes update after
  // department/year actually changes.
  useEffect(() => {
    pendingCenterKeyRef.current = `${tree.departmentId}:${tree.fiscalYear}`;
  }, [tree.departmentId, tree.fiscalYear]);

  useEffect(() => {
    const key = `${tree.departmentId}:${tree.fiscalYear}`;
    if (flowNodes.length === 0 || pendingCenterKeyRef.current !== key) return undefined;
    pendingCenterKeyRef.current = null;

    const target =
      (selectedNodeId && flowNodes.find((n) => n.id === selectedNodeId)) ||
      flowNodes.find((n) => n.data.view.level === 3) ||
      flowNodes[0];
    const t = setTimeout(() => {
      rf.setCenter(target.position.x + NODE_WIDTH / 2, target.position.y + NODE_HEIGHT / 2, {
        zoom: 1,
        duration: 0,
      });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowNodes]);

  if (Object.keys(tree.nodesById).length === 0) {
    return (
      <TreeCanvasEmpty>
        <p>{STRINGS.treeCanvas.empty}</p>
      </TreeCanvasEmpty>
    );
  }

  return (
    <TreeCanvasRoot>
      <ColumnHeaders columnPositions={columnPositions} />
      <ReactFlowViewport>
        <ReactFlow
          nodes={animatedNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => onSelectNode(node.id)}
          onPaneClick={() => onSelectNode('')}
          nodesDraggable={false}
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="var(--color-grid)" />
          <Controls showInteractive={false} position="bottom-right" />
          <MiniMap pannable zoomable position="bottom-left" nodeColor={() => 'var(--color-minimap-node)'} maskColor="rgba(15, 23, 42, 0.06)" />
        </ReactFlow>
      </ReactFlowViewport>
    </TreeCanvasRoot>
  );
}
