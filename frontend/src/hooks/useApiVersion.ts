import { useSyncExternalStore } from 'react';
import { getVersion, subscribe } from '../api/apiService';

/**
 * Forces the calling component to re-render whenever apiService's version
 * counter bumps (after any successful mutation, save, discard, or the
 * initial /api/state sync). Components then re-fetch fresh data via
 * apiService.getTree(...) etc. — the version number itself is only used for
 * change detection.
 */
export function useApiVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
