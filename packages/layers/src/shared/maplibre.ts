/**
 * MapLibre GL JS helper utilities for layer implementations.
 *
 * @module shared/maplibre
 */

import type { LayerSpecification, Map as MapLibreMap, SourceSpecification } from "maplibre-gl";

// =============================================================================
// Types
// =============================================================================

export interface MapLibreError {
	code:
		| "MAP_NOT_READY"
		| "SOURCE_EXISTS"
		| "LAYER_EXISTS"
		| "SOURCE_NOT_FOUND"
		| "LAYER_NOT_FOUND"
		| "INVALID_SOURCE"
		| "INVALID_LAYER"
		| "UNSUPPORTED_LAYER_TYPE";
	message: string;
	sourceId?: string;
	layerId?: string;
	context?: Record<string, unknown>;
	cause?: unknown;
}

// =============================================================================
// MapLibre Helpers
// =============================================================================

/**
 * Ensures a source exists on the map, adding it if it doesn't exist.
 *
 * @param map - MapLibre map instance
 * @param id - Source ID
 * @param sourceSpec - Source specification
 * @returns true if source was added, false if it already existed
 * @throws MapLibreError if operation fails
 */
export function ensureSource(
	map: MapLibreMap,
	id: string,
	sourceSpec: SourceSpecification,
): boolean {
	if (!map) {
		const error: MapLibreError = {
			code: "MAP_NOT_READY",
			message: "Map instance is not available",
		};
		throw error;
	}

	if (map.getSource(id)) {
		return false; // Source already exists
	}

	try {
		map.addSource(id, sourceSpec);
		return true; // Source was added
	} catch (error) {
		const mapLibreError: MapLibreError = {
			code: "INVALID_SOURCE",
			message: `Failed to add source "${id}": ${error instanceof Error ? error.message : String(error)}`,
			sourceId: id,
			cause: error,
		};
		throw mapLibreError;
	}
}

/**
 * Ensures a layer exists on the map, adding it if it doesn't exist.
 *
 * @param map - MapLibre map instance
 * @param layerSpec - Layer specification
 * @param beforeId - Optional layer ID to insert before
 * @returns true if layer was added, false if it already existed
 * @throws MapLibreError if operation fails
 */
export function ensureLayer(
	map: MapLibreMap,
	layerSpec: LayerSpecification,
	beforeId?: string,
): boolean {
	if (!map) {
		const error: MapLibreError = {
			code: "MAP_NOT_READY",
			message: "Map instance is not available",
		};
		throw error;
	}

	if (map.getLayer(layerSpec.id)) {
		return false; // Layer already exists
	}

	try {
		map.addLayer(layerSpec, beforeId);
		return true; // Layer was added
	} catch (error) {
		const mapLibreError: MapLibreError = {
			code: "INVALID_LAYER",
			message: `Failed to add layer "${layerSpec.id}": ${error instanceof Error ? error.message : String(error)}`,
			layerId: layerSpec.id,
			cause: error,
		};
		throw mapLibreError;
	}
}

/**
 * Safely removes a layer from the map if it exists.
 *
 * @param map - MapLibre map instance
 * @param layerId - Layer ID to remove
 * @returns true if layer was removed, false if it didn't exist
 */
export function removeLayerSafe(map: MapLibreMap, layerId: string): boolean {
	if (!map) {
		return false;
	}

	if (!map.getLayer(layerId)) {
		return false; // Layer doesn't exist
	}

	try {
		map.removeLayer(layerId);
		return true; // Layer was removed
	} catch {
		// Ignore errors (layer might have been removed already)
		return false;
	}
}

/**
 * Safely removes a source from the map if it exists.
 *
 * @param map - MapLibre map instance
 * @param sourceId - Source ID to remove
 * @returns true if source was removed, false if it didn't exist
 */
export function removeSourceSafe(map: MapLibreMap, sourceId: string): boolean {
	if (!map) {
		return false;
	}

	if (!map.getSource(sourceId)) {
		return false; // Source doesn't exist
	}

	try {
		map.removeSource(sourceId);
		return true; // Source was removed
	} catch {
		// Ignore errors (source might have been removed already or still in use)
		return false;
	}
}

/**
 * Sets layer opacity based on layer type.
 * Handles different layer types (raster, fill, line, circle, symbol, fill-extrusion, etc.).
 *
 * @param map - MapLibre map instance
 * @param layerId - Layer ID
 * @param opacity - Opacity value (0-1)
 * @param layerType - Optional layer type (auto-detected if not provided)
 * @returns true if opacity was set, false if layer doesn't exist
 */
export function setLayerOpacity(
	map: MapLibreMap,
	layerId: string,
	opacity: number,
	layerType?: LayerSpecification["type"],
): boolean {
	if (!map) {
		return false;
	}

	const layer = map.getLayer(layerId);
	if (!layer) {
		return false; // Layer doesn't exist
	}

	// Auto-detect layer type if not provided
	const type = layerType ?? layer.type;

	// Clamp opacity to valid range
	const clampedOpacity = Math.max(0, Math.min(1, opacity));

	try {
		// Set opacity based on layer type
		switch (type) {
			case "fill":
				map.setPaintProperty(layerId, "fill-opacity", clampedOpacity);
				break;
			case "line":
				map.setPaintProperty(layerId, "line-opacity", clampedOpacity);
				break;
			case "circle":
				map.setPaintProperty(layerId, "circle-opacity", clampedOpacity);
				break;
			case "symbol": {
				map.setPaintProperty(layerId, "icon-opacity", clampedOpacity);
				map.setPaintProperty(layerId, "text-opacity", clampedOpacity);
				break;
			}
			case "raster":
				map.setPaintProperty(layerId, "raster-opacity", clampedOpacity);
				break;
			case "fill-extrusion":
				map.setPaintProperty(layerId, "fill-extrusion-opacity", clampedOpacity);
				break;
			case "heatmap":
				map.setPaintProperty(layerId, "heatmap-opacity", clampedOpacity);
				break;
			case "hillshade":
				// Hillshade doesn't have opacity, use exaggeration instead
				map.setPaintProperty(layerId, "hillshade-exaggeration", clampedOpacity);
				break;
			default:
				// Unknown layer type - try raster-opacity as fallback
				try {
					map.setPaintProperty(layerId, "raster-opacity", clampedOpacity);
				} catch {
					// If that fails, try fill-opacity
					try {
						map.setPaintProperty(layerId, "fill-opacity", clampedOpacity);
					} catch {
						// If that also fails, opacity might not be supported
						return false;
					}
				}
				break;
		}
		return true;
	} catch {
		// Ignore errors (layer might not support opacity)
		return false;
	}
}
