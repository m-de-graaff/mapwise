/**
 * Layer Registry - Manages layers independently of MapLibre specifics.
 *
 * The registry maintains an ordered collection of layer definitions,
 * tracks their state, and synchronizes with the map.
 *
 * @module registry/layer-registry
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import type { EventBus } from "../events/event-bus";
import type {
	CustomLayerDefinition,
	LayerCategory,
	LayerDefinition,
	LayerHandlerContext,
	LayerMetadata,
	LayerPosition,
	LayerState,
	MapLibreLayerDefinition,
	RegisterLayerOptions,
} from "./registry-types";
import { isCustomLayerDefinition, isMapLibreLayerDefinition } from "./registry-types";

// =============================================================================
// Internal Types
// =============================================================================

interface InternalLayerEntry {
	definition: LayerDefinition;
	state: LayerState;
}

// =============================================================================
// LayerRegistry Interface
// =============================================================================

export interface LayerRegistry {
	/**
	 * Register a layer with the registry.
	 * The layer will be applied to the map when it's ready.
	 *
	 * @param definition - Layer definition
	 * @param options - Registration options
	 * @throws Error if layer ID already exists
	 */
	registerLayer(definition: LayerDefinition, options?: RegisterLayerOptions): void;

	/**
	 * Remove a layer from the registry and the map.
	 *
	 * @param id - Layer ID to remove
	 * @returns true if layer was found and removed
	 */
	removeLayer(id: string): boolean;

	/**
	 * Move a layer to a new position in the stack.
	 *
	 * @param id - Layer ID to move
	 * @param position - New position
	 * @returns true if layer was found and moved
	 */
	moveLayer(id: string, position: LayerPosition): boolean;

	/**
	 * Set layer visibility.
	 *
	 * @param id - Layer ID
	 * @param visible - Whether layer should be visible
	 * @returns true if layer was found
	 */
	setVisibility(id: string, visible: boolean): boolean;

	/**
	 * Set layer opacity.
	 *
	 * @param id - Layer ID
	 * @param opacity - Opacity value (0-1)
	 * @returns true if layer was found
	 */
	setOpacity(id: string, opacity: number): boolean;

	/**
	 * Check if a layer exists in the registry.
	 */
	hasLayer(id: string): boolean;

	/**
	 * Get the current state of a layer.
	 */
	getLayerState(id: string): LayerState | undefined;

	/**
	 * Get all layer states in order (bottom to top).
	 */
	getAllLayers(): LayerState[];

	/**
	 * Get layers filtered by category.
	 */
	getLayersByCategory(category: LayerCategory): LayerState[];

	/**
	 * Get the number of registered layers.
	 */
	readonly count: number;

	/**
	 * Apply all registered layers to the map.
	 * Called internally when map becomes ready or style reloads.
	 */
	applyAll(): Promise<void>;

	/**
	 * Remove all layers from the map (but keep in registry).
	 * Called internally before style reload.
	 */
	unapplyAll(): Promise<void>;

	/**
	 * Clear all layers from registry and map.
	 */
	clear(): void;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new LayerRegistry instance.
 *
 * @param getMap - Function to get the current MapLibre instance
 * @param eventBus - Event bus for emitting layer events
 */
