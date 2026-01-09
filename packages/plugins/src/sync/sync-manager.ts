import type { Map as MapLibreMap } from "maplibre-gl";

export interface ViewState {
	center: { lng: number; lat: number };
	zoom: number;
	bearing: number;
	pitch: number;
}

export type SyncHandler = (state: ViewState) => void;

interface MapEntry {
	id: string; // Internal ID for the map entry
	map: MapLibreMap;
	handler: SyncHandler;
}

/**
 * Manager for synchronizing map views across groups.
 */
class GlobalSyncManager {
	private groups: Map<string, MapEntry[]> = new Map();

	/**
	 * Register a map with a sync group.
	 *
	 * @param groupId - Identifier for the sync group
	 * @param map - Map instance
	 * @param handler - Callback function to update this map's view
	 * @returns Unregister function
	 */
	register(groupId: string, map: MapLibreMap, handler: SyncHandler): () => void {
		if (!this.groups.has(groupId)) {
			this.groups.set(groupId, []);
		}

		const entry: MapEntry = {
			id: Math.random().toString(36).substring(7),
			map,
			handler,
		};

		this.groups.get(groupId)?.push(entry);

		return () => {
			const group = this.groups.get(groupId);
			if (group) {
				const index = group.findIndex((e) => e.id === entry.id);
				if (index !== -1) {
					group.splice(index, 1);
				}
				if (group.length === 0) {
					this.groups.delete(groupId);
				}
			}
		};
	}

	/**
	 * Notify the group that a map has moved.
	 *
	 * @param groupId - Sync group ID
	 * @param sourceMap - The map that initiated the change
	 * @param state - The new view state
	 */
	notify(groupId: string, sourceMap: MapLibreMap, state: ViewState): void {
		const group = this.groups.get(groupId);
		if (!group) {
			return;
		}

		for (const entry of group) {
			// Don't sync back to the source map
			if (entry.map !== sourceMap) {
				entry.handler(state);
			}
		}
	}
}

// Singleton instance
export const SyncManager = new GlobalSyncManager();
