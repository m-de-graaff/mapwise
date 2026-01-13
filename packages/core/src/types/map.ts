/**
 * Map-related type definitions.
 *
 * @module types/map
 */

import type { Map as MapLibreMap, MapOptions as MapLibreMapOptions } from "maplibre-gl";
import type { StyleManager } from "../map/style-manager.js";
import type {
	HydrateOptions,
	HydrateResult,
	PersistedMapState,
	SerializeOptions,
} from "../persistence/persistence-types.js";
import type { AuthManager, RequestManager, RequestTransform } from "../request/index.js";
import type { LayerRegistry } from "../registry/layer-registry.js";
import type { PluginManager } from "../registry/plugin-registry.js";
import type { SetBasemapOptions, SetBasemapResult, StyleInput } from "./layer.js";
import type { InteractionModeStore } from "../interaction/interaction-mode.js";
import type { EventBus } from "../events/event-bus.js";

// =============================================================================
// Lifecycle States
// =============================================================================

/**
 * Map lifecycle states.
 *
 * State machine transitions:
 * - uninitialized → creating (on createMap call)
 * - creating → ready (on map 'load' event)
 * - creating → error (on map error during init)
 * - ready → destroyed (on destroyMap call)
 * - error → destroyed (on destroyMap call)
 * - destroyed → (terminal state)
 */
export type MapLifecycleState = "uninitialized" | "creating" | "ready" | "error" | "destroyed";

// =============================================================================
// Map Options
// =============================================================================

/**
 * Options for creating a map instance.
 *
 * Extends MapLibre options but makes container optional (provided separately)
 * and enforces some defaults.
 */
export interface MapOptions extends Omit<MapLibreMapOptions, "container"> {
	/**
	 * Enable automatic resize handling via ResizeObserver.
	 * @default true
	 */
	autoResize?: boolean;

	/**
	 * Debounce delay for resize events in milliseconds.
	 * @default 100
	 */
	resizeDebounceMs?: number;
	/**
	 * Configuration for request handling (auth, proxies).
	 */
	request?: {
		/**
		 * Custom request transformers.
		 */
		transformers?: RequestTransform[];
	};
}

/**
 * Resolved options with all defaults applied.
 */
export interface ResolvedMapOptions extends MapOptions {
	autoResize: boolean;
	resizeDebounceMs: number;
	preserveDrawingBuffer: boolean;
	request?: {
		transformers?: RequestTransform[];
	};
}

// =============================================================================
// Viewport
// =============================================================================

/**
 * Represents the current map viewport state.
 */
export interface Viewport {
	center: [number, number];
	zoom: number;
	bearing: number;
	pitch: number;
}

/**
 * Bounds representation as [west, south, east, north].
 */
export type LngLatBounds = [number, number, number, number];

// =============================================================================
// Map Controller
// =============================================================================

/**
 * The public interface for controlling a map instance.
 *
 * This is the main object returned by `createMap()` and provides
 * all methods for interacting with the map.
 */
export interface MapController {
	/**
	 * Unique identifier for this map instance.
	 */
	readonly id: string;

	/**
	 * Current lifecycle state.
	 */
	readonly state: MapLifecycleState;

	/**
	 * Whether the map is ready for operations.
	 */
	readonly isReady: boolean;

	/**
	 * Access to the underlying MapLibre instance.
	 * Only available when state is 'ready'.
	 *
	 * @throws Error if accessed before map is ready
	 */
	readonly map: MapLibreMap;

	/**
	 * Access to the style manager for low-level basemap operations.
	 * Most users should use `layers` instead.
	 */
	readonly style: StyleManager;

	/**
	 * Access to the layer registry for managing layers.
	 *
	 * @example
	 * ```typescript
	 * controller.layers.registerLayer({
	 *   id: 'my-layer',
	 *   type: 'geojson-points',
	 *   source: { id: 'my-source', spec: { type: 'geojson', data: ... } },
	 *   layers: [{ id: 'my-layer', type: 'circle', source: 'my-source', ... }],
	 *   metadata: { title: 'My Points' }
	 * });
	 * ```
	 */
	readonly layers: LayerRegistry;

	/**
	 * Access to the plugin manager for registering plugins.
	 *
	 * @example
	 * ```typescript
	 * await controller.plugins.register({
	 *   id: 'my-plugin',
	 *   onRegister(ctx) {
	 *     ctx.log('info', 'Plugin registered!');
	 *   },
	 *   onMapReady(ctx) {
	 *     // Do something with ctx.map
	 *   }
	 * });
	 * ```
	 */
	readonly plugins: PluginManager;

	/**
	 * Access to the request manager.
	 */
	readonly request: RequestManager;

	/**
	 * Access to the auth manager.
	 */
	readonly auth: AuthManager;

	readonly interaction: InteractionModeStore;

	/**
	 * Access to the event bus.
	 */
	readonly events: EventBus;

	/**
	 * Wait for the map to be ready.
	 * Resolves immediately if already ready.
	 * Rejects if map enters error or destroyed state.
	 */
	awaitReady(): Promise<void>;

	/**
	 * Change the basemap style.
	 * Preserves all registered layers and plugins.
	 *
	 * @param style - Style URL or StyleSpecification object
	 * @param options - Options for the basemap change
	 * @returns Promise resolving to the result of the operation
	 */
	setBasemap(style: StyleInput, options?: SetBasemapOptions): Promise<SetBasemapResult>;

	/**
	 * Serialize the current map state for persistence.
	 *
	 * @param options - Serialization options
	 * @returns Serialized state that can be saved and later restored
	 *
	 * @example
	 * ```typescript
	 * const state = controller.serialize({ name: 'My Saved Map' });
	 * localStorage.setItem('mapState', JSON.stringify(state));
	 * ```
	 */
	serialize(options?: SerializeOptions): PersistedMapState;

	/**
	 * Restore map state from a previously serialized state.
	 *
	 * @param state - Previously serialized state to restore
	 * @param options - Hydration options
	 * @returns Result of the hydration operation
	 *
	 * @example
	 * ```typescript
	 * const saved = JSON.parse(localStorage.getItem('mapState'));
	 * const result = await controller.hydrate(saved);
	 * if (!result.success) {
	 *   console.error('Failed to restore:', result.error);
	 * }
	 * ```
	 */
	hydrate(state: PersistedMapState, options?: HydrateOptions): Promise<HydrateResult>;

	/**
	 * Manually trigger a resize.
	 * Useful when container size changes without triggering ResizeObserver.
	 */
	invalidateSize(): void;

	/**
	 * Destroy the map and clean up all resources.
	 * Safe to call multiple times (idempotent).
	 * Returns a promise that resolves when all cleanup is complete.
	 */
	destroy(): Promise<void>;
}

/**
 * Internal map state (not exposed publicly).
 */
export interface InternalMapState {
	id: string;
	lifecycleState: MapLifecycleState;
	map: MapLibreMap | null;
	container: HTMLElement | null;
	options: ResolvedMapOptions;
	resizeObserver: ResizeObserver | null;
	cleanupFns: Array<() => void>;
	styleManager: StyleManager | null;
	layerRegistry: LayerRegistry | null;
	pluginManager: PluginManager | null;
}
