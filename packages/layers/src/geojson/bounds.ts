/**
 * GeoJSON bounds utilities.
 *
 * @module geojson/bounds
 */

import type { BBox, Feature, FeatureCollection, Geometry, Position } from "geojson";

// =============================================================================
// Bounds Calculation
// =============================================================================

/**
 * Calculates the bounding box for GeoJSON data.
 * Pure function - returns bounds as [minX, minY, maxX, maxY].
 *
 * @param data - GeoJSON FeatureCollection, Feature, or Geometry
 * @returns Bounding box [minX, minY, maxX, maxY] or null if no coordinates
 */
export function getGeoJsonBounds(
	data: FeatureCollection | Feature | Geometry,
): [number, number, number, number] | null {
	let coordinates: Position[] = [];

	// Extract coordinates based on input type
	if (data.type === "FeatureCollection") {
		for (const feature of data.features) {
			const coords = extractCoordinates(feature.geometry);
			coordinates = coordinates.concat(coords);
		}
	} else if (data.type === "Feature") {
		coordinates = extractCoordinates(data.geometry);
	} else {
		coordinates = extractCoordinates(data);
	}

	if (coordinates.length === 0) {
		return null;
	}

	// Calculate bounds
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const coord of coordinates) {
		const [lng, lat] = coord;
		if (typeof lng === "number" && typeof lat === "number") {
			minX = Math.min(minX, lng);
			minY = Math.min(minY, lat);
			maxX = Math.max(maxX, lng);
			maxY = Math.max(maxY, lat);
		}
	}

	if (!(Number.isFinite(minX) && Number.isFinite(minY))) {
		return null;
	}

	return [minX, minY, maxX, maxY];
}

/**
 * Extracts all coordinates from a geometry.
 */
function extractCoordinates(geometry: Geometry | null): Position[] {
	if (!geometry) {
		return [];
	}

	switch (geometry.type) {
		case "Point":
			return [geometry.coordinates];
		case "LineString":
		case "MultiPoint":
			return geometry.coordinates;
		case "Polygon":
		case "MultiLineString":
			return geometry.coordinates.flat();
		case "MultiPolygon":
			return geometry.coordinates.flat(2);
		case "GeometryCollection":
			return geometry.geometries.flatMap(extractCoordinates);
		default:
			return [];
	}
}

/**
 * Fits the map viewport to GeoJSON bounds with optional padding.
 *
 * @param map - MapLibre map instance
 * @param data - GeoJSON FeatureCollection, Feature, or Geometry
 * @param padding - Padding in pixels (default: 50)
 * @returns true if bounds were fit, false if bounds couldn't be calculated
 */
export function fitToGeoJson(
	map: { fitBounds: (bounds: BBox, options?: { padding?: number }) => void },
	data: FeatureCollection | Feature | Geometry,
	padding = 50,
): boolean {
	const bounds = getGeoJsonBounds(data);
	if (!bounds) {
		return false;
	}

	try {
		map.fitBounds(bounds, { padding });
		return true;
	} catch {
		return false;
	}
}
