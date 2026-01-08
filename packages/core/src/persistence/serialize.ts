/**
 * State serialization for map persistence.
 *
 * @module persistence/serialize
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import type { StyleManager } from "../map/style-manager";
import type { LayerRegistry } from "../registry/layer-registry";
import type { PluginManager } from "../registry/plugin-registry";
import type { PluginState } from "../registry/plugin-types";
import type { LayerState } from "../registry/registry-types";
import {
	type PersistedLayerState,
	type PersistedMapState,
	type PersistedPluginState,
	type PersistedViewport,
	SCHEMA_VERSION,
	type SerializeOptions,
} from "./persistence-types";

// =============================================================================
// Serialization Context
// =============================================================================

export interface SerializationContext {
	map: MapLibreMap | null;
	styleManager: StyleManager;
	layerRegistry: LayerRegistry;
	pluginManager: PluginManager;
	getPluginStateStore: (pluginId: string) => Map<string, unknown> | undefined;
}

// =============================================================================
// Main Serialization Function
// =============================================================================

/**
 * Serialize the current map state to a persistable format.
 *
 * @param ctx - Serialization context with access to map components
 * @param options - Serialization options
 * @returns Serialized map state
 */
export function serializeState(
	ctx: SerializationContext,
	options: SerializeOptions = {},
): PersistedMapState {
	const {
		includePlugins = true,
		includeViewport = true,
		includeLayerState = true,
		custom,
		name,
		description,
		layerFilter,
		pluginFilter,
	} = options;

	// Get current basemap
	const basemap = ctx.styleManager.currentStyle ?? "";

	// Get viewport
	const viewport = includeViewport ? serializeViewport(ctx.map) : getDefaultViewport();

	// Get layers
	const layers = serializeLayers(ctx.layerRegistry, {
		includeState: includeLayerState,
		filter: layerFilter,
	});

	// Get plugins
	const plugins = includePlugins
		? serializePlugins(ctx.pluginManager, ctx.getPluginStateStore, {
				filter: pluginFilter,
			})
		: [];

	const state: PersistedMapState = {
		version: SCHEMA_VERSION,
		timestamp: Date.now(),
		basemap,
		viewport,
		layers,
		plugins,
	};

	if (name) {
		state.name = name;
	}
	if (description) {
		state.description = description;
	}
	if (custom) {
		state.custom = custom;
	}

	return state;
}

// =============================================================================
// Viewport Serialization
// =============================================================================

function serializeViewport(map: MapLibreMap | null): PersistedViewport {
	if (!map) {
		return getDefaultViewport();
	}

	const center = map.getCenter();
	const bounds = map.getBounds();

	const viewport: PersistedViewport = {
		center: [center.lng, center.lat],
		zoom: map.getZoom(),
		bearing: map.getBearing(),
		pitch: map.getPitch(),
	};

	if (bounds) {
		viewport.bounds = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
	}

	return viewport;
}

function getDefaultViewport(): PersistedViewport {
	return {
		center: [0, 0],
		zoom: 2,
		bearing: 0,
		pitch: 0,
	};
}

// =============================================================================
// Layer Serialization
// =============================================================================

interface LayerSerializeOptions {
	includeState: boolean;
	filter: ((layerId: string) => boolean) | undefined;
}

function serializeLayers(
	registry: LayerRegistry,
	options: LayerSerializeOptions,
): PersistedLayerState[] {
	const { includeState, filter } = options;

	const allLayers = registry.getAllLayers();

	return allLayers
		.filter((layer) => !filter || filter(layer.id))
		.map((layer, index) => serializeLayer(layer, index, includeState));
}

function serializeLayer(
	layer: LayerState,
	order: number,
	includeState: boolean,
): PersistedLayerState {
	const persisted: PersistedLayerState = {
		id: layer.id,
		type: layer.type === "maplibre" ? "maplibre" : "custom",
		visible: includeState ? layer.visible : true,
		opacity: includeState ? layer.opacity : 1,
		order,
		category: layer.category,
	};

	// Include metadata if present
	if (layer.metadata) {
		persisted.metadata = serializeMetadata(layer.metadata as Record<string, unknown>);
	}

	// Note: Full layer definitions (layerSpecs, sources) are not available in LayerState
	// They would need to be stored separately or the layer re-registered on hydration

	return persisted;
}

function serializeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
	// Filter out non-serializable values
	const result: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(metadata)) {
		if (isSerializable(value)) {
			result[key] = value;
		}
	}

	return result;
}

// =============================================================================
// Plugin Serialization
// =============================================================================

interface PluginSerializeOptions {
	filter: ((pluginId: string) => boolean) | undefined;
}

function serializePlugins(
	manager: PluginManager,
	getStateStore: (pluginId: string) => Map<string, unknown> | undefined,
	options: PluginSerializeOptions,
): PersistedPluginState[] {
	const { filter } = options;

	const allPlugins = manager.getAllPlugins();

	return allPlugins
		.filter((plugin) => !filter || filter(plugin.id))
		.map((plugin) => serializePlugin(plugin, getStateStore))
		.filter((p): p is PersistedPluginState => p !== null);
}

function serializePlugin(
	plugin: PluginState,
	getStateStore: (pluginId: string) => Map<string, unknown> | undefined,
): PersistedPluginState | null {
	const stateStore = getStateStore(plugin.id);

	if (!stateStore || stateStore.size === 0) {
		// No state to persist
		return null;
	}

	// Get persistable keys from plugin definition
	// For now, persist all serializable keys
	const state: Record<string, unknown> = {};

	for (const [key, value] of stateStore.entries()) {
		if (isSerializable(value)) {
			state[key] = value;
		}
	}

	if (Object.keys(state).length === 0) {
		return null;
	}

	return {
		id: plugin.id,
		version: plugin.version,
		state,
	};
}

// =============================================================================
// Serialization Helpers
// =============================================================================

function isSerializablePrimitive(value: unknown): boolean | null {
	if (value === null || value === undefined) {
		return true;
	}

	const type = typeof value;

	if (type === "string" || type === "number" || type === "boolean") {
		return true;
	}

	if (type === "function" || type === "symbol" || type === "bigint") {
		return false;
	}

	return null; // Not a primitive, needs further checking
}

function isSerializableObject(value: object): boolean {
	if (value instanceof Map || value instanceof Set || value instanceof WeakMap) {
		return false;
	}
	if (value instanceof Date) {
		return true;
	}
	if (value instanceof Error || value instanceof RegExp) {
		return false;
	}

	try {
		const obj = value as Record<string, unknown>;
		return Object.values(obj).every(isSerializable);
	} catch {
		return false;
	}
}

/**
 * Check if a value is JSON-serializable.
 */
function isSerializable(value: unknown): boolean {
	const primitiveResult = isSerializablePrimitive(value);
	if (primitiveResult !== null) {
		return primitiveResult;
	}

	if (Array.isArray(value)) {
		return value.every(isSerializable);
	}

	if (typeof value === "object" && value !== null) {
		return isSerializableObject(value);
	}

	return false;
}

/**
 * Create a deep clone of serializable data.
 */
export function deepClone<T>(value: T): T {
	if (value === null || value === undefined) {
		return value;
	}

	// Use JSON round-trip for deep cloning
	return JSON.parse(JSON.stringify(value));
}
