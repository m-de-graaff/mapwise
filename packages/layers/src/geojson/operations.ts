/**
 * Runtime operations for GeoJSON layers.
 *
 * @module geojson/operations
 */

import type { FeatureCollection, Geometry } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import { fetchText } from "../shared/network";
import type { FeatureState, GeoJsonData } from "./types";

// =============================================================================
// Set Data Operation
// =============================================================================

/**
 * Updates the GeoJSON data for a layer source.
 *
 * @param map - MapLibre map instance
 * @param sourceId - Source ID to update
 * @param data - New GeoJSON data (object or URL string)
 * @returns Promise resolving when data is updated
 */
export async function setData(
	map: MapLibreMap,
	sourceId: string,
	data: GeoJsonData,
): Promise<void> {
	const source = map.getSource(sourceId);
	if (!source || source.type !== "geojson") {
		throw new Error(`Source "${sourceId}" is not a GeoJSON source`);
	}

	// Fetch data if URL
	let geoJsonData: FeatureCollection | Geometry;
	if (typeof data === "string") {
		const response = await fetchText(data);
		try {
			geoJsonData = JSON.parse(response) as FeatureCollection | Geometry;
		} catch {
			throw new Error(`Failed to parse GeoJSON from URL: ${data}`);
		}
	} else {
		geoJsonData = data;
	}

	// Update source data
	const geoJsonSource = source as { setData?: (data: FeatureCollection | Geometry) => void };
	if (geoJsonSource.setData) {
		geoJsonSource.setData(geoJsonData);
	} else {
		throw new Error(`GeoJSON source "${sourceId}" does not support setData`);
	}
}

// =============================================================================
// Feature State Operations
// =============================================================================

/**
 * Sets feature state for selection/hover effects.
 *
 * @param map - MapLibre map instance
 * @param sourceId - Source ID
 * @param featureId - Feature ID (string or number)
 * @param state - Feature state object
 */
export function setFeatureState(
	map: MapLibreMap,
	sourceId: string,
	featureId: string | number,
	state: FeatureState,
): void {
	map.setFeatureState(
		{
			source: sourceId,
			id: featureId,
		},
		state,
	);
}

/**
 * Gets current feature state.
 *
 * @param map - MapLibre map instance
 * @param sourceId - Source ID
 * @param featureId - Feature ID (string or number)
 * @returns Current feature state or null if not found
 */
export function getFeatureState(
	map: MapLibreMap,
	sourceId: string,
	featureId: string | number,
): Record<string, unknown> | null {
	try {
		return map.getFeatureState({
			source: sourceId,
			id: featureId,
		}) as Record<string, unknown>;
	} catch {
		return null;
	}
}

/**
 * Removes feature state (clears selection/hover).
 *
 * @param map - MapLibre map instance
 * @param sourceId - Source ID
 * @param featureId - Feature ID (string or number)
 */
export function removeFeatureState(
	map: MapLibreMap,
	sourceId: string,
	featureId: string | number,
): void {
	try {
		map.removeFeatureState({
			source: sourceId,
			id: featureId,
		});
	} catch {
		// Ignore errors (feature might not exist)
	}
}
