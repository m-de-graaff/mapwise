import { describe, expect, it } from "vitest";
import { createArcGisRestRasterLayer, validateArcGisConfig } from "./arcgis-raster-layer.js";
import type { ArcGisRestRasterLayerConfig } from "./types.js";

describe("ArcGIS REST Raster Layer", () => {
	describe("validateArcGisConfig", () => {
		it("should accept valid config", () => {
			const config: ArcGisRestRasterLayerConfig = {
				id: "test-layer",
				serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
			};
			expect(() => validateArcGisConfig(config)).not.toThrow();
		});

		it("should reject config without serviceUrl", () => {
			const config = {
				id: "test-layer",
			} as Partial<ArcGisRestRasterLayerConfig>;
			expect(() => validateArcGisConfig(config)).toThrow("requires 'serviceUrl'");
		});

		it("should reject config with invalid serviceUrl", () => {
			const config: ArcGisRestRasterLayerConfig = {
				id: "test-layer",
				serviceUrl: "javascript:alert('xss')",
			};
			expect(() => validateArcGisConfig(config)).toThrow("invalid");
		});

		it("should reject config with negative layerId", () => {
			const config: ArcGisRestRasterLayerConfig = {
				id: "test-layer",
				serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
				layerId: -1,
			};
			expect(() => validateArcGisConfig(config)).toThrow("must be a non-negative number");
		});

		it("should reject config with invalid tileWidth", () => {
			const config: ArcGisRestRasterLayerConfig = {
				id: "test-layer",
				serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
				tileWidth: -1,
			};
			expect(() => validateArcGisConfig(config)).toThrow("must be a positive number");
		});

		it("should reject config with invalid tileHeight", () => {
			const config: ArcGisRestRasterLayerConfig = {
				id: "test-layer",
				serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
				tileHeight: 0,
			};
			expect(() => validateArcGisConfig(config)).toThrow("must be a positive number");
		});

		it("should accept config with all optional fields", () => {
			const config: ArcGisRestRasterLayerConfig = {
				id: "test-layer",
				serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
				layerId: 1,
				format: "png",
				transparent: false,
				tileWidth: 512,
				tileHeight: 512,
				crs: "EPSG:4326",
				extraParams: {
					time: "2024-01-01",
				},
			};
			expect(() => validateArcGisConfig(config)).not.toThrow();
		});
	});

	describe("createArcGisRestRasterLayer", () => {
		it("should create a valid layer definition", () => {
			const config: ArcGisRestRasterLayerConfig = {
				id: "arcgis-layer",
				serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
			};

			const layer = createArcGisRestRasterLayer(config);

			expect(layer.id).toBe("arcgis-layer");
			expect(layer.type).toBe("arcgis-raster");
			expect(layer.category).toBe("overlay");
			expect(layer.source).toBeDefined();
			expect(layer.source?.id).toBe("arcgis-layer-source");
			expect(layer.layers).toBeDefined();
			expect(layer.layers.length).toBe(1);
		});

		it("should create layer with custom category", () => {
			const config: ArcGisRestRasterLayerConfig = {
				id: "arcgis-layer",
				serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
				category: "base",
			};

			const layer = createArcGisRestRasterLayer(config);
			expect(layer.category).toBe("base");
		});

		it("should create layer with metadata", () => {
			const config: ArcGisRestRasterLayerConfig = {
				id: "arcgis-layer",
				serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
				title: "Test Layer",
				attribution: "© Test",
			};

			const layer = createArcGisRestRasterLayer(config);
			expect(layer.metadata?.title).toBe("Test Layer");
			expect(layer.metadata?.attribution).toBe("© Test");
		});

		it("should create layer with tileUrlTransform", () => {
			const config: ArcGisRestRasterLayerConfig = {
				id: "arcgis-layer",
				serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
				tileUrlTransform: (url) => {
					const parsed = new URL(url);
					parsed.searchParams.set("token", "test-token");
					return parsed.toString();
				},
			};

			const layer = createArcGisRestRasterLayer(config);
			expect(layer.source).toBeDefined();
			// The transform is applied at tile request time, not at layer creation
			// So we just verify the layer was created successfully
			expect(layer.id).toBe("arcgis-layer");
		});
	});
});
