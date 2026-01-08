/**
 * Map creation and lifecycle management.
 *
 * @module map/create-map
 */

import { Map as MapLibreMap } from "maplibre-gl";
import { type EventBus, createEventBus } from "../events/event-bus";
import { type HydrationContext, hydrateState } from "../persistence/hydrate";
import type {
	HydrateOptions,
	HydrateResult,
	PersistedMapState,
	SerializeOptions,
} from "../persistence/persistence-types";
import { type SerializationContext, serializeState } from "../persistence/serialize";
import { type LayerRegistry, createLayerRegistry } from "../registry/layer-registry";
import { type PluginManager, createPluginManager } from "../registry/plugin-registry";
import type { SetBasemapOptions, SetBasemapResult, StyleInput } from "../types/layer";
import type { InternalMapState, MapController, MapOptions } from "../types/map";
import { assert, assertBrowser, assertDefined, isHTMLElement } from "../utils/assert";
import { debounce } from "../utils/debounce";
import { generateMapId } from "../utils/id";
import {
	createInitialState,
	registerCleanup,
	resolveOptions,
	runCleanup,
	setContainer,
	setLayerRegistry,
	setMapInstance,
	setPluginManager,
	setResizeObserver,
	setStyleManager,
	transitionState,
} from "./map-store";
import { type StyleManager, createStyleManager } from "./style-manager";

/**
 * Create a new map instance.
 *
 * @param container - The HTML element to render the map into
 * @param options - Map configuration options
 * @returns A MapController for interacting with the map
 *
 * @example
 * ```typescript
 * const controller = createMap(document.getElementById('map')!, {
 *   style: 'https://demotiles.maplibre.org/style.json',
 *   center: [0, 0],
 *   zoom: 2,
 * });
 *
 * await controller.awaitReady();
 *
 * // Register a layer using the layer registry
 * controller.layers.registerLayer({
 *   id: 'my-points',
 *   type: 'geojson',
 *   source: { id: 'my-source', spec: { type: 'geojson', data: myData } },
 *   layers: [{
 *     id: 'my-points',
 *     type: 'circle',
 *     source: 'my-source',
 *     paint: { 'circle-radius': 5, 'circle-color': '#ff0000' }
 *   }],
 *   metadata: { title: 'My Points' }
 * });
 *
 * // Layers are automatically preserved across basemap changes
 * await controller.setBasemap('https://another-style.json');
 *
 * // Register a plugin
 * await controller.plugins.register({
 *   id: 'my-plugin',
 *   onRegister(ctx) {
 *     ctx.log('info', 'Plugin registered!');
 *   },
 *   onMapReady(ctx) {
 *     ctx.log('info', 'Map is ready!');
 *   }
 * });
 * ```
 */
