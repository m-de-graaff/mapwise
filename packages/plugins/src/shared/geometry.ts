/**
 * Pure geometry helper functions.
 *
 * @module shared/geometry
 */

// GeoJSON geometry types (inlined to avoid external dependency)
export interface GeoJSONPoint {
	type: "Point";
	coordinates: [number, number];
}

export interface GeoJSONLineString {
	type: "LineString";
	coordinates: [number, number][];
}

export interface GeoJSONPolygon {
	type: "Polygon";
	coordinates: [number, number][][];
}

export interface GeoJSONMultiPoint {
	type: "MultiPoint";
	coordinates: [number, number][];
}

export interface GeoJSONMultiLineString {
	type: "MultiLineString";
	coordinates: [number, number][][];
}

export interface GeoJSONMultiPolygon {
	type: "MultiPolygon";
	coordinates: [number, number][][][];
}

export interface GeoJSONGeometryCollection {
	type: "GeometryCollection";
	geometries: GeoJSONGeometry[];
}

export type GeoJSONGeometry =
	| GeoJSONPoint
	| GeoJSONLineString
	| GeoJSONPolygon
	| GeoJSONMultiPoint
	| GeoJSONMultiLineString
	| GeoJSONMultiPolygon
	| GeoJSONGeometryCollection;

// =============================================================================
// Constants
// =============================================================================

/** Earth radius in meters (WGS84) */
const EARTH_RADIUS_METERS = 6_378_137;

// =============================================================================
// Distance Calculation
// =============================================================================

/**
 * Calculate the distance between two points in meters using the Haversine formula.
 *
 * @param point1 - First point [lng, lat]
 * @param point2 - Second point [lng, lat]
 * @returns Distance in meters
 */