export function createLayerRegistry(
	getMap: () => MapLibreMap | null,
	eventBus: EventBus,
): LayerRegistry {
	// Ordered list of layer entries (index 0 = bottom)
	const layers: InternalLayerEntry[] = [];

	// Quick lookup by ID
	const layerMap = new Map<string, InternalLayerEntry>();

	// ==========================================================================
	// Helper Functions
	// ==========================================================================

	function getDefaultCategory(def: LayerDefinition): LayerCategory {
		return def.category ?? "overlay";
	}

	function getDefaultMetadata(def: LayerDefinition): LayerMetadata {
		return def.metadata ?? {};
	}

	function createLayerState(
		def: LayerDefinition,
		order: number,
		options?: RegisterLayerOptions,
	): LayerState {
		const metadata = getDefaultMetadata(def);
		return {
			id: def.id,
			type: def.type,
			category: getDefaultCategory(def),
			visible: options?.visible ?? metadata.initialVisibility ?? true,
			opacity: options?.opacity ?? metadata.initialOpacity ?? 1,
			applied: false,
			order,
			metadata,
		};
	}

	function createHandlerContext(layerId: string): LayerHandlerContext | null {
		const map = getMap();
		if (!map) {
			return null;
		}

		return {
			map,
			generateId: (suffix: string) => `${layerId}-${suffix}`,
		};
	}

	function resolveInsertIndex(position: LayerPosition | undefined): number {
		if (!position) {
			return layers.length; // Top
		}

		switch (position.type) {
			case "top":
				return layers.length;

			case "bottom":
				return 0;

			case "index":
				return Math.max(0, Math.min(position.index, layers.length));

			case "above": {
				const targetIndex = layers.findIndex((l) => l.definition.id === position.layerId);
				return targetIndex >= 0 ? targetIndex + 1 : layers.length;
			}

			case "below": {
				const targetIndex = layers.findIndex((l) => l.definition.id === position.layerId);
				return targetIndex >= 0 ? targetIndex : 0;
			}
		}
	}

	function updateOrder(): void {
		layers.forEach((entry, index) => {
			entry.state.order = index;
		});
	}

	function emitStateChange(
		entry: InternalLayerEntry,
		_change: "added" | "removed" | "visibility" | "opacity" | "order" | "error" | "applied",
	): void {
		eventBus.emit("layer:added", { layerId: entry.state.id, sourceId: null });
		// Note: We're using existing events, could extend EventMap for more granular events
	}

	// ==========================================================================
	// Apply/Unapply Logic
	// ==========================================================================

	function addSourceToMap(map: MapLibreMap, def: MapLibreLayerDefinition, state: LayerState): void {
		if (!def.source || map.getSource(def.source.id)) {
			return;
		}

		try {
			map.addSource(def.source.id, def.source.spec);
		} catch (error) {
			state.error = `Failed to add source: ${error instanceof Error ? error.message : String(error)}`;
			throw error;
		}
	}

	function addSingleLayerToMap(
		map: MapLibreMap,
		layerSpec: MapLibreLayerDefinition["layers"][number],
		state: LayerState,
	): void {
		if (map.getLayer(layerSpec.id)) {
			return;
		}

		try {
			const beforeId = findBeforeId(state.order);
			map.addLayer(layerSpec, beforeId);

			if (!state.visible) {
				map.setLayoutProperty(layerSpec.id, "visibility", "none");
			}

			applyOpacityToMapLibreLayer(map, layerSpec.id, state.opacity);
		} catch (error) {
			state.error = `Failed to add layer: ${error instanceof Error ? error.message : String(error)}`;
			throw error;
		}
	}

	async function applyMapLibreLayer(
		def: MapLibreLayerDefinition,
		state: LayerState,
	): Promise<void> {
		const map = getMap();
		if (!map) {
			return;
		}

		addSourceToMap(map, def, state);

		for (const layerSpec of def.layers) {
			addSingleLayerToMap(map, layerSpec, state);
		}
	}

	function removeLayersFromMap(
		map: MapLibreMap,
		layerSpecs: MapLibreLayerDefinition["layers"],
	): void {
		for (let i = layerSpecs.length - 1; i >= 0; i--) {
			const layerSpec = layerSpecs[i];
			if (layerSpec && map.getLayer(layerSpec.id)) {
				try {
					map.removeLayer(layerSpec.id);
				} catch {
					// Ignore removal errors
				}
			}
		}
	}

	function isSourceUsedByOtherLayers(sourceId: string, excludeLayerId: string): boolean {
		return layers.some((entry) => {
			if (entry.definition.id === excludeLayerId) {
				return false;
			}
			if (isMapLibreLayerDefinition(entry.definition)) {
				return entry.definition.source?.id === sourceId;
			}
			if (isCustomLayerDefinition(entry.definition)) {
				return entry.definition.sourceIds?.includes(sourceId);
			}
			return false;
		});
	}

	function removeSourceFromMap(map: MapLibreMap, def: MapLibreLayerDefinition): void {
		if (!def.source) {
			return;
		}

		const sourceStillUsed = isSourceUsedByOtherLayers(def.source.id, def.id);
		if (!sourceStillUsed && map.getSource(def.source.id)) {
			try {
				map.removeSource(def.source.id);
			} catch {
				// Ignore removal errors
			}
		}
	}

	async function unapplyMapLibreLayer(def: MapLibreLayerDefinition): Promise<void> {
		const map = getMap();
		if (!map) {
			return;
		}

		removeLayersFromMap(map, def.layers);
		removeSourceFromMap(map, def);
	}

	async function applyCustomLayer(def: CustomLayerDefinition, state: LayerState): Promise<void> {
		const ctx = createHandlerContext(def.id);
		if (!ctx) {
			return;
		}

		try {
			await def.apply(ctx);

			// Apply visibility if handler exists
			if (!state.visible && def.setVisibility) {
				def.setVisibility(ctx, false);
			}

			// Apply opacity if handler exists
			if (state.opacity !== 1 && def.setOpacity) {
				def.setOpacity(ctx, state.opacity);
			}
		} catch (error) {
			state.error = `Failed to apply: ${error instanceof Error ? error.message : String(error)}`;
			throw error;
		}
	}

	async function unapplyCustomLayer(def: CustomLayerDefinition): Promise<void> {
		const ctx = createHandlerContext(def.id);
		if (!ctx) {
			return;
		}

		try {
			await def.remove(ctx);
		} catch {
			// Ignore removal errors
		}
	}

	function findBeforeId(targetOrder: number): string | undefined {
		// Find the first layer with higher order that is applied
		for (let i = targetOrder + 1; i < layers.length; i++) {
			const entry = layers[i];
			if (entry?.state.applied) {
				const def = entry.definition;
				if (isMapLibreLayerDefinition(def) && def.layers.length > 0) {
					return def.layers[0]?.id;
				}
				if (isCustomLayerDefinition(def) && def.managedLayerIds?.length) {
					return def.managedLayerIds[0];
				}
			}
		}
		return undefined;
	}

	function applyOpacityToMapLibreLayer(map: MapLibreMap, layerId: string, opacity: number): void {
		const layer = map.getLayer(layerId);
		if (!layer) {
			return;
		}

		// Apply opacity based on layer type
		const type = layer.type;
		try {
			switch (type) {
				case "fill":
					map.setPaintProperty(layerId, "fill-opacity", opacity);
					break;
				case "line":
					map.setPaintProperty(layerId, "line-opacity", opacity);
					break;
				case "circle":
					map.setPaintProperty(layerId, "circle-opacity", opacity);
					break;
				case "symbol": {
					map.setPaintProperty(layerId, "icon-opacity", opacity);
					map.setPaintProperty(layerId, "text-opacity", opacity);
					break;
				}
				case "raster":
					map.setPaintProperty(layerId, "raster-opacity", opacity);
					break;
				case "fill-extrusion":
					map.setPaintProperty(layerId, "fill-extrusion-opacity", opacity);
					break;
				case "heatmap":
					map.setPaintProperty(layerId, "heatmap-opacity", opacity);
					break;
				case "hillshade":
					map.setPaintProperty(layerId, "hillshade-exaggeration", opacity);
					break;
				// background and sky don't have opacity
			}
		} catch {
			// Ignore opacity errors
		}
	}

	// ==========================================================================
	// Registry Operations
	// ==========================================================================

	function registerLayer(definition: LayerDefinition, options?: RegisterLayerOptions): void {
		if (layerMap.has(definition.id)) {
			throw new Error(`[@mapwise/core] Layer "${definition.id}" already exists`);
		}

		const insertIndex = resolveInsertIndex(options?.position);
		const state = createLayerState(definition, insertIndex, options);
		const entry: InternalLayerEntry = { definition, state };

		// Insert at position
		layers.splice(insertIndex, 0, entry);
		layerMap.set(definition.id, entry);

		// Update order for all layers
		updateOrder();

		// Apply if map is ready
		const map = getMap();
		if (map) {
			applyLayer(entry)
				.then(() => {
					entry.state.applied = true;
					emitStateChange(entry, "added");
				})
				.catch(() => {
					emitStateChange(entry, "error");
				});
		}
	}

	function removeLayer(id: string): boolean {
		const entry = layerMap.get(id);
		if (!entry) {
			return false;
		}

		// Unapply from map
		if (entry.state.applied) {
			unapplyLayer(entry);
		}

		// Remove from registry
		const index = layers.indexOf(entry);
		if (index >= 0) {
			layers.splice(index, 1);
		}
		layerMap.delete(id);

		// Update order
		updateOrder();

		eventBus.emit("layer:removed", { layerId: id });
		return true;
	}

	function moveLayer(id: string, position: LayerPosition): boolean {
		const entry = layerMap.get(id);
		if (!entry) {
			return false;
		}

		// Remove from current position
		const currentIndex = layers.indexOf(entry);
		if (currentIndex >= 0) {
			layers.splice(currentIndex, 1);
		}

		// Insert at new position
		const newIndex = resolveInsertIndex(position);
		layers.splice(newIndex, 0, entry);

		// Update order
		updateOrder();

		// Reorder on map if applied
		if (entry.state.applied) {
			reorderLayerOnMap(entry);
		}

		return true;
	}

	function moveMapLibreLayersOnMap(
		map: MapLibreMap,
		def: MapLibreLayerDefinition,
		beforeId: string | undefined,
	): void {
		for (const layerSpec of def.layers) {
			if (map.getLayer(layerSpec.id)) {
				map.moveLayer(layerSpec.id, beforeId);
			}
		}
	}

	function moveCustomLayersOnMap(
		map: MapLibreMap,
		layerIds: string[],
		beforeId: string | undefined,
	): void {
		for (const layerId of layerIds) {
			if (map.getLayer(layerId)) {
				map.moveLayer(layerId, beforeId);
			}
		}
	}

	function reorderLayerOnMap(entry: InternalLayerEntry): void {
		const map = getMap();
		if (!map) {
			return;
		}

		const def = entry.definition;
		const beforeId = findBeforeId(entry.state.order);

		if (isMapLibreLayerDefinition(def)) {
			moveMapLibreLayersOnMap(map, def, beforeId);
		} else if (isCustomLayerDefinition(def) && def.managedLayerIds) {
			moveCustomLayersOnMap(map, def.managedLayerIds, beforeId);
		}
	}

	function applyVisibilityToMapLibreLayers(
		map: MapLibreMap,
		def: MapLibreLayerDefinition,
		visibility: "visible" | "none",
	): void {
		for (const layerSpec of def.layers) {
			if (map.getLayer(layerSpec.id)) {
				map.setLayoutProperty(layerSpec.id, "visibility", visibility);
			}
		}
	}

	function applyVisibilityToCustomLayer(def: CustomLayerDefinition, visible: boolean): void {
		if (!def.setVisibility) {
			return;
		}
		const ctx = createHandlerContext(def.id);
		if (ctx) {
			def.setVisibility(ctx, visible);
		}
	}

	function applyVisibilityToEntry(
		map: MapLibreMap,
		entry: InternalLayerEntry,
		visible: boolean,
	): void {
		const visibility = visible ? "visible" : "none";
		const def = entry.definition;

		if (isMapLibreLayerDefinition(def)) {
			applyVisibilityToMapLibreLayers(map, def, visibility);
		} else if (isCustomLayerDefinition(def)) {
			applyVisibilityToCustomLayer(def, visible);
		}
	}

	function setVisibility(id: string, visible: boolean): boolean {
		const entry = layerMap.get(id);
		if (!entry) {
			return false;
		}

		entry.state.visible = visible;

		const map = getMap();
		if (map && entry.state.applied) {
			applyVisibilityToEntry(map, entry, visible);
		}

		eventBus.emit("layer:visibility", { layerId: id, visible });
		return true;
	}

	function applyOpacityToAllMapLibreLayers(
		map: MapLibreMap,
		def: MapLibreLayerDefinition,
		opacity: number,
	): void {
		for (const layerSpec of def.layers) {
			applyOpacityToMapLibreLayer(map, layerSpec.id, opacity);
		}
	}

	function applyOpacityToCustomLayer(def: CustomLayerDefinition, opacity: number): void {
		if (!def.setOpacity) {
			return;
		}
		const ctx = createHandlerContext(def.id);
		if (ctx) {
			def.setOpacity(ctx, opacity);
		}
	}

	function applyOpacityToEntry(map: MapLibreMap, entry: InternalLayerEntry, opacity: number): void {
		const def = entry.definition;

		if (isMapLibreLayerDefinition(def)) {
			applyOpacityToAllMapLibreLayers(map, def, opacity);
		} else if (isCustomLayerDefinition(def)) {
			applyOpacityToCustomLayer(def, opacity);
		}
	}

	function setOpacity(id: string, opacity: number): boolean {
		const entry = layerMap.get(id);
		if (!entry) {
			return false;
		}

		const clampedOpacity = Math.max(0, Math.min(1, opacity));
		entry.state.opacity = clampedOpacity;

		const map = getMap();
		if (map && entry.state.applied) {
			applyOpacityToEntry(map, entry, clampedOpacity);
		}

		return true;
	}

	function hasLayer(id: string): boolean {
		return layerMap.has(id);
	}

	function getLayerState(id: string): LayerState | undefined {
		const entry = layerMap.get(id);
		return entry ? { ...entry.state } : undefined;
	}

	function getAllLayers(): LayerState[] {
		return layers.map((entry) => ({ ...entry.state }));
	}

	function getLayersByCategory(category: LayerCategory): LayerState[] {
		return layers
			.filter((entry) => entry.state.category === category)
			.map((entry) => ({ ...entry.state }));
	}

	// ==========================================================================
	// Apply/Unapply All
	// ==========================================================================

	async function applyLayer(entry: InternalLayerEntry): Promise<void> {
		const def = entry.definition;

		if (isMapLibreLayerDefinition(def)) {
			await applyMapLibreLayer(def, entry.state);
		} else if (isCustomLayerDefinition(def)) {
			await applyCustomLayer(def, entry.state);
		}

		entry.state.applied = true;
		entry.state.error = undefined;
	}

	async function unapplyLayer(entry: InternalLayerEntry): Promise<void> {
		const def = entry.definition;

		if (isMapLibreLayerDefinition(def)) {
			await unapplyMapLibreLayer(def);
		} else if (isCustomLayerDefinition(def)) {
			await unapplyCustomLayer(def);
		}

		entry.state.applied = false;
	}

	function emitLayerApplyError(entry: InternalLayerEntry, error: unknown): void {
		eventBus.emit("map:error", {
			code: "LAYER_APPLY_FAILED",
			message: `Failed to apply layer "${entry.definition.id}": ${error instanceof Error ? error.message : String(error)}`,
			recoverable: true,
			originalError: error instanceof Error ? error : undefined,
		});
	}

	async function applyAll(): Promise<void> {
		for (const entry of layers) {
			if (entry.state.applied) {
				continue;
			}

			try {
				await applyLayer(entry);
			} catch (error) {
				emitLayerApplyError(entry, error);
			}
		}
	}

	async function unapplyAll(): Promise<void> {
		// Unapply in reverse order (top to bottom)
		for (let i = layers.length - 1; i >= 0; i--) {
			const entry = layers[i];
			if (entry?.state.applied) {
				try {
					await unapplyLayer(entry);
				} catch {
					// Ignore unapply errors
				}
			}
		}
	}

	function clear(): void {
		// Unapply all first
		unapplyAll();

		// Clear collections
		layers.length = 0;
		layerMap.clear();
	}

	// ==========================================================================
	// Return Interface
	// ==========================================================================

	return {
		registerLayer,
		removeLayer,
		moveLayer,
		setVisibility,
		setOpacity,
		hasLayer,
		getLayerState,
		getAllLayers,
		getLayersByCategory,
		get count() {
			return layers.length;
		},
		applyAll,
		unapplyAll,
		clear,
	};
}