export function createMap(container: HTMLElement, options: MapOptions = {}): MapController {
	// Validate inputs at API boundary
	assertBrowser("createMap");
	assertDefined(container, "container");
	assert(isHTMLElement(container), "container must be an HTMLElement");

	// Initialize state
	const id = generateMapId();
	const resolvedOptions = resolveOptions(options);
	const state = createInitialState(id, resolvedOptions);
	const eventBus = createEventBus();

	// Set container
	setContainer(state, container);

	// Create StyleManager (with getter for deferred map access)
	const styleManager = createStyleManager(() => state.map, eventBus);
	setStyleManager(state, styleManager);

	// Create LayerRegistry (with getter for deferred map access)
	const layerRegistry = createLayerRegistry(() => state.map, eventBus);
	setLayerRegistry(state, layerRegistry);

	// Create PluginManager
	const pluginManager = createPluginManager({
		getMap: () => state.map,
		getMapId: () => state.id,
		isMapReady: () => state.lifecycleState === "ready",
		layerRegistry,
		styleManager,
		eventBus,
	});
	setPluginManager(state, pluginManager);

	// Transition to creating state
	transitionState(state, eventBus, "creating");

	// Create the MapLibre instance
	let map: MapLibreMap;
	try {
		map = new MapLibreMap({
			...resolvedOptions,
			container,
		});
	} catch (error) {
		transitionState(state, eventBus, "error");
		eventBus.emit("map:error", {
			code: "MAP_CREATION_FAILED",
			message: `Failed to create MapLibre instance: ${error instanceof Error ? error.message : String(error)}`,
			recoverable: false,
			originalError: error instanceof Error ? error : undefined,
		});
		throw error;
	}

	setMapInstance(state, map);

	// Set up load handler - apply layers when map is ready
	const onLoad = () => {
		if (state.lifecycleState === "creating") {
			transitionState(state, eventBus, "ready");

			// Apply all registered layers now that map is ready
			layerRegistry.applyAll().catch((error) => {
				eventBus.emit("map:error", {
					code: "LAYERS_APPLY_FAILED",
					message: `Failed to apply layers: ${error instanceof Error ? error.message : String(error)}`,
					recoverable: true,
					originalError: error instanceof Error ? error : undefined,
				});
			});

			// Notify plugins that map is ready
			pluginManager.notifyMapReady().catch((error) => {
				eventBus.emit("map:error", {
					code: "PLUGIN_READY_FAILED",
					message: `Failed to notify plugins of map ready: ${error instanceof Error ? error.message : String(error)}`,
					recoverable: true,
					originalError: error instanceof Error ? error : undefined,
				});
			});
		}
	};

	// Set up error handler
	const onError = (e: ErrorEvent) => {
		eventBus.emit("map:error", {
			code: "MAP_RUNTIME_ERROR",
			message: e.error?.message ?? "Unknown map error",
			recoverable: true,
			originalError: e.error,
		});
	};

	map.on("load", onLoad);
	map.on("error", onError);

	// Register cleanup for event listeners
	registerCleanup(state, () => {
		map.off("load", onLoad);
		map.off("error", onError);
	});

	// Set up resize handling
	if (resolvedOptions.autoResize && typeof ResizeObserver !== "undefined") {
		setupResizeObserver(state, eventBus, map, resolvedOptions.resizeDebounceMs);
	}

	// Create the controller
	const controller = createController(state, eventBus, styleManager, layerRegistry, pluginManager);

	return controller;
}

/**
 * Set up ResizeObserver for automatic resize handling.
 */
function setupResizeObserver(
	state: InternalMapState,
	eventBus: EventBus,
	_map: MapLibreMap,
	debounceMs: number,
): void {
	const container = state.container;
	if (!container) {
		return;
	}

	const debouncedResize = debounce(() => {
		if (state.lifecycleState === "ready" && state.map) {
			state.map.resize();

			const rect = container.getBoundingClientRect();
			eventBus.emit("map:resize", {
				width: rect.width,
				height: rect.height,
			});
		}
	}, debounceMs);

	const resizeObserver = new ResizeObserver(() => {
		debouncedResize();
	});

	resizeObserver.observe(container);
	setResizeObserver(state, resizeObserver);

	registerCleanup(state, () => {
		debouncedResize.cancel();
		resizeObserver.disconnect();
		setResizeObserver(state, null);
	});
}

/**
 * Create the public MapController interface.
 */
