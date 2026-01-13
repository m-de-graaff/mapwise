import { describe, expect, it } from "vitest";
import { createGeoJsonLayer, validateGeoJsonConfig } from "./geojson-layer.js";
import type { GeoJsonLayerConfig } from "./types.js";

describe("GeoJSON Layer", () => {
	describe("validateGeoJsonConfig", () => {
		it("should accept valid config with object data", () => {
			const config: GeoJsonLayerConfig = {
				id: "test-layer",
				data: {
					type: "FeatureCollection",
					features: [],
				},
			};
			expect(() => validateGeoJsonConfig(config)).not.toThrow();
		});

		it("should accept valid config with URL data", () => {
			const config: GeoJsonLayerConfig = {
				id: "test-layer",
				data: "https://example.com/data.geojson",
			};
			expect(() => validateGeoJsonConfig(config)).not.toThrow();
		});

		it("should reject config without data", () => {
			const config = {
				id: "test-layer",
			} as Partial<GeoJsonLayerConfig>;
			expect(() => validateGeoJsonConfig(config)).toThrow("requires 'data'");
		});

		it("should reject config with invalid data type", () => {
			const config = {
				id: "test-layer",
				data: 123,
			} as unknown as GeoJsonLayerConfig;
			expect(() => validateGeoJsonConfig(config)).toThrow("must be a FeatureCollection");
		});

		it("should reject config with invalid ID", () => {
			const config = {
				id: "",
				data: {
					type: "FeatureCollection",
					features: [],
				},
			} as GeoJsonLayerConfig;
			expect(() => validateGeoJsonConfig(config)).toThrow("Invalid");
		});
	});

	describe("createGeoJsonLayer", () => {
		it("should create layer with FeatureCollection data", async () => {
			const config: GeoJsonLayerConfig = {
				id: "test-layer",
				data: {
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
					],
				},
			};

			const layer = await createGeoJsonLayer(config);

			expect(layer.id).toBe("test-layer");
			expect(layer.type).toBe("geojson");
			expect(layer.source).toBeDefined();
			expect(layer.source?.id).toBe("test-layer-source");
			expect(layer.layers).toBeDefined();
			expect(layer.layers.length).toBeGreaterThan(0);
		});

		it("should create layer with clustering enabled", async () => {
			const config: GeoJsonLayerConfig = {
				id: "test-layer",
				data: {
					type: "FeatureCollection",
					features: [],
				},
				cluster: true,
			};

			const layer = await createGeoJsonLayer(config);

			expect(layer.source?.spec.type).toBe("geojson");
			expect((layer.source?.spec as { cluster?: boolean }).cluster).toBe(true);
			expect(layer.layers.length).toBeGreaterThan(0);
		});

		it("should create layer with custom style", async () => {
			const config: GeoJsonLayerConfig = {
				id: "test-layer",
				data: {
					type: "FeatureCollection",
					features: [],
				},
				style: {
					circleColor: "#ff0000",
					circleRadius: 10,
					fillColor: "#00ff00",
					strokeColor: "#0000ff",
				},
			};

			const layer = await createGeoJsonLayer(config);

			// Find circle layer
			const circleLayer = layer.layers.find((l) => l.type === "circle");
			expect(circleLayer).toBeDefined();
			expect(circleLayer?.paint?.["circle-color"]).toBe("#ff0000");
			expect(circleLayer?.paint?.["circle-radius"]).toBe(10);
		});

		it("should handle generateId option", async () => {
			const config: GeoJsonLayerConfig = {
				id: "test-layer",
				data: {
					type: "FeatureCollection",
					features: [
						{
							type: "Feature",
							geometry: {
								type: "Point",
								coordinates: [100, 50],
							},
							properties: {},
							// No id
						},
					],
				},
				generateId: true,
			};

			const layer = await createGeoJsonLayer(config);

			const sourceSpec = layer.source?.spec as { data?: { features?: Array<{ id?: unknown }> } };
			expect(sourceSpec.data).toBeDefined();
			if (
				sourceSpec.data &&
				typeof sourceSpec.data === "object" &&
				"features" in sourceSpec.data &&
				Array.isArray(sourceSpec.data.features)
			) {
				expect(sourceSpec.data.features[0]?.id).toBe("feature-0");
			}
		});

		it("should use category from config", async () => {
			const config: GeoJsonLayerConfig = {
				id: "test-layer",
				data: {
					type: "FeatureCollection",
					features: [],
				},
				category: "base",
			};

			const layer = await createGeoJsonLayer(config);

			expect(layer.category).toBe("base");
		});
	});
});
