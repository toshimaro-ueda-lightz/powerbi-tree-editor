// Fastify app factory. Routes follow the endpoint list in issue #4 (正本 §15).
// Business-rule failures respond 200 with `{ ok: false, code, params? }` (the
// operation was understood and rejected for a domain reason); malformed
// requests (missing/invalid params) respond 400; an unknown department id on
// GET tree responds 404; anything unexpected is a 500.

import Fastify, { type FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import * as service from './service.js';
import { discardSession, isDirty as sessionIsDirty, readData, saveSession } from './session.js';
import type { NewChildInput, NodeUpdateInput, WeightUpdateItem } from '@powerbi-tree-editor/domain';

export function buildApp(db: Database.Database): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/api/departments', async () => {
    return service.listDepartments(db);
  });

  app.get<{ Params: { id: string }; Querystring: { fiscalYear?: string } }>(
    '/api/departments/:id/tree',
    async (req, reply) => {
      const { id } = req.params;
      const fiscalYearRaw = req.query.fiscalYear;
      const fiscalYear = Number(fiscalYearRaw);
      if (!fiscalYearRaw || !Number.isInteger(fiscalYear)) {
        return reply.code(400).send({ error: 'fiscalYear query param (integer) is required' });
      }
      const departments = service.listDepartments(db);
      if (!departments.some((d) => d.department_id === id)) {
        return reply.code(404).send({ error: `department ${id} not found` });
      }
      return service.getTree(db, id, fiscalYear);
    },
  );

  app.post<{ Params: { id: string }; Body: { parentNodeId: string } & NewChildInput }>(
    '/api/departments/:id/nodes',
    async (req, reply) => {
      const { id } = req.params;
      const { parentNodeId, ...input } = req.body ?? ({} as any);
      if (!parentNodeId || typeof input.name !== 'string' || typeof input.weight !== 'number') {
        return reply.code(400).send({ error: 'parentNodeId, name, weight are required' });
      }
      return service.addChildNode(db, id, parentNodeId, input);
    },
  );

  app.patch<{ Params: { id: string }; Body: NodeUpdateInput }>('/api/nodes/:id', async (req) => {
    const { id } = req.params;
    return service.updateNode(db, id, req.body ?? {});
  });

  app.patch<{ Params: { id: string; parentId: string }; Body: { items: WeightUpdateItem[] } }>(
    '/api/departments/:id/nodes/:parentId/weights',
    async (req, reply) => {
      const { id, parentId } = req.params;
      const items = req.body?.items;
      if (!Array.isArray(items)) return reply.code(400).send({ error: 'items array is required' });
      return service.updateWeights(db, id, parentId, items);
    },
  );

  app.put<{ Params: { id: string; nodeId: string }; Body: { outcomeProgress: number } }>(
    '/api/departments/:id/nodes/:nodeId/progress',
    async (req, reply) => {
      const { id, nodeId } = req.params;
      const outcomeProgress = req.body?.outcomeProgress;
      if (typeof outcomeProgress !== 'number') return reply.code(400).send({ error: 'outcomeProgress (number) is required' });
      return service.updateProgress(db, id, nodeId, outcomeProgress);
    },
  );

  app.put<{ Params: { id: string; nodeId: string }; Querystring: { fiscalYear?: string }; Body: { area: number } }>(
    '/api/departments/:id/nodes/:nodeId/area',
    async (req, reply) => {
      const { id, nodeId } = req.params;
      const fiscalYear = Number(req.query.fiscalYear);
      const area = req.body?.area;
      if (!Number.isInteger(fiscalYear)) return reply.code(400).send({ error: 'fiscalYear query param (integer) is required' });
      if (typeof area !== 'number') return reply.code(400).send({ error: 'area (number) is required' });
      return service.updateFirstLevelArea(db, id, fiscalYear, nodeId, area);
    },
  );

  app.delete<{ Params: { id: string; edgeId: string } }>('/api/departments/:id/edges/:edgeId', async (req) => {
    const { id, edgeId } = req.params;
    const data = readData(db);
    const edge = data.edges.find((e) => e.edge_id === edgeId && e.valid_to === null);
    if (!edge) return { ok: false, code: 'DETACH_NOT_IN_TREE' } as const;
    return service.detachNode(db, id, edge.child_node_id);
  });

  app.get('/api/state', async () => {
    return { isDirty: sessionIsDirty() };
  });

  app.post('/api/save', async () => {
    // idMap re-keys placeholder ids the client may still be holding (e.g. the
    // selected node) to the real ids assigned during this save.
    const idMap = saveSession(db);
    return { ok: true, idMap };
  });

  app.post('/api/discard', async () => {
    discardSession();
    return { ok: true };
  });

  return app;
}