export function distanceMeters(point1: [number, number], point2: [number, number]): number {
	const [lng1, lat1] = point1;
	const [lng2, lat2] = point2;

	const dLat = toRadians(lat2 - lat1);
	const dLon = toRadians(lng2 - lng1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate the total distance along a line in meters.
 *
 * @param line - LineString or array of [lng, lat] coordinates
 * @returns Total distance in meters
 */
export function distanceMetersLine(line: GeoJSONLineString | [number, number][]): number {
	const coordinates = Array.isArray(line) ? line : line.coordinates;

	if (coordinates.length < 2) {
		return 0;
	}

	let totalDistance = 0;
	for (let i = 0; i < coordinates.length - 1; i++) {
		const point1 = coordinates[i];
		const point2 = coordinates[i + 1];
		if (!(point1 && point2)) {
			continue;
		}
		totalDistance += distanceMeters(point1 as [number, number], point2 as [number, number]);
	}

	return totalDistance;
}

// =============================================================================
// Area Calculation
// =============================================================================

/**
 * Calculate the area of a polygon in square meters using spherical geometry.
 *
 * @param polygon - Polygon or array of rings (each ring is array of [lng, lat])
 * @returns Area in square meters
 */
export function areaSqMeters(polygon: GeoJSONPolygon | [number, number][][]): number {
	const coordinates = Array.isArray(polygon) ? polygon : polygon.coordinates;

	if (coordinates.length === 0) {
		return 0;
	}

	// Use the outer ring (first ring)
	const outerRing = coordinates[0];
	if (!outerRing || outerRing.length < 3) {
		return 0;
	}

	let totalArea = calculateRingArea(outerRing as [number, number][]);

	// Subtract area of holes
	for (let holeIndex = 1; holeIndex < coordinates.length; holeIndex++) {
		const hole = coordinates[holeIndex];
		if (!hole || hole.length < 3) {
			continue;
		}

		totalArea -= calculateRingArea(hole as [number, number][]);
	}

	return totalArea;
}

/**
 * Calculate the area of a ring (closed loop of coordinates).
 */
function calculateRingArea(ring: [number, number][]): number {
	let area = 0;
	for (let i = 0; i < ring.length - 1; i++) {
		const point1 = ring[i];
		const point2 = ring[i + 1];
		if (!(point1 && point2)) {
			continue;
		}

		const [lng1, lat1] = point1;
		const [lng2, lat2] = point2;

		area += toRadians(lng2 - lng1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
	}

	return Math.abs((area * (EARTH_RADIUS_METERS * EARTH_RADIUS_METERS)) / 2);
}

// =============================================================================
// Bounding Box
// =============================================================================

/**
 * Calculate bounding box for a set of coordinates.
 *
 * @param coordinates - Array of [lng, lat] coordinates
 * @returns Bounding box [minLng, minLat, maxLng, maxLat]
 */
export function bbox(coordinates: [number, number][]): [number, number, number, number] {
	if (coordinates.length === 0) {
		return [0, 0, 0, 0];
	}

	const first = coordinates[0];
	if (!first) {
		return [0, 0, 0, 0];
	}

	let minLng = first[0];
	let minLat = first[1];
	let maxLng = first[0];
	let maxLat = first[1];

	for (const [lng, lat] of coordinates) {
		minLng = Math.min(minLng, lng);
		minLat = Math.min(minLat, lat);
		maxLng = Math.max(maxLng, lng);
		maxLat = Math.max(maxLat, lat);
	}

	return [minLng, minLat, maxLng, maxLat];
}

/**
 * Calculate bounding box for a GeoJSON geometry.
 *
 * @param geometry - GeoJSON geometry
 * @returns Bounding box [minLng, minLat, maxLng, maxLat]
 */
export function bboxGeometry(geometry: GeoJSONGeometry): [number, number, number, number] {
	const coordinates = extractCoordinates(geometry);
	return bbox(coordinates);
}

// =============================================================================
// Point to Segment Distance
// =============================================================================

/**
 * Calculate the distance from a point to a line segment in meters.
 *
 * @param point - Point [lng, lat]
 * @param segmentStart - Line segment start [lng, lat]
 * @param segmentEnd - Line segment end [lng, lat]
 * @returns Distance in meters
 */
export function pointToSegmentDistanceMeters(
	point: [number, number],
	segmentStart: [number, number],
	segmentEnd: [number, number],
): number {
	// Convert to radians for calculations
	const [px, py] = [toRadians(point[0]), toRadians(point[1])];
	const [sx, sy] = [toRadians(segmentStart[0]), toRadians(segmentStart[1])];
	const [ex, ey] = [toRadians(segmentEnd[0]), toRadians(segmentEnd[1])];

	// Calculate vector from segment start to end
	const dx = ex - sx;
	const dy = ey - sy;

	// Calculate vector from segment start to point
	const pxRel = px - sx;
	const pyRel = py - sy;

	// Calculate dot product
	const dot = pxRel * dx + pyRel * dy;
	const lenSq = dx * dx + dy * dy;

	// Calculate parameter t (closest point on segment)
	let t = 0;
	if (lenSq > 0) {
		t = Math.max(0, Math.min(1, dot / lenSq));
	}

	// Calculate closest point on segment
	const closestLng = sx + t * dx;
	const closestLat = sy + t * dy;

	// Calculate distance from point to closest point on segment
	const closestPoint: [number, number] = [toDegrees(closestLng), toDegrees(closestLat)];
	return distanceMeters(point, closestPoint);
}

// =============================================================================
// Snap to Vertex
// =============================================================================

/**
 * Find the nearest vertex to a point within a tolerance distance.
 *
 * @param point - Point [lng, lat]
 * @param vertices - Array of vertices [lng, lat]
 * @param toleranceMeters - Maximum distance in meters to snap
 * @returns Nearest vertex within tolerance, or null if none found
 */
export function snapToVertex(
	point: [number, number],
	vertices: [number, number][],
	toleranceMeters: number,
): [number, number] | null {
	let nearestVertex: [number, number] | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;

	for (const vertex of vertices) {
		const distance = distanceMeters(point, vertex);
		if (distance < nearestDistance && distance <= toleranceMeters) {
			nearestDistance = distance;
			nearestVertex = vertex;
		}
	}

	return nearestVertex;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert degrees to radians.
 */
function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees.
 */
function toDegrees(radians: number): number {
	return radians * (180 / Math.PI);
}

/**
 * Extract all coordinates from a GeoJSON geometry.
 */
function extractCoordinates(geometry: GeoJSONGeometry): [number, number][] {
	switch (geometry.type) {
		case "Point":
			return [geometry.coordinates];
		case "LineString":
		case "MultiPoint":
			return [...geometry.coordinates];
		case "Polygon":
		case "MultiLineString":
			return geometry.coordinates.flat() as [number, number][];
		case "MultiPolygon":
			return geometry.coordinates.flat(2) as [number, number][];
		case "GeometryCollection":
			return geometry.geometries.flatMap(extractCoordinates);
	}
	return [];
}
