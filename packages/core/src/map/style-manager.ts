/**
 * Style Manager - Manages basemap switching without losing custom layers.
 *
 * The StyleManager tracks all registered sources, layers, and feature states,
 * then reapplies them in the correct order after a basemap change.
 *
 * @module map/style-manager
 */

import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { EventBus } from "../events/event-bus";
import type {
	RegisteredFeatureState,
	RegisteredLayer,
	RegisteredSource,
	SetBasemapOptions,
	SetBasemapResult,
	StyleInput,
} from "../types/layer";

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMEOUT_MS = 30000;

// =============================================================================
// StyleManager State
// =============================================================================

export interface StyleManagerState {
	/** Current style URL or 'json' for inline styles */
	currentStyle: string | null;
	/** Whether a style change is currently in progress */
	isChanging: boolean;
	/** Registered sources to reapply after style changes */
	sources: Map<string, RegisteredSource>;
	/** Registered layers to reapply after style changes */
	layers: Map<string, RegisteredLayer>;
	/** Feature states to restore after style changes */
	featureStates: RegisteredFeatureState[];
	/** Counter for deterministic ordering */
	orderCounter: number;
}

// =============================================================================
// StyleManager Interface
// =============================================================================

export interface StyleManager {
	/**
	 * Get the current style URL or identifier.
	 */
	readonly currentStyle: string | null;

	/**
	 * Whether a style change is currently in progress.
	 */
	readonly isChanging: boolean;

	/**
	 * Change the basemap style.
	 * Waits for the style to load and reapplies all registered layers/sources.
	 *
	 * @param style - Style URL or StyleSpecification object
	 * @param options - Options for the basemap change
	 * @returns Promise resolving to the result of the operation
	 */
	setBasemap(style: StyleInput, options?: SetBasemapOptions): Promise<SetBasemapResult>;

	/**
	 * Register a source to be preserved across basemap changes.
	 *
	 * @param id - Source ID
	 * @param spec - Source specification
	 */
	registerSource(id: string, spec: RegisteredSource["spec"]): void;

	/**
	 * Unregister a source (will not be reapplied after basemap changes).
	 *
	 * @param id - Source ID
	 */
	unregisterSource(id: string): void;

	/**
	 * Check if a source is registered.
	 */
	hasSource(id: string): boolean;

	/**
	 * Register a layer to be preserved across basemap changes.
	 *
	 * @param id - Layer ID
	 * @param spec - Layer specification
	 * @param beforeId - Optional ID of layer to insert before
	 */
	registerLayer(id: string, spec: RegisteredLayer["spec"], beforeId?: string): void;

	/**
	 * Unregister a layer (will not be reapplied after basemap changes).
	 *
	 * @param id - Layer ID
	 */
	unregisterLayer(id: string): void;

	/**
	 * Check if a layer is registered.
	 */
	hasLayer(id: string): boolean;

	/**
	 * Update feature state for a feature (will be restored after basemap changes).
	 *
	 * @param sourceId - Source ID
	 * @param featureId - Feature ID
	 * @param state - State object to merge
	 * @param sourceLayer - Source layer (for vector sources)
	 */
	setFeatureState(
		sourceId: string,
		featureId: string | number,
		state: Record<string, unknown>,
		sourceLayer?: string,
	): void;

	/**
	 * Remove feature state tracking for a feature.
	 */
	removeFeatureState(sourceId: string, featureId: string | number, sourceLayer?: string): void;

	/**
	 * Clear all feature states for a source.
	 */
	clearFeatureStates(sourceId: string, sourceLayer?: string): void;

	/**
	 * Get all registered source IDs.
	 */
	getRegisteredSourceIds(): string[];

	/**
	 * Get all registered layer IDs in order.
	 */
	getRegisteredLayerIds(): string[];

