// Session-local placeholder ids.
//
// A node/edge created inside an editing session has no DB row yet (and so no
// AUTOINCREMENT id) until the session is saved. Until then it carries a
// `temp-` prefixed placeholder. On save, `applyChangelog` inserts the real
// rows and reports the placeholder -> real id mapping back, so callers can
// re-key anything still holding a placeholder.
//
// This lives in the domain package (not api/) because BOTH sides need it and
// neither should re-encode the `temp-` prefix locally: api/ resolves
// placeholders while replaying the changelog, and the frontend must avoid
// showing a placeholder to the user as if it were a real node code.

const TEMP_ID_PREFIX = 'temp-';

/** True when `id` is a session-local placeholder that has no DB row yet. */
export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX);
}

export function makeTempId(kind: 'node' | 'edge', unique: string): string {
  return `${TEMP_ID_PREFIX}${kind}-${unique}`;
}

/** Placeholder id -> real DB id, as returned by a save. */
export type IdMap = Record<string, string>;
