import { describe, expect, it } from "vitest";
import {
	areaSqMeters,
	bbox,
	bboxGeometry,
	distanceMeters,
	distanceMetersLine,
	pointToSegmentDistanceMeters,
	snapToVertex,
} from "./geometry";

// Simple GeoJSON types for testing
interface GeoJSONPoint {
	type: "Point";
	coordinates: [number, number];
}

interface GeoJSONLineString {
	type: "LineString";
	coordinates: [number, number][];
}

interface GeoJSONPolygon {
	type: "Polygon";
	coordinates: [number, number][][];
}

describe("Geometry Helpers", () => {
	describe("distanceMeters", () => {
		it("should calculate distance between two points", () => {
			// San Francisco to Los Angeles (approximately 559 km)
			const sf: [number, number] = [-122.4194, 37.7749];
			const la: [number, number] = [-118.2437, 34.0522];

			const distance = distanceMeters(sf, la);
			// Should be approximately 559,000 meters (allow 10km tolerance)
			expect(distance).toBeGreaterThan(549_000);
			expect(distance).toBeLessThan(569_000);
		});

		it("should return 0 for identical points", () => {
			const point: [number, number] = [0, 0];
			expect(distanceMeters(point, point)).toBe(0);
		});

		it("should handle short distances", () => {
			const point1: [number, number] = [0, 0];
			const point2: [number, number] = [0.001, 0.001];
			const distance = distanceMeters(point1, point2);
			expect(distance).toBeGreaterThan(0);
			expect(distance).toBeLessThan(200);
		});
	});

	describe("distanceMetersLine", () => {
		it("should calculate total distance along a line", () => {
			const line: [number, number][] = [
				[0, 0],
				[1, 0],
				[1, 1],
			];

			const distance = distanceMetersLine(line);
			expect(distance).toBeGreaterThan(0);
		});

		it("should return 0 for line with less than 2 points", () => {
			expect(distanceMetersLine([])).toBe(0);
			expect(distanceMetersLine([[0, 0]])).toBe(0);
		});

		it("should work with GeoJSON LineString", () => {
			const lineString: GeoJSONLineString = {
				type: "LineString",
				coordinates: [
					[0, 0],
					[1, 0],
					[1, 1],
				],
			};

			const distance = distanceMetersLine(lineString);
			expect(distance).toBeGreaterThan(0);
		});
	});

	describe("areaSqMeters", () => {
		it("should calculate area of a polygon", () => {
			// Small square polygon (approximately 1 degree)
			const polygon: [number, number][] = [
				[0, 0],
				[1, 0],
				[1, 1],
				[0, 1],
				[0, 0],
			];

			const area = areaSqMeters([polygon]);
			// Should be approximately 12,000 km² (allow large tolerance due to projection)
			expect(area).toBeGreaterThan(10_000_000_000);
		});

		it("should return 0 for polygon with less than 3 points", () => {
			expect(areaSqMeters([[[]]])).toBe(0);
			expect(areaSqMeters([[[0, 0]]])).toBe(0);
			expect(
				areaSqMeters([
					[
						[0, 0],
						[1, 0],
					],
				]),
			).toBe(0);
		});

		it("should work with GeoJSON Polygon", () => {
			const polygon: GeoJSONPolygon = {
				type: "Polygon",
				coordinates: [
					[
						[0, 0],
						[1, 0],
						[1, 1],
						[0, 1],
						[0, 0],
					],
				],
			};

			const area = areaSqMeters(polygon);
			expect(area).toBeGreaterThan(0);
		});

		it("should subtract hole area from polygon", () => {
			const polygon: GeoJSONPolygon = {
				type: "Polygon",
				coordinates: [
					// Outer ring
					[
						[0, 0],
						[2, 0],
						[2, 2],
						[0, 2],
						[0, 0],
					],
					// Inner hole
					[
						[0.5, 0.5],
						[1.5, 0.5],
						[1.5, 1.5],
						[0.5, 1.5],
						[0.5, 0.5],
					],
				],
			};

			const areaWithHole = areaSqMeters(polygon);
			const areaWithoutHole: GeoJSONPolygon = {
				type: "Polygon",
				coordinates: [polygon.coordinates[0] || []],
			};
			const areaNoHole = areaSqMeters(areaWithoutHole);

			expect(areaWithHole).toBeLessThan(areaNoHole);
		});
	});

	describe("bbox", () => {
		it("should calculate bounding box", () => {
			const coordinates: [number, number][] = [
				[-1, -1],
				[1, 1],
				[0, 0],
			];

			const result = bbox(coordinates);
			expect(result).toEqual([-1, -1, 1, 1]);
		});

		it("should handle empty array", () => {
			const result = bbox([]);
			expect(result).toEqual([0, 0, 0, 0]);
		});

		it("should handle single point", () => {
			const result = bbox([[5, 10]]);
			expect(result).toEqual([5, 10, 5, 10]);
		});
	});

	describe("bboxGeometry", () => {
		it("should calculate bbox for Point", () => {
			const geometry: GeoJSONPoint = {
				type: "Point",
				coordinates: [10, 20],
			};

			const result = bboxGeometry(geometry);
			expect(result).toEqual([10, 20, 10, 20]);
		});

		it("should calculate bbox for LineString", () => {
			const geometry: GeoJSONLineString = {
				type: "LineString",
				coordinates: [
					[0, 0],
					[1, 1],
					[2, 0],
				],
			};

			const result = bboxGeometry(geometry);
			expect(result).toEqual([0, 0, 2, 1]);
		});
	});

	describe("pointToSegmentDistanceMeters", () => {
		it("should calculate distance to segment", () => {
			const point: [number, number] = [0.5, 0.5];
			const start: [number, number] = [0, 0];
			const end: [number, number] = [1, 0];

			const distance = pointToSegmentDistanceMeters(point, start, end);
			expect(distance).toBeGreaterThan(0);
			expect(distance).toBeLessThan(100_000); // Less than 100km
		});

		it("should return 0 if point is on segment", () => {
			const point: [number, number] = [0.5, 0];
			const start: [number, number] = [0, 0];
			const end: [number, number] = [1, 0];

			const distance = pointToSegmentDistanceMeters(point, start, end);
			expect(distance).toBeLessThan(1); // Very small (numerical precision)
		});
	});

	describe("snapToVertex", () => {
		it("should find nearest vertex within tolerance", () => {
			const point: [number, number] = [0.01, 0.01];
			const vertices: [number, number][] = [
				[0, 0],
				[1, 1],
				[2, 2],
			];

			const snapped = snapToVertex(point, vertices, 2000); // 2km tolerance
			expect(snapped).toEqual([0, 0]);
		});

		it("should return null if no vertex within tolerance", () => {
			const point: [number, number] = [10, 10];
			const vertices: [number, number][] = [
				[0, 0],
				[1, 1],
			];

			const snapped = snapToVertex(point, vertices, 100); // Very small tolerance
			expect(snapped).toBeNull();
		});

		it("should return null for empty vertices", () => {
			const snapped = snapToVertex([0, 0], [], 1000);
			expect(snapped).toBeNull();
		});
	});
});
