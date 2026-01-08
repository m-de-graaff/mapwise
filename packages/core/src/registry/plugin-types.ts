/**
 * Plugin system type definitions.
 *
 * @module registry/plugin-types
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import type { EventBus } from "../events/event-bus";
import type { StyleManager } from "../map/style-manager";
import type { Viewport } from "../types/map";
import type { LayerRegistry } from "./layer-registry";
import type { LayerState } from "./registry-types";

// =============================================================================
// Plugin Context
// =============================================================================

/**
 * Context provided to plugins during their lifecycle.
 * This is the plugin's interface to the map system.
 */
export interface PluginContext {
	/**
	 * Unique identifier for the map instance.
	 */
	readonly mapId: string;

	/**
	 * Access to the MapLibre map instance.
	 * Only available when map is ready.
	 */
	readonly map: MapLibreMap;

	/**
	 * Access to the layer registry.
	 */
	readonly layers: LayerRegistry;

	/**
	 * Access to the style manager for basemap operations.
	 */
	readonly style: StyleManager;

	/**
	 * Event bus for subscribing to and emitting events.
	 */
	readonly events: EventBus;

	/**
	 * Shared state storage for this plugin.
	 * Persists across style reloads but cleared on unregister.
	 */
	readonly state: PluginStateStore;

	/**
	 * Get the current viewport.
	 */
	getViewport(): Viewport;

	/**
	 * Log a message with plugin context.
	 */
	log(level: "debug" | "info" | "warn" | "error", message: string): void;
}

/**
 * Simple key-value store for plugin state.
 */
export interface PluginStateStore {
	/**
	 * Get a value from the store.
	 */
	get<T>(key: string): T | undefined;

	/**
	 * Set a value in the store.
	 */
	set<T>(key: string, value: T): void;

	/**
	 * Check if a key exists.
	 */
	has(key: string): boolean;

	/**
	 * Delete a key from the store.
	 */
	delete(key: string): boolean;

	/**
	 * Clear all values.
	 */
	clear(): void;
}

// =============================================================================
// Plugin Lifecycle Hooks
// =============================================================================

/**
 * Optional lifecycle hooks for plugins.
 */
export interface PluginLifecycleHooks {
	/**
	 * Called when the map becomes ready.
	 * If plugin is registered after map is ready, this is called immediately.
	 */
	onMapReady?(ctx: PluginContext): void | Promise<void>;

	/**
	 * Called before a basemap/style change starts.
	 */
	onStyleChangeStart?(ctx: PluginContext, newStyle: string): void | Promise<void>;

	/**
	 * Called after a basemap/style change completes.
	 */
	onStyleChangeComplete?(ctx: PluginContext, style: string): void | Promise<void>;

	/**
	 * Called when a layer is added to the registry.
	 */
	onLayerAdded?(ctx: PluginContext, layer: LayerState): void;

	/**
	 * Called when a layer is removed from the registry.
	 */
	onLayerRemoved?(ctx: PluginContext, layerId: string): void;

	/**
	 * Called when the viewport changes (debounced).
	 */
	onViewportChange?(ctx: PluginContext, viewport: Viewport): void;

	/**
	 * Called when the map is resized.
	 */
	onResize?(ctx: PluginContext, width: number, height: number): void;

	/**
	 * Called when the map is about to be destroyed.
	 * Use this for final cleanup before unregister.
	 */
	onDestroy?(ctx: PluginContext): void | Promise<void>;
}

// =============================================================================
// Plugin Definition
// =============================================================================

/**
 * Complete plugin definition.
 */
export interface PluginDefinition extends PluginLifecycleHooks {
	/**
	 * Unique plugin identifier.
	 * Should be namespaced (e.g., "@myorg/plugin-name").
	 */
	readonly id: string;

	/**
	 * Human-readable plugin name.
	 */
	readonly name?: string;

	/**
	 * Plugin version (semver recommended).
	 */
	readonly version?: string;

	/**
	 * Plugin description.
	 */
	readonly description?: string;

	/**
	 * IDs of plugins this plugin depends on.
	 * These plugins must be registered before this one.
	 */
	readonly dependencies?: readonly string[];

	/**
	 * Called when the plugin is registered.
	 * Use this for initialization.
	 *
	 * @param ctx - Plugin context
	 * @returns Optional cleanup function called on unregister
	 */
	onRegister(ctx: PluginContext): void | (() => void) | Promise<undefined | (() => void)>;

	/**
	 * Called when the plugin is unregistered.
	 * Use this for cleanup.
	 */
	onUnregister?(ctx: PluginContext): void | Promise<void>;
}

// =============================================================================
// Plugin State
// =============================================================================

/**
 * Runtime state of a registered plugin.
 */
export interface PluginState {
	/** Plugin ID */
	id: string;
	/** Plugin name */
	name: string;
	/** Plugin version */
	version: string;
	/** Whether plugin is currently active */
	active: boolean;
	/** Registration order (0 = first) */
	order: number;
	/** Last error if plugin failed */
	error?: string;
	/** Timestamp when plugin was registered */
	registeredAt: number;
}

// =============================================================================
// Plugin Events (exported from events/event-types.ts)
// =============================================================================

// Plugin events are defined in events/event-types.ts for consistency
// with other event types. They are re-exported from index.ts as:
// - PluginRegisteredEvent
// - PluginUnregisteredEvent
// - PluginErrorEvent
