/**
 * Map store - manages the internal state of a map instance.
 *
 * This is an internal module. The public API is exposed through MapController.
 *
 * @module map/map-store
 * @internal
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import type { EventBus } from "../events/event-bus.js";
import type { LayerRegistry } from "../registry/layer-registry.js";
import type { PluginManager } from "../registry/plugin-registry.js";
import type { InternalMapState, MapLifecycleState, ResolvedMapOptions } from "../types/map.js";
import type { StyleManager } from "./style-manager.js";

/**
 * Valid state transitions for the lifecycle state machine.
 */
const VALID_TRANSITIONS: Record<MapLifecycleState, MapLifecycleState[]> = {
	uninitialized: ["creating"],
	creating: ["ready", "error", "destroyed"],
	ready: ["destroyed"],
	error: ["destroyed"],
	destroyed: [], // Terminal state
};

/**
 * Check if a state transition is valid.
 */
export function isValidTransition(from: MapLifecycleState, to: MapLifecycleState): boolean {
	return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Create default resolved options.
 */
export function resolveOptions(options: Partial<ResolvedMapOptions>): ResolvedMapOptions {
	return {
		...options,
		autoResize: options.autoResize ?? true,
		resizeDebounceMs: options.resizeDebounceMs ?? 100,
		preserveDrawingBuffer: options.preserveDrawingBuffer ?? true,
	};
}

/**
 * Create initial internal state.
 */
export function createInitialState(id: string, options: ResolvedMapOptions): InternalMapState {
	return {
		id,
		lifecycleState: "uninitialized",
		map: null,
		container: null,
		options,
		resizeObserver: null,
		cleanupFns: [],
		styleManager: null,
		layerRegistry: null,
		pluginManager: null,
	};
}

/**
 * Transition the lifecycle state with validation.
 *
 * @throws Error if the transition is invalid
 */
export function transitionState(
	state: InternalMapState,
	eventBus: EventBus,
	newState: MapLifecycleState,
): void {
	const previousState = state.lifecycleState;

	if (!isValidTransition(previousState, newState)) {
		throw new Error(`[@mapwise/core] Invalid state transition: ${previousState} → ${newState}`);
	}

	state.lifecycleState = newState;

	// Emit lifecycle change event
	eventBus.emit("map:lifecycle", {
		previousState,
		currentState: newState,
	});

	// Emit specific events for key transitions
	if (newState === "ready") {
		eventBus.emit("map:ready", { timestamp: Date.now() });
	} else if (newState === "destroyed") {
		eventBus.emit("map:destroyed", {});
	}
}

/**
 * Set the MapLibre instance on the state.
 */
export function setMapInstance(state: InternalMapState, map: MapLibreMap | null): void {
	state.map = map;
}

/**
 * Set the container element on the state.
 */
export function setContainer(state: InternalMapState, container: HTMLElement | null): void {
	state.container = container;
}

/**
 * Set the StyleManager instance on the state.
 */
export function setStyleManager(state: InternalMapState, styleManager: StyleManager | null): void {
	state.styleManager = styleManager;
}

/**
 * Set the LayerRegistry instance on the state.
 */
export function setLayerRegistry(
	state: InternalMapState,
	layerRegistry: LayerRegistry | null,
): void {
	state.layerRegistry = layerRegistry;
}

/**
 * Set the PluginManager instance on the state.
 */
export function setPluginManager(
	state: InternalMapState,
	pluginManager: PluginManager | null,
): void {
	state.pluginManager = pluginManager;
}

/**
 * Register a cleanup function to be called on destroy.
 */
export function registerCleanup(state: InternalMapState, fn: () => void): void {
	state.cleanupFns.push(fn);
}

/**
 * Run all cleanup functions.
 */
export function runCleanup(state: InternalMapState): void {
	// Run in reverse order (LIFO)
	while (state.cleanupFns.length > 0) {
		const fn = state.cleanupFns.pop();
		try {
			fn?.();
		} catch (error) {
			console.error("[@mapwise/core] Error during cleanup:", error);
		}
	}
}

/**
 * Set the ResizeObserver instance.
 */
export function setResizeObserver(state: InternalMapState, observer: ResizeObserver | null): void {
	state.resizeObserver = observer;
}
