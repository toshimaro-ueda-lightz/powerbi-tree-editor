// The single (implicit, no sessionId — local single-user app) in-memory
// editing session. Holds a full working copy of the tree plus an ordered
// changelog of mutations applied to it so far.
//
//  - No session yet + a read  -> read straight from DB (buildSnapshot), not stored.
//  - No session yet + a write -> ensureSession() lazily loads a working copy from DB, then the write applies to it.
//  - Existing session + a read or write -> operates on the in-memory working copy.
//  - save()    -> replays the changelog against the real DB in one transaction, then clears the session.
//  - discard() -> just drops the session (DB untouched).

import type Database from 'better-sqlite3';
import type { DataStore } from '@powerbi-tree-editor/domain';
import { applyChangelog, loadSnapshot, type Command } from './store.js';

export interface Session {
  data: DataStore;
  changeLog: Command[];
}

let session: Session | null = null;

export function getSession(): Session | null {
  return session;
}

export function ensureSession(db: Database.Database): Session {
  if (!session) {
    session = { data: loadSnapshot(db), changeLog: [] };
  }
  return session;
}

/** Data to read from: the session's working copy if one is open, else a fresh DB read. */
export function readData(db: Database.Database): DataStore {
  return session ? session.data : loadSnapshot(db);
}

export function isDirty(): boolean {
  return session !== null && session.changeLog.length > 0;
}

export function recordCommand(cmd: Command): void {
  if (!session) throw new Error('recordCommand called with no open session');
  session.changeLog.push(cmd);
}

export function discardSession(): void {
  session = null;
}

export function saveSession(db: Database.Database): void {
  if (session && session.changeLog.length > 0) {
    applyChangelog(db, session.changeLog);
  }
  session = null;
}

/** Test-only escape hatch. */
export function __resetSessionForTests(): void {
  session = null;
}
