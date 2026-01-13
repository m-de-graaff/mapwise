import type { Feature, FeatureCollection, Geometry } from "geojson";
import { describe, expect, it, vi } from "vitest";
import { fitToGeoJson, getGeoJsonBounds } from "./bounds.js";

describe("GeoJSON Bounds Utilities", () => {
	describe("getGeoJsonBounds", () => {
		it("should calculate bounds for a Point", () => {
			const point: Geometry = {
				type: "Point",
				coordinates: [100, 50],
			};
			const bounds = getGeoJsonBounds(point);
			expect(bounds).toEqual([100, 50, 100, 50]);
		});

		it("should calculate bounds for a LineString", () => {
			const line: Geometry = {
				type: "LineString",
				coordinates: [
					[100, 50],
					[101, 51],
					[102, 52],
				],
			};
			const bounds = getGeoJsonBounds(line);
			expect(bounds).toEqual([100, 50, 102, 52]);
		});

		it("should calculate bounds for a Polygon", () => {
			const polygon: Geometry = {
				type: "Polygon",
				coordinates: [
					[
						[100, 50],
						[101, 50],
						[101, 51],
						[100, 51],
						[100, 50],
					],
				],
			};
			const bounds = getGeoJsonBounds(polygon);
			expect(bounds).toEqual([100, 50, 101, 51]);
		});

		it("should calculate bounds for a FeatureCollection", () => {
			const collection: FeatureCollection = {
				type: "FeatureCollection",
				features: [
					{
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [100, 50],
						},
						properties: {},
					},
					{
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: [102, 52],
						},
						properties: {},
					},
				],
			};
			const bounds = getGeoJsonBounds(collection);
			expect(bounds).toEqual([100, 50, 102, 52]);
		});

		it("should calculate bounds for a MultiPoint", () => {
			const multiPoint: Geometry = {
				type: "MultiPoint",
				coordinates: [
					[100, 50],
					[101, 51],
					[102, 52],
				],
			};
			const bounds = getGeoJsonBounds(multiPoint);
			expect(bounds).toEqual([100, 50, 102, 52]);
		});

		it("should calculate bounds for a MultiLineString", () => {
			const multiLine: Geometry = {
				type: "MultiLineString",
				coordinates: [
					[
						[100, 50],
						[101, 51],
					],
					[
						[102, 52],
						[103, 53],
					],
				],
			};
			const bounds = getGeoJsonBounds(multiLine);
			expect(bounds).toEqual([100, 50, 103, 53]);
		});

		it("should calculate bounds for a MultiPolygon", () => {
			const multiPolygon: Geometry = {
				type: "MultiPolygon",
				coordinates: [
					[
						[
							[100, 50],
							[101, 50],
							[101, 51],
							[100, 51],
							[100, 50],
						],
					],
					[
						[
							[102, 52],
							[103, 52],
							[103, 53],
							[102, 53],
							[102, 52],
						],
					],
				],
			};
			const bounds = getGeoJsonBounds(multiPolygon);
			expect(bounds).toEqual([100, 50, 103, 53]);
		});

		it("should return null for empty FeatureCollection", () => {
			const collection: FeatureCollection = {
				type: "FeatureCollection",
				features: [],
			};
			const bounds = getGeoJsonBounds(collection);
			expect(bounds).toBeNull();
		});

		it("should handle GeometryCollection", () => {
			const geometryCollection: Geometry = {
				type: "GeometryCollection",
				geometries: [
					{
						type: "Point",
						coordinates: [100, 50],
					},
					{
						type: "Point",
						coordinates: [102, 52],
					},
				],
			};
			const bounds = getGeoJsonBounds(geometryCollection);
			expect(bounds).toEqual([100, 50, 102, 52]);
		});

		it("should handle Feature", () => {
			const feature: Feature = {
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [100, 50],
				},
				properties: {},
			};
			const bounds = getGeoJsonBounds(feature);
			expect(bounds).toEqual([100, 50, 100, 50]);
		});
	});

	describe("fitToGeoJson", () => {
		it("should fit map bounds to GeoJSON", () => {
			const mockMap = {
				fitBounds: vi.fn(),
			};

			const point: Geometry = {
				type: "Point",
				coordinates: [100, 50],
			};

			const result = fitToGeoJson(
				mockMap as unknown as Parameters<typeof fitToGeoJson>[0],
				point,
				50,
			);

			expect(result).toBe(true);
			expect(mockMap.fitBounds).toHaveBeenCalledWith([100, 50, 100, 50], { padding: 50 });
		});

		it("should return false if bounds cannot be calculated", () => {
			const mockMap = {
				fitBounds: vi.fn(),
			};

			const emptyCollection: FeatureCollection = {
				type: "FeatureCollection",
				features: [],
			};

			const result = fitToGeoJson(
				mockMap as unknown as Parameters<typeof fitToGeoJson>[0],
				emptyCollection,
			);

			expect(result).toBe(false);
			expect(mockMap.fitBounds).not.toHaveBeenCalled();
		});

		it("should handle fitBounds errors gracefully", () => {
			const mockMap = {
				fitBounds: vi.fn(() => {
					throw new Error("Map not ready");
				}),
			};

			const point: Geometry = {
				type: "Point",
				coordinates: [100, 50],
			};

			const result = fitToGeoJson(mockMap as unknown as Parameters<typeof fitToGeoJson>[0], point);

			expect(result).toBe(false);
		});

		it("should use default padding if not provided", () => {
			const mockMap = {
				fitBounds: vi.fn(),
			};

			const point: Geometry = {
				type: "Point",
				coordinates: [100, 50],
			};

			fitToGeoJson(mockMap as unknown as Parameters<typeof fitToGeoJson>[0], point);

			expect(mockMap.fitBounds).toHaveBeenCalledWith([100, 50, 100, 50], { padding: 50 });
		});
	});
});
