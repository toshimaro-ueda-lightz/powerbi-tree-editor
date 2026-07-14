import { useSyncExternalStore } from 'react';
import { getVersion, subscribe } from '../mock/mockService';

/**
 * Forces the calling component to re-render whenever the mock store
 * mutates. Components then re-read fresh data via mockService.getTree(...)
 * etc. on the same render — the version number itself is not used for
 * anything but change detection.
 */
export function useMockVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
