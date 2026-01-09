import type { PluginDefinition } from "@mapwise/core";
import { SyncManager, type ViewState } from "./sync-manager";
import type { BasePluginConfig } from "../shared/types";

/**
 * Configuration for the Sync View plugin.
 */
export interface SyncViewPluginConfig extends BasePluginConfig {
	/**
	 * Group ID for synchronization. Maps with the same groupId will be synced.
	 */
	groupId: string;

	/**
	 * Whether to sync map center.
	 * @default true
	 */
	syncCenter?: boolean;

	/**
	 * Whether to sync map zoom.
	 * @default true
	 */
	syncZoom?: boolean;

	/**
	 * Whether to sync map bearing (rotation).
	 * @default true
	 */
	syncBearing?: boolean;

	/**
	 * Whether to sync map pitch (tilt).
	 * @default true
	 */
	syncPitch?: boolean;
}

/**
 * Creates a Sync View plugin that synchronizes viewport with other maps.
 */
export function createSyncViewPlugin(config: SyncViewPluginConfig): PluginDefinition {
	const {
		enabled = true,
		groupId,
		syncCenter = true,
		syncZoom = true,
		syncBearing = true,
		syncPitch = true,
	} = config;

	return {
		id: "@mapwise/sync",
		name: "Sync View",
		description: "Synchronize viewport with other maps",

		onRegister({ map }) {
			if (!(groupId && enabled)) {
				return;
			}

			let isUpdating = false;

			// Handler for incoming sync updates
			const handleSync = (state: ViewState) => {
				isUpdating = true;
				const current = {
					center: map.getCenter(),
					zoom: map.getZoom(),
					bearing: map.getBearing(),
					pitch: map.getPitch(),
				};

				// Only update if changed significantly (basic threshold could be added)
				// Using jumpTo for instant sync, or easeTo for smooth?
				// "Prevents feedback loops (debounce + origin tag)" - task description.
				// By setting isUpdating = true, we ignore the subsequent move event from this map.

				map.jumpTo({
					center: syncCenter ? state.center : current.center,
					zoom: syncZoom ? state.zoom : current.zoom,
					bearing: syncBearing ? state.bearing : current.bearing,
					pitch: syncPitch ? state.pitch : current.pitch,
				});

				// Reset flag after a short delay (or next tick) to allow event to fire and be ignored
				// map.fire('move') happens synchronously during jumpTo usually.
				// Safest is to reset immediately after?
				// Or requestAnimationFrame.
				requestAnimationFrame(() => {
					isUpdating = false;
				});
			};

			// register with manager
			const unregister = SyncManager.register(groupId, map, handleSync);

			// Listen to map moves
			const onMove = () => {
				if (isUpdating) {
					return;
				}

				const state: ViewState = {
					center: map.getCenter(),
					zoom: map.getZoom(),
					bearing: map.getBearing(),
					pitch: map.getPitch(),
				};

				SyncManager.notify(groupId, map, state);
			};

			map.on("move", onMove);

			return () => {
				map.off("move", onMove);
				unregister();
			};
		},
	};
}