	/**
	 * Clear all registered sources, layers, and feature states.
	 */
	clear(): void;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new StyleManager instance.
 *
 * @param getMap - Function to get the current MapLibre instance
 * @param eventBus - Event bus for emitting style events
 */
export function createStyleManager(
	getMap: () => MapLibreMap | null,
	eventBus: EventBus,
): StyleManager {
	// Internal state
	const state: StyleManagerState = {
		currentStyle: null,
		isChanging: false,
		sources: new Map(),
		layers: new Map(),
		featureStates: [],
		orderCounter: 0,
	};

	// =========================================================================
	// Source Registration
	// =========================================================================

	function registerSource(id: string, spec: RegisteredSource["spec"]): void {
		const existing = state.sources.get(id);
		const order = existing?.order ?? state.orderCounter++;

		state.sources.set(id, {
			id,
			spec: structuredClone(spec),
			order,
		});

		// If map exists and source isn't already on map, add it
		const map = getMap();
		if (map && !map.getSource(id)) {
			try {
				map.addSource(id, spec);
				eventBus.emit("source:added", { sourceId: id });
			} catch (error) {
				eventBus.emit("map:error", {
					code: "SOURCE_ADD_FAILED",
					message: `Failed to add source "${id}": ${error instanceof Error ? error.message : String(error)}`,
					recoverable: true,
					originalError: error instanceof Error ? error : undefined,
				});
			}
		}
	}

	function removeLayersUsingSource(map: MapLibreMap, sourceId: string): void {
		const style = map.getStyle();
		if (!style?.layers) {
			return;
		}

		for (const layer of style.layers) {
			if ("source" in layer && layer.source === sourceId) {
				map.removeLayer(layer.id);
			}
		}
	}

	function unregisterSource(id: string): void {
		state.sources.delete(id);

		const map = getMap();
		if (map?.getSource(id)) {
			try {
				removeLayersUsingSource(map, id);
				map.removeSource(id);
				eventBus.emit("source:removed", { sourceId: id });
			} catch (error) {
				eventBus.emit("map:error", {
					code: "SOURCE_REMOVE_FAILED",
					message: `Failed to remove source "${id}": ${error instanceof Error ? error.message : String(error)}`,
					recoverable: true,
					originalError: error instanceof Error ? error : undefined,
				});
			}
		}

		state.featureStates = state.featureStates.filter((fs) => fs.sourceId !== id);
	}

	function hasSource(id: string): boolean {
		return state.sources.has(id);
	}

	// =========================================================================
	// Layer Registration
	// =========================================================================

	function extractSourceId(spec: RegisteredLayer["spec"]): string | null {
		return "source" in spec && typeof spec.source === "string" ? spec.source : null;
	}

	function createRegisteredLayer(
		id: string,
		spec: RegisteredLayer["spec"],
		order: number,
		beforeId?: string,
	): RegisteredLayer {
		const registered: RegisteredLayer = {
			id,
			spec: structuredClone(spec),
			sourceId: extractSourceId(spec),
			order,
		};
		if (beforeId !== undefined) {
			registered.beforeId = beforeId;
		}
		return registered;
	}

	function registerLayer(id: string, spec: RegisteredLayer["spec"], beforeId?: string): void {
		const existing = state.layers.get(id);
		const order = existing?.order ?? state.orderCounter++;
		const registeredLayer = createRegisteredLayer(id, spec, order, beforeId);

		state.layers.set(id, registeredLayer);

		const map = getMap();
		if (map && !map.getLayer(id)) {
			try {
				map.addLayer(spec, beforeId);
				eventBus.emit("layer:added", { layerId: id, sourceId: registeredLayer.sourceId });
			} catch (error) {
				eventBus.emit("map:error", {
					code: "LAYER_ADD_FAILED",
					message: `Failed to add layer "${id}": ${error instanceof Error ? error.message : String(error)}`,
					recoverable: true,
					originalError: error instanceof Error ? error : undefined,
				});
			}
		}
	}

	function unregisterLayer(id: string): void {
		state.layers.delete(id);

		// Also remove from map if present
		const map = getMap();
		if (map?.getLayer(id)) {
			try {
				map.removeLayer(id);
				eventBus.emit("layer:removed", { layerId: id });
			} catch (error) {
				eventBus.emit("map:error", {
					code: "LAYER_REMOVE_FAILED",
					message: `Failed to remove layer "${id}": ${error instanceof Error ? error.message : String(error)}`,
					recoverable: true,
					originalError: error instanceof Error ? error : undefined,
				});
			}
		}
	}

	function hasLayer(id: string): boolean {
		return state.layers.has(id);
	}

	// =========================================================================
	// Feature State Management
	// =========================================================================

	function findFeatureStateIndex(
		sourceId: string,
		featureId: string | number,
		sourceLayer?: string,
	): number {
		return state.featureStates.findIndex(
			(fs) =>
				fs.sourceId === sourceId && fs.featureId === featureId && fs.sourceLayer === sourceLayer,
		);
	}

	function updateExistingFeatureState(
		existingIndex: number,
		newState: Record<string, unknown>,
	): void {
		const existing = state.featureStates[existingIndex];
		if (existing) {
			existing.state = { ...existing.state, ...newState };
		}
	}

	function createNewFeatureStateEntry(
		sourceId: string,
		featureId: string | number,
		newState: Record<string, unknown>,
		sourceLayer?: string,
	): void {
		const newEntry: RegisteredFeatureState = {
			sourceId,
			featureId,
			state: { ...newState },
		};
		if (sourceLayer !== undefined) {
			newEntry.sourceLayer = sourceLayer;
		}
		state.featureStates.push(newEntry);
	}

	function setFeatureState(
		sourceId: string,
		featureId: string | number,
		newState: Record<string, unknown>,
		sourceLayer?: string,
	): void {
		const existingIndex = findFeatureStateIndex(sourceId, featureId, sourceLayer);

		if (existingIndex >= 0) {
			updateExistingFeatureState(existingIndex, newState);
		} else {
			createNewFeatureStateEntry(sourceId, featureId, newState, sourceLayer);
		}

		const map = getMap();
		if (map?.getSource(sourceId)) {
			try {
				map.setFeatureState({ source: sourceId, sourceLayer, id: featureId }, newState);
			} catch (error) {
				eventBus.emit("map:error", {
					code: "FEATURE_STATE_FAILED",
					message: `Failed to set feature state: ${error instanceof Error ? error.message : String(error)}`,
					recoverable: true,
					originalError: error instanceof Error ? error : undefined,
				});
			}
		}
	}

	function removeFeatureState(
		sourceId: string,
		featureId: string | number,
		sourceLayer?: string,
	): void {
		state.featureStates = state.featureStates.filter(
			(fs) =>
				!(fs.sourceId === sourceId && fs.featureId === featureId && fs.sourceLayer === sourceLayer),
		);

		// Remove from map if available
		const map = getMap();
		if (map?.getSource(sourceId)) {
			try {
				map.removeFeatureState({ source: sourceId, sourceLayer, id: featureId });
			} catch {
				// Ignore errors when removing feature state
			}
		}
	}

	function clearFeatureStates(sourceId: string, sourceLayer?: string): void {
		state.featureStates = state.featureStates.filter(
			(fs) =>
				!(
					fs.sourceId === sourceId &&
					(sourceLayer === undefined || fs.sourceLayer === sourceLayer)
				),
		);

		// Remove from map if available
		const map = getMap();
		if (map?.getSource(sourceId)) {
			try {
				map.removeFeatureState({ source: sourceId, sourceLayer });
			} catch {
				// Ignore errors when clearing feature state
			}
		}
	}

	// =========================================================================
	// Query Methods
	// =========================================================================

	function getRegisteredSourceIds(): string[] {
		return Array.from(state.sources.values())
			.sort((a, b) => a.order - b.order)
			.map((s) => s.id);
	}

	function getRegisteredLayerIds(): string[] {
		return Array.from(state.layers.values())
			.sort((a, b) => a.order - b.order)
			.map((l) => l.id);
	}

	// =========================================================================
	// Basemap Switching
	// =========================================================================

	async function setBasemap(
		style: StyleInput,
		options: SetBasemapOptions = {},
	): Promise<SetBasemapResult> {
		const map = getMap();
		if (!map) {
			return {
				success: false,
				durationMs: 0,
				reappliedLayers: 0,
				reappliedSources: 0,
				error: new Error("Map is not available"),
			};
		}

		const { timeout = DEFAULT_TIMEOUT_MS, diff = false, validate = true } = options;

		const startTime = performance.now();
		const previousStyle = state.currentStyle;
		const styleIdentifier = typeof style === "string" ? style : "json";

		// Prevent concurrent style changes
		if (state.isChanging) {
			return {
				success: false,
				durationMs: 0,
				reappliedLayers: 0,
				reappliedSources: 0,
				error: new Error("A style change is already in progress"),
			};
		}

		state.isChanging = true;

		// Emit start event
		eventBus.emit("style:changeStart", {
			previousStyle,
			newStyle: styleIdentifier,
		});

		try {
			// Capture current feature states from map before style change
			captureFeatureStates(map);

			// Set the style
			await setStyleWithTimeout(map, style, timeout, diff, validate);

			// Update current style
			state.currentStyle = styleIdentifier;

			// Reapply sources in order
			const reappliedSources = reapplySources(map);

			// Reapply layers in order
			const reappliedLayers = reapplyLayers(map);

			// Restore feature states
			restoreFeatureStates(map);

			const durationMs = performance.now() - startTime;

			// Emit success event
			eventBus.emit("style:changeComplete", {
				style: styleIdentifier,
				reappliedLayers,
				reappliedSources,
				durationMs,
			});

			state.isChanging = false;

			return {
				success: true,
				durationMs,
				reappliedLayers,
				reappliedSources,
			};
		} catch (error) {
			state.isChanging = false;

			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorCode = categorizeStyleError(errorMessage);

			eventBus.emit("style:changeError", {
				style: styleIdentifier,
				code: errorCode,
				message: errorMessage,
				rolledBack: false,
			});

			return {
				success: false,
				durationMs: performance.now() - startTime,
				reappliedLayers: 0,
				reappliedSources: 0,
				error: error instanceof Error ? error : new Error(String(error)),
			};
		}
	}

	// =========================================================================
	// Internal Helpers
	// =========================================================================

	function setStyleWithTimeout(
		map: MapLibreMap,
		style: StyleInput,
		timeout: number,
		diff: boolean,
		validate: boolean,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			let timeoutId: ReturnType<typeof setTimeout> | null = null;
			let resolved = false;

			const cleanup = () => {
				if (timeoutId) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
				map.off("style.load", onStyleLoad);
				map.off("error", onError);
			};

			const onStyleLoad = () => {
				if (resolved) {
					return;
				}
				resolved = true;
				cleanup();
				resolve();
			};

			const onError = (e: { error?: Error }) => {
				if (resolved) {
					return;
				}
				// Only handle style-related errors
				const message = e.error?.message ?? "";
				if (message.includes("style") || message.includes("sprite") || message.includes("glyph")) {
					resolved = true;
					cleanup();
					reject(e.error ?? new Error("Style load error"));
				}
			};

			// Set up timeout
			timeoutId = setTimeout(() => {
				if (resolved) {
					return;
				}
				resolved = true;
				cleanup();
				reject(new Error(`Style load timed out after ${timeout}ms`));
			}, timeout);

			// Listen for style load
			map.once("style.load", onStyleLoad);
			map.on("error", onError);

			// Apply the style
			try {
				const styleToApply = typeof style === "string" ? style : (style as StyleSpecification);

				map.setStyle(styleToApply, { diff, validate });
			} catch (error) {
				resolved = true;
				cleanup();
				reject(error);
			}
		});
	}

	function captureFeatureStates(_map: MapLibreMap): void {
		// Note: MapLibre doesn't provide a direct way to enumerate all feature states
		// We rely on our tracked feature states being up-to-date
		// This function exists as a hook for future enhancements
	}

	function tryAddSource(map: MapLibreMap, source: RegisteredSource): boolean {
		if (map.getSource(source.id)) {
			return false;
		}

		try {
			map.addSource(source.id, source.spec);
			return true;
		} catch (error) {
			eventBus.emit("map:error", {
				code: "SOURCE_REAPPLY_FAILED",
				message: `Failed to reapply source "${source.id}": ${error instanceof Error ? error.message : String(error)}`,
				recoverable: true,
				originalError: error instanceof Error ? error : undefined,
			});
			return false;
		}
	}

	function reapplySources(map: MapLibreMap): number {
		const sortedSources = Array.from(state.sources.values()).sort((a, b) => a.order - b.order);
		let count = 0;

		for (const source of sortedSources) {
			if (tryAddSource(map, source)) {
				count++;
			}
		}

		return count;
	}

	function checkLayerSourceExists(map: MapLibreMap, layer: RegisteredLayer): boolean {
		if (!layer.sourceId) {
			return true;
		}

		if (map.getSource(layer.sourceId)) {
			return true;
		}

		eventBus.emit("map:error", {
			code: "LAYER_REAPPLY_FAILED",
			message: `Cannot reapply layer "${layer.id}": source "${layer.sourceId}" not found`,
			recoverable: true,
			originalError: undefined,
		});
		return false;
	}

	function resolveBeforeId(map: MapLibreMap, beforeId?: string): string | undefined {
		if (!(beforeId && map.getLayer(beforeId))) {
			return undefined;
		}
		return beforeId;
	}

	function tryReapplyLayer(map: MapLibreMap, layer: RegisteredLayer): boolean {
		if (map.getLayer(layer.id)) {
			return false;
		}

		if (!checkLayerSourceExists(map, layer)) {
			return false;
		}

		try {
			const beforeId = resolveBeforeId(map, layer.beforeId);
			map.addLayer(layer.spec, beforeId);
			return true;
		} catch (error) {
			eventBus.emit("map:error", {
				code: "LAYER_REAPPLY_FAILED",
				message: `Failed to reapply layer "${layer.id}": ${error instanceof Error ? error.message : String(error)}`,
				recoverable: true,
				originalError: error instanceof Error ? error : undefined,
			});
			return false;
		}
	}

	function reapplyLayers(map: MapLibreMap): number {
		const sortedLayers = Array.from(state.layers.values()).sort((a, b) => a.order - b.order);
		let count = 0;

		for (const layer of sortedLayers) {
			if (tryReapplyLayer(map, layer)) {
				count++;
			}
		}

		return count;
	}

	function restoreFeatureStates(map: MapLibreMap): void {
		for (const fs of state.featureStates) {
			// Check if source exists
			if (!map.getSource(fs.sourceId)) {
				continue;
			}

			try {
				map.setFeatureState(
					{
						source: fs.sourceId,
						sourceLayer: fs.sourceLayer,
						id: fs.featureId,
					},
					fs.state,
				);
			} catch {
				// Feature state restoration errors are non-critical
			}
		}
	}

	function categorizeStyleError(
		message: string,
	): "LOAD_ERROR" | "TIMEOUT" | "INVALID_STYLE" | "SPRITE_ERROR" | "GLYPH_ERROR" {
		const lowerMessage = message.toLowerCase();

		if (lowerMessage.includes("timeout")) {
			return "TIMEOUT";
		}
		if (lowerMessage.includes("sprite")) {
			return "SPRITE_ERROR";
		}
		if (lowerMessage.includes("glyph") || lowerMessage.includes("font")) {
			return "GLYPH_ERROR";
		}
		if (
			lowerMessage.includes("invalid") ||
			lowerMessage.includes("parse") ||
			lowerMessage.includes("json")
		) {
			return "INVALID_STYLE";
		}
		return "LOAD_ERROR";
	}

	// =========================================================================
	// Clear
	// =========================================================================

	function clear(): void {
		state.sources.clear();
		state.layers.clear();
		state.featureStates = [];
		state.orderCounter = 0;
	}

	// =========================================================================
	// Return Public Interface
	// =========================================================================

	return {
		get currentStyle() {
			return state.currentStyle;
		},

		get isChanging() {
			return state.isChanging;
		},

		setBasemap,
		registerSource,
		unregisterSource,
		hasSource,
		registerLayer,
		unregisterLayer,
		hasLayer,
		setFeatureState,
		removeFeatureState,
		clearFeatureStates,
		getRegisteredSourceIds,
		getRegisteredLayerIds,
		clear,
	};
}

/**
 * Initialize the StyleManager with the current style from the map.
 * Should be called once the map is ready.
 */
export function initializeStyleManager(manager: StyleManager, map: MapLibreMap): void {
	// Capture the initial style URL if available
	const style = map.getStyle();
	if (style?.name) {
		// Style name is available - use it as identifier
		(manager as { currentStyle: string | null }).currentStyle = style.name;
	}
}
