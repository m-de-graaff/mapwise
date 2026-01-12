/**
 * Plugin Manager - Manages plugin lifecycle and isolation.
 *
 * The plugin manager handles registration, lifecycle hooks, and ensures
 * plugin errors don't break other plugins or the core system.
 *
 * @module registry/plugin-registry
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import type { EventBus } from "../events/event-bus";
import type { StyleManager } from "../map/style-manager";
import type { Viewport } from "../types/map";
import { debounce } from "../utils/debounce";
import type { LayerRegistry } from "./layer-registry";
import type {
	PluginContext,
	PluginDefinition,
	PluginState,
	PluginStateStore,
} from "./plugin-types";
import type { InteractionModeStore } from "../interaction/interaction-mode";
import type { CursorManager } from "../interaction/cursor-manager";
import type { KeyboardManager } from "../interaction/keyboard-manager";

// =============================================================================
// Internal Types
// =============================================================================

interface InternalPluginEntry {
	definition: PluginDefinition;
	state: PluginState;
	pluginState: Map<string, unknown>;
	cleanup?: () => void;
	eventUnsubscribers: Array<() => void>;
}

// =============================================================================
// PluginManager Interface
// =============================================================================

export interface PluginManager {
	/**
	 * Register a plugin.
	 *
	 * @param plugin - Plugin definition
	 * @throws Error if plugin ID already exists or dependencies not met
	 */
	register(plugin: PluginDefinition): Promise<void>;

	/**
	 * Unregister a plugin.
	 *
	 * @param id - Plugin ID to unregister
	 * @returns true if plugin was found and unregistered
	 */
	unregister(id: string): Promise<boolean>;

	/**
	 * Check if a plugin is registered.
	 */
	has(id: string): boolean;

	/**
	 * Get the state of a plugin.
	 */
	getPluginState(id: string): PluginState | undefined;

	/**
	 * Get all registered plugins.
	 */
	getAllPlugins(): PluginState[];

	/**
	 * Get the number of registered plugins.
	 */
	readonly count: number;

	/**
	 * Get a plugin's state store for persistence.
	 * @internal
	 */
	getPluginStateStore(id: string): Map<string, unknown> | undefined;

	/**
	 * Set a value in a plugin's state store.
	 * @internal
	 */
	setPluginStateValue(id: string, key: string, value: unknown): void;

	/**
	 * Notify plugins that map is ready.
	 * Called internally by MapController.
	 */
	notifyMapReady(): Promise<void>;

	/**
	 * Notify plugins of style change start.
	 * Called internally before basemap change.
	 */
	notifyStyleChangeStart(newStyle: string): Promise<void>;

	/**
	 * Notify plugins of style change complete.
	 * Called internally after basemap change.
	 */
	notifyStyleChangeComplete(style: string): Promise<void>;

	/**
	 * Notify plugins of map destruction.
	 * Called internally before map is destroyed.
	 */
	notifyDestroy(): Promise<void>;

	/**
	 * Clear all plugins.
	 */
	clear(): Promise<void>;

	/**
	 * Serialize a specific plugin's state.
	 */
	serializePlugin(id: string): Record<string, unknown> | undefined;

	/**
	 * Hydrate a specific plugin's state.
	 */
	hydratePlugin(id: string, state: Record<string, unknown>, schemaVersion?: number): Promise<void>;
}

// =============================================================================
// Plugin State Store Implementation
// =============================================================================

function createPluginStateStore(storage: Map<string, unknown>): PluginStateStore {
	return {
		get<T>(key: string): T | undefined {
			return storage.get(key) as T | undefined;
		},
		set<T>(key: string, value: T): void {
			storage.set(key, value);
		},
		has(key: string): boolean {
			return storage.has(key);
		},
		delete(key: string): boolean {
			return storage.delete(key);
		},
		clear(): void {
			storage.clear();
		},
	};
}

// =============================================================================
// Factory Function
// =============================================================================

export interface PluginManagerDependencies {
	getMap: () => MapLibreMap | null;
	getMapId: () => string;
	isMapReady: () => boolean;
	layerRegistry: LayerRegistry;
	styleManager: StyleManager;
	eventBus: EventBus;
	interactionMode: InteractionModeStore;
	cursorManager: CursorManager;
	keyboard: KeyboardManager;
}

/**
 * Create a new PluginManager instance.
 */