function createController(
	state: InternalMapState,
	eventBus: EventBus,
	styleManager: StyleManager,
	layerRegistry: LayerRegistry,
	pluginManager: PluginManager,
): MapController {
	// Store promise resolvers for awaitReady
	let readyResolve: (() => void) | null = null;
	let readyReject: ((error: Error) => void) | null = null;
	let readyPromise: Promise<void> | null = null;

	// Set up listeners for ready/error/destroyed
	eventBus.on("map:ready", () => {
		readyResolve?.();
		readyResolve = null;
		readyReject = null;
	});

	eventBus.on("map:error", (error) => {
		if (!error.recoverable) {
			readyReject?.(new Error(error.message));
			readyResolve = null;
			readyReject = null;
		}
	});

	eventBus.on("map:destroyed", () => {
		readyReject?.(new Error("Map was destroyed before becoming ready"));
		readyResolve = null;
		readyReject = null;
	});

	// Listen for style changes to reapply layers and notify plugins
	eventBus.on("style:changeStart", (event) => {
		// Notify plugins of style change start
		pluginManager.notifyStyleChangeStart(event.newStyle).catch((error) => {
			eventBus.emit("map:error", {
				code: "PLUGIN_STYLE_START_FAILED",
				message: `Failed to notify plugins of style change start: ${error instanceof Error ? error.message : String(error)}`,
				recoverable: true,
				originalError: error instanceof Error ? error : undefined,
			});
		});
	});

	eventBus.on("style:changeComplete", (event) => {
		// Reapply all layers after style change
		layerRegistry.applyAll().catch((error) => {
			eventBus.emit("map:error", {
				code: "LAYERS_REAPPLY_FAILED",
				message: `Failed to reapply layers after style change: ${error instanceof Error ? error.message : String(error)}`,
				recoverable: true,
				originalError: error instanceof Error ? error : undefined,
			});
		});

		// Notify plugins of style change complete
		pluginManager.notifyStyleChangeComplete(event.style).catch((error) => {
			eventBus.emit("map:error", {
				code: "PLUGIN_STYLE_COMPLETE_FAILED",
				message: `Failed to notify plugins of style change complete: ${error instanceof Error ? error.message : String(error)}`,
				recoverable: true,
				originalError: error instanceof Error ? error : undefined,
			});
		});
	});

	const controller: MapController = {
		get id() {
			return state.id;
		},

		get state() {
			return state.lifecycleState;
		},

		get isReady() {
			return state.lifecycleState === "ready";
		},

		get map() {
			if (state.lifecycleState !== "ready" || !state.map) {
				throw new Error(
					`[@mapwise/core] Cannot access map in state "${state.lifecycleState}". Use awaitReady() first.`,
				);
			}
			return state.map;
		},

		get style() {
			return styleManager;
		},

		get layers() {
			return layerRegistry;
		},

		get plugins() {
			return pluginManager;
		},

		awaitReady(): Promise<void> {
			// Already ready
			if (state.lifecycleState === "ready") {
				return Promise.resolve();
			}

			// Already in terminal state
			if (state.lifecycleState === "destroyed") {
				return Promise.reject(new Error("Map has been destroyed"));
			}

			if (state.lifecycleState === "error") {
				return Promise.reject(new Error("Map failed to initialize"));
			}

			// Return existing promise if one is pending
			if (readyPromise) {
				return readyPromise;
			}

			// Create new promise
			readyPromise = new Promise<void>((resolve, reject) => {
				readyResolve = resolve;
				readyReject = reject;
			});

			return readyPromise;
		},

		async setBasemap(style: StyleInput, options?: SetBasemapOptions): Promise<SetBasemapResult> {
			// Ensure map is ready
			if (state.lifecycleState !== "ready" || !state.map) {
				return {
					success: false,
					durationMs: 0,
					reappliedLayers: 0,
					reappliedSources: 0,
					error: new Error(
						`Cannot change basemap in state "${state.lifecycleState}". Use awaitReady() first.`,
					),
				};
			}

			// Unapply registry layers before style change
			await layerRegistry.unapplyAll();

			// Change the basemap
			const result = await styleManager.setBasemap(style, options);

			// Note: Layers will be reapplied via the style:changeComplete event listener

			return result;
		},

		serialize(options?: SerializeOptions): PersistedMapState {
			const ctx: SerializationContext = {
				map: state.map,
				styleManager,
				layerRegistry,
				pluginManager,
				getPluginStateStore: (id) => pluginManager.getPluginStateStore(id),
			};

			return serializeState(ctx, options);
		},

		async hydrate(
			persistedState: PersistedMapState,
			options?: HydrateOptions,
		): Promise<HydrateResult> {
			const ctx: HydrationContext = {
				map: state.map,
				styleManager,
				layerRegistry,
				pluginManager,
				setPluginState: (pluginId, key, value) =>
					pluginManager.setPluginStateValue(pluginId, key, value),
			};

			return hydrateState(ctx, persistedState, options);
		},

		invalidateSize(): void {
			if (state.lifecycleState === "ready" && state.map) {
				state.map.resize();

				if (state.container) {
					const rect = state.container.getBoundingClientRect();
					eventBus.emit("map:resize", {
						width: rect.width,
						height: rect.height,
					});
				}
			}
		},

		async destroy(): Promise<void> {
			// Idempotent - safe to call multiple times
			if (state.lifecycleState === "destroyed") {
				return;
			}

			// Notify plugins of destruction first
			await pluginManager.notifyDestroy();

			// Clear plugins
			await pluginManager.clear();

			// Clear layer registry
			layerRegistry.clear();

			// Clear style manager state
			styleManager.clear();

			// Run all cleanup functions
			runCleanup(state);

			// Remove the map
			if (state.map) {
				state.map.remove();
				setMapInstance(state, null);
			}

			// Clear event bus
			eventBus.off();

			// Clear container reference
			setContainer(state, null);

			// Clear manager references
			setStyleManager(state, null);
			setLayerRegistry(state, null);
			setPluginManager(state, null);

			// Transition to destroyed
			state.lifecycleState = "destroyed";
		},
	};

	return controller;
}

/**
 * Type re-export for convenience
 */
export type { MapController, MapOptions };
