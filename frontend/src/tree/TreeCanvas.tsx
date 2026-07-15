import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
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
import type { TreeSnapshot } from '../mock/types';
import { STRINGS } from '../strings';
import { TreeCanvasEmpty } from '../App.styled';
import { TreeNodeCard } from './TreeNodeCard';
import { computeLayout, toFlowElements } from './layout';
import type { TreeNodeCardData } from './types';

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
  forwardedRef,
}: TreeCanvasProps & { forwardedRef: React.ForwardedRef<TreeCanvasHandle> }) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [flowNodes, setFlowNodes] = useState<Node<TreeNodeCardData>[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const rf = useReactFlow();

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
      nodeIds: visibleIds,
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
            canAddChild: view.level >= 3 && view.level <= 5,
            canDetach: view.isLeaf,
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
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds.join(','), tree, selectedNodeId, collapsedIds, filterActive]);

  useImperativeHandle(forwardedRef, () => ({
    fitView: () => rf.fitView({ padding: 0.2, duration: 300 }),
    focusNode: (nodeId: string) => {
      const node = flowNodes.find((n) => n.id === nodeId);
      if (!node) return;
      rf.setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1, duration: 400 });
    },
  }));

  useEffect(() => {
    if (flowNodes.length > 0) {
      const t = setTimeout(() => rf.fitView({ padding: 0.2, duration: 0 }), 0);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.departmentId, tree.fiscalYear]);

  if (Object.keys(tree.nodesById).length === 0) {
    return (
      <TreeCanvasEmpty>
        <p>{STRINGS.treeCanvas.empty}</p>
      </TreeCanvasEmpty>
    );
  }

  return (
    <ReactFlow
      nodes={flowNodes}
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
  );
}