export function createPluginManager(deps: PluginManagerDependencies): PluginManager {
	const {
		getMap,
		getMapId,
		isMapReady,
		layerRegistry,
		styleManager,
		eventBus,
		interactionMode,
		cursorManager,
		keyboard,
	} = deps;

	// Ordered list of plugin entries
	const plugins: InternalPluginEntry[] = [];

	// Quick lookup by ID
	const pluginMap = new Map<string, InternalPluginEntry>();

	// Track if map is ready for immediate hook calls
	let mapReady = false;

	// ==========================================================================
	// Context Creation
	// ==========================================================================

	function createPluginContext(entry: InternalPluginEntry): PluginContext {
		const stateStore = createPluginStateStore(entry.pluginState);

		return {
			get mapId() {
				return getMapId();
			},

			get map() {
				const map = getMap();
				if (!map) {
					throw new Error(
						`[@mapwise/core] Plugin "${entry.definition.id}" tried to access map before it's ready`,
					);
				}
				return map;
			},

			get layers() {
				return layerRegistry;
			},

			get style() {
				return styleManager;
			},

			get events() {
				return eventBus;
			},

			get interactionMode() {
				return interactionMode;
			},

			get cursorManager() {
				return cursorManager;
			},

			get keyboard() {
				return keyboard;
			},

			get state() {
				return stateStore;
			},

			getViewport(): Viewport {
				const map = getMap();
				if (!map) {
					return { center: [0, 0], zoom: 0, bearing: 0, pitch: 0 };
				}
				const center = map.getCenter();
				return {
					center: [center.lng, center.lat],
					zoom: map.getZoom(),
					bearing: map.getBearing(),
					pitch: map.getPitch(),
				};
			},

			log(level: "debug" | "info" | "warn" | "error", message: string): void {
				const prefix = `[@mapwise/plugin:${entry.definition.id}]`;
				switch (level) {
					case "debug":
						console.debug(prefix, message);
						break;
					case "info":
						console.info(prefix, message);
						break;
					case "warn":
						console.warn(prefix, message);
						break;
					case "error":
						console.error(prefix, message);
						break;
				}
			},
		};
	}

	// ==========================================================================
	// Safe Hook Execution
	// ==========================================================================

	async function safeExecuteHook<T>(
		entry: InternalPluginEntry,
		hookName: string,
		fn: () => T | Promise<T>,
	): Promise<T | undefined> {
		try {
			return await fn();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			entry.state.error = `${hookName}: ${message}`;

			// Emit plugin:error event for plugin-specific error tracking
			eventBus.emit("plugin:error", {
				pluginId: entry.definition.id,
				hook: hookName,
				message,
				recoverable: true,
			});

			// Also emit map:error for backward compatibility
			eventBus.emit("map:error", {
				code: "PLUGIN_ERROR",
				message: `Plugin "${entry.definition.id}" error in ${hookName}: ${message}`,
				recoverable: true,
				originalError: error instanceof Error ? error : undefined,
			});

			return undefined;
		}
	}

	// ==========================================================================
	// Event Subscriptions
	// ==========================================================================

	function setupEventListeners(entry: InternalPluginEntry): void {
		const ctx = createPluginContext(entry);
		const def = entry.definition;

		// Layer added
		if (def.onLayerAdded) {
			const unsub = eventBus.on("layer:added", (event) => {
				const layerState = layerRegistry.getLayerState(event.layerId);
				if (layerState) {
					safeExecuteHook(entry, "onLayerAdded", () => def.onLayerAdded?.(ctx, layerState));
				}
			});
			entry.eventUnsubscribers.push(unsub);
		}

		// Layer removed
		if (def.onLayerRemoved) {
			const unsub = eventBus.on("layer:removed", (event) => {
				safeExecuteHook(entry, "onLayerRemoved", () => def.onLayerRemoved?.(ctx, event.layerId));
			});
			entry.eventUnsubscribers.push(unsub);
		}

		// Resize
		if (def.onResize) {
			const unsub = eventBus.on("map:resize", (event) => {
				safeExecuteHook(entry, "onResize", () => def.onResize?.(ctx, event.width, event.height));
			});
			entry.eventUnsubscribers.push(unsub);
		}

		// Viewport change (debounced to prevent excessive callbacks)
		if (def.onViewportChange) {
			const map = getMap();
			if (map) {
				// Debounce viewport change callbacks to prevent excessive updates
				// MapLibre's moveend already fires after movement stops, but we add
				// additional debouncing for rapid successive changes
				const debouncedHandler = debounce(() => {
					const viewport = ctx.getViewport();
					safeExecuteHook(entry, "onViewportChange", () => def.onViewportChange?.(ctx, viewport));
				}, 150); // 150ms debounce for viewport changes

				const handler = () => {
					debouncedHandler();
				};
				map.on("moveend", handler);
				entry.eventUnsubscribers.push(() => {
					debouncedHandler.cancel();
					map.off("moveend", handler);
				});
			}
		}
	}

	function teardownEventListeners(entry: InternalPluginEntry): void {
		for (const unsub of entry.eventUnsubscribers) {
			try {
				unsub();
			} catch {
				// Ignore unsubscribe errors
			}
		}
		entry.eventUnsubscribers = [];
	}

	// ==========================================================================
	// Registration
	// ==========================================================================

	function validatePluginDependencies(plugin: PluginDefinition): void {
		if (!plugin.dependencies) {
			return;
		}

		for (const depId of plugin.dependencies) {
			if (!pluginMap.has(depId)) {
				throw new Error(
					`[@mapwise/core] Plugin "${plugin.id}" requires plugin "${depId}" which is not registered`,
				);
			}
		}
	}

	function createPluginEntry(plugin: PluginDefinition): InternalPluginEntry {
		return {
			definition: plugin,
			state: {
				id: plugin.id,
				name: plugin.name ?? plugin.id,
				version: plugin.version ?? "0.0.0",
				active: false,
				order: plugins.length,
				registeredAt: Date.now(),
			},
			pluginState: new Map(),
			eventUnsubscribers: [],
		};
	}

	async function register(plugin: PluginDefinition): Promise<void> {
		if (pluginMap.has(plugin.id)) {
			throw new Error(`[@mapwise/core] Plugin "${plugin.id}" is already registered`);
		}

		validatePluginDependencies(plugin);

		const entry = createPluginEntry(plugin);

		plugins.push(entry);
		pluginMap.set(plugin.id, entry);

		const ctx = createPluginContext(entry);
		const cleanup = await safeExecuteHook(entry, "onRegister", () => plugin.onRegister(ctx));

		if (typeof cleanup === "function") {
			entry.cleanup = cleanup;
		}

		if (isMapReady()) {
			setupEventListeners(entry);
		}

		entry.state.active = true;

		eventBus.emit("plugin:registered", {
			pluginId: plugin.id,
			name: plugin.name ?? plugin.id,
			version: plugin.version ?? "0.0.0",
		});

		if (mapReady && plugin.onMapReady) {
			await safeExecuteHook(entry, "onMapReady", () => plugin.onMapReady?.(ctx));
		}
	}

	async function unregister(id: string): Promise<boolean> {
		const entry = pluginMap.get(id);
		if (!entry) {
			return false;
		}

		// Check if other plugins depend on this one
		for (const other of plugins) {
			if (other.definition.dependencies?.includes(id)) {
				throw new Error(
					`[@mapwise/core] Cannot unregister plugin "${id}" - plugin "${other.definition.id}" depends on it`,
				);
			}
		}

		// Tear down event listeners
		teardownEventListeners(entry);

		// Call cleanup function if provided
		if (entry.cleanup) {
			await safeExecuteHook(entry, "cleanup", () => entry.cleanup?.());
		}

		// Call onUnregister
		if (entry.definition.onUnregister) {
			const ctx = createPluginContext(entry);
			await safeExecuteHook(entry, "onUnregister", () => entry.definition.onUnregister?.(ctx));
		}

		// Clear plugin state
		entry.pluginState.clear();

		// Remove from registry
		const index = plugins.indexOf(entry);
		if (index >= 0) {
			plugins.splice(index, 1);
		}
		pluginMap.delete(id);

		// Update order for remaining plugins
		plugins.forEach((p, i) => {
			p.state.order = i;
		});

		entry.state.active = false;

		// Emit plugin:unregistered event
		eventBus.emit("plugin:unregistered", {
			pluginId: id,
		});

		return true;
	}

	// ==========================================================================
	// Lifecycle Notifications
	// ==========================================================================

	async function notifyMapReady(): Promise<void> {
		mapReady = true;

		for (const entry of plugins) {
			// Set up event listeners now that map is ready
			setupEventListeners(entry);

			// Call onMapReady hook
			if (entry.definition.onMapReady) {
				const ctx = createPluginContext(entry);
				await safeExecuteHook(entry, "onMapReady", () => entry.definition.onMapReady?.(ctx));
			}
		}
	}

	async function notifyStyleChangeStart(newStyle: string): Promise<void> {
		for (const entry of plugins) {
			if (entry.definition.onStyleChangeStart) {
				const ctx = createPluginContext(entry);
				await safeExecuteHook(entry, "onStyleChangeStart", () =>
					entry.definition.onStyleChangeStart?.(ctx, newStyle),
				);
			}
		}
	}

	async function notifyStyleChangeComplete(style: string): Promise<void> {
		for (const entry of plugins) {
			if (entry.definition.onStyleChangeComplete) {
				const ctx = createPluginContext(entry);
				await safeExecuteHook(entry, "onStyleChangeComplete", () =>
					entry.definition.onStyleChangeComplete?.(ctx, style),
				);
			}
		}
	}

	async function notifyDestroy(): Promise<void> {
		// Notify in reverse order (last registered, first destroyed)
		for (let i = plugins.length - 1; i >= 0; i--) {
			const entry = plugins[i];
			if (entry?.definition.onDestroy) {
				const ctx = createPluginContext(entry);
				await safeExecuteHook(entry, "onDestroy", () => entry.definition.onDestroy?.(ctx));
			}
		}
	}

	// ==========================================================================
	// Query Methods
	// ==========================================================================

	function has(id: string): boolean {
		return pluginMap.has(id);
	}

	function getPluginState(id: string): PluginState | undefined {
		const entry = pluginMap.get(id);
		return entry ? { ...entry.state } : undefined;
	}

	function getAllPlugins(): PluginState[] {
		return plugins.map((entry) => ({ ...entry.state }));
	}

	function getPluginStateStore(id: string): Map<string, unknown> | undefined {
		const entry = pluginMap.get(id);
		return entry?.pluginState;
	}

	function setPluginStateValue(id: string, key: string, value: unknown): void {
		const entry = pluginMap.get(id);
		if (entry) {
			entry.pluginState.set(key, value);
		}
	}

	// ==========================================================================
	// Clear
	// ==========================================================================

	async function clear(): Promise<void> {
		// Unregister in reverse order
		const ids = [...plugins].reverse().map((e) => e.definition.id);
		for (const id of ids) {
			try {
				await unregister(id);
			} catch {
				// Force remove on error
				const entry = pluginMap.get(id);
				if (entry) {
					teardownEventListeners(entry);
					entry.pluginState.clear();
					pluginMap.delete(id);
				}
			}
		}
		plugins.length = 0;
	}

	// ==========================================================================
	// Persistence
	// ==========================================================================

	function serializePlugin(id: string): Record<string, unknown> | undefined {
		const entry = pluginMap.get(id);
		if (!entry) {
			return undefined;
		}

		// Custom serializer
		if (entry.definition.persistence?.serialize) {
			const ctx = createPluginContext(entry);
			return entry.definition.persistence.serialize(ctx);
		}

		// Default: serialize all state
		if (entry.pluginState.size === 0) {
			return undefined;
		}

		const state: Record<string, unknown> = {};
		for (const [key, value] of Array.from(entry.pluginState.entries())) {
			// Basic JSON serializability check happens in storage layer,
			// but we could filter here too.
			state[key] = value;
		}
		return state;
	}

	function migratePluginState(
		id: string,
		initialState: Record<string, unknown>,
		fromVersion: number,
		currentVersion: number,
		persistence: PluginDefinition["persistence"],
	): Record<string, unknown> | null {
		if (!persistence?.migrate || fromVersion >= currentVersion) {
			return initialState;
		}

		try {
			return persistence.migrate(initialState, fromVersion);
		} catch (error) {
			eventBus.emit("plugin:error", {
				pluginId: id,
				hook: "migrate",
				message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
				recoverable: true,
			});
			return null;
		}
	}

	async function hydratePlugin(
		id: string,
		rawState: Record<string, unknown>,
		fromVersion = 1,
	): Promise<void> {
		const entry = pluginMap.get(id);
		if (!entry) {
			return; // Cannot hydrate unregistered plugin
		}

		const persistence = entry.definition.persistence;
		const currentVersion = persistence?.schemaVersion ?? 1;

		const state = migratePluginState(id, rawState, fromVersion, currentVersion, persistence);
		if (!state) {
			return; // Migration failed
		}

		// Hydration
		const ctx = createPluginContext(entry);
		if (persistence?.hydrate) {
			await safeExecuteHook(entry, "hydrate", () => persistence.hydrate?.(ctx, state));
		} else {
			// Default: restore to state store
			for (const [key, value] of Object.entries(state)) {
				entry.pluginState.set(key, value);
			}
		}
	}

	// ==========================================================================
	// Return Interface
	// ==========================================================================

	return {
		register,
		unregister,
		has,
		getPluginState,
		getAllPlugins,
		get count() {
			return plugins.length;
		},
		getPluginStateStore,
		setPluginStateValue,
		notifyMapReady,
		notifyStyleChangeStart,
		notifyStyleChangeComplete,
		notifyDestroy,
		clear,
		serializePlugin,
		hydratePlugin,
	};
}
