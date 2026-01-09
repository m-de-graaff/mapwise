import { describe, expect, it } from "vitest";
import type { WmtsExplicitConfig, WmtsRasterLayerConfig } from "./types";
import { createWmtsRasterLayer, validateWmtsConfig } from "./wmts-layer";

describe("WMTS Raster Layer", () => {
	describe("validateWmtsConfig", () => {
		it("should accept valid explicit config", () => {
			const config: WmtsExplicitConfig = {
				id: "test-layer",
				tileUrlTemplate: "https://example.com/wmts/{TileMatrix}/{TileCol}/{TileRow}.png",
				matrixSet: "EPSG:3857",
				tileMatrix: [
					{
						zoom: 0,
						matrixWidth: 1,
						matrixHeight: 1,
						tileWidth: 256,
						tileHeight: 256,
						topLeftCorner: [-20037508.34, 20037508.34],
						scaleDenominator: 559082264.029,
					},
				],
			};
			expect(() => validateWmtsConfig(config)).not.toThrow();
		});

		it("should reject explicit config without tileUrlTemplate", () => {
			const config: Partial<WmtsExplicitConfig> = {
				id: "test-layer",
				matrixSet: "EPSG:3857",
				tileMatrix: [],
			};
			// When tileUrlTemplate is missing, it should be treated as capabilities config
			// So we check for the capabilities error instead
			expect(() => validateWmtsConfig(config)).toThrow("requires 'capabilitiesUrl'");
		});

		it("should reject explicit config without matrixSet", () => {
			const config = {
				id: "test-layer",
				tileUrlTemplate: "https://example.com/wmts/{TileMatrix}/{TileCol}/{TileRow}.png",
				tileMatrix: [],
			} as Partial<WmtsExplicitConfig>;
			expect(() => validateWmtsConfig(config)).toThrow("requires 'matrixSet'");
		});

		it("should reject explicit config with empty tileMatrix", () => {
			const config: WmtsExplicitConfig = {
				id: "test-layer",
				tileUrlTemplate: "https://example.com/wmts/{TileMatrix}/{TileCol}/{TileRow}.png",
				matrixSet: "EPSG:3857",
				tileMatrix: [],
			};
			expect(() => validateWmtsConfig(config)).toThrow("cannot be empty");
		});

		it("should reject explicit config with invalid tile matrix zoom", () => {
			const config: WmtsExplicitConfig = {
				id: "test-layer",
				tileUrlTemplate: "https://example.com/wmts/{TileMatrix}/{TileCol}/{TileRow}.png",
				matrixSet: "EPSG:3857",
				tileMatrix: [
					{
						zoom: -1,
						matrixWidth: 1,
						matrixHeight: 1,
						tileWidth: 256,
						tileHeight: 256,
						topLeftCorner: [-20037508.34, 20037508.34],
						scaleDenominator: 559082264.029,
					},
				],
			};
			expect(() => validateWmtsConfig(config)).toThrow("must be a non-negative number");
		});

		it("should accept valid capabilities config", () => {
			const config: WmtsRasterLayerConfig = {
				id: "test-layer",
				capabilitiesUrl: "https://example.com/wmts",
				layerId: "myLayer",
			};
			expect(() => validateWmtsConfig(config)).not.toThrow();
		});

		it("should reject capabilities config without capabilitiesUrl", () => {
			const config = {
				id: "test-layer",
				layerId: "myLayer",
			} as Partial<WmtsRasterLayerConfig>;
			expect(() => validateWmtsConfig(config)).toThrow("requires 'capabilitiesUrl'");
		});

		it("should reject capabilities config with invalid URL", () => {
			const config: WmtsRasterLayerConfig = {
				id: "test-layer",
				capabilitiesUrl: "javascript:alert('xss')",
				layerId: "myLayer",
			};
			expect(() => validateWmtsConfig(config)).toThrow("invalid");
		});

		it("should reject capabilities config without layerId", () => {
			const config = {
				id: "test-layer",
				capabilitiesUrl: "https://example.com/wmts",
			} as Partial<WmtsRasterLayerConfig>;
			expect(() => validateWmtsConfig(config)).toThrow("requires 'layerId'");
		});
	});

	describe("createWmtsRasterLayer", () => {
		it("should create layer with explicit config", async () => {
			const config: WmtsExplicitConfig = {
				id: "test-layer",
				tileUrlTemplate: "https://example.com/wmts/{TileMatrix}/{TileCol}/{TileRow}.png",
				matrixSet: "EPSG:3857",
				tileMatrix: [
					{
						zoom: 0,
						matrixWidth: 1,
						matrixHeight: 1,
						tileWidth: 256,
						tileHeight: 256,
						topLeftCorner: [-20037508.34, 20037508.34],
						scaleDenominator: 559082264.029,
					},
				],
			};

			const layer = await createWmtsRasterLayer(config);

			expect(layer.id).toBe("test-layer");
			expect(layer.type).toBe("wmts-raster");
			expect(layer.source).toBeDefined();
			expect(layer.source?.id).toBe("test-layer-source");
			expect(layer.source?.spec.type).toBe("raster");
			expect(layer.layers.length).toBe(1);
			expect(layer.layers[0]?.type).toBe("raster");
		});

		it("should use default opacity if not provided", async () => {
			const config: WmtsExplicitConfig = {
				id: "test-layer",
				tileUrlTemplate: "https://example.com/wmts/{TileMatrix}/{TileCol}/{TileRow}.png",
				matrixSet: "EPSG:3857",
				tileMatrix: [
					{
						zoom: 0,
						matrixWidth: 1,
						matrixHeight: 1,
						tileWidth: 256,
						tileHeight: 256,
						topLeftCorner: [-20037508.34, 20037508.34],
						scaleDenominator: 559082264.029,
					},
				],
			};

			const layer = await createWmtsRasterLayer(config);
			const layerSpec = layer.layers[0];

			expect(layerSpec?.paint?.["raster-opacity"]).toBe(1);
		});

		it("should set opacity from config", async () => {
			const config: WmtsExplicitConfig = {
				id: "test-layer",
				tileUrlTemplate: "https://example.com/wmts/{TileMatrix}/{TileCol}/{TileRow}.png",
				matrixSet: "EPSG:3857",
				tileMatrix: [
					{
						zoom: 0,
						matrixWidth: 1,
						matrixHeight: 1,
						tileWidth: 256,
						tileHeight: 256,
						topLeftCorner: [-20037508.34, 20037508.34],
						scaleDenominator: 559082264.029,
					},
				],
				opacity: 0.5,
			};

			const layer = await createWmtsRasterLayer(config);
			const layerSpec = layer.layers[0];

			expect(layerSpec?.paint?.["raster-opacity"]).toBe(0.5);
		});

		it("should handle dimensions in tile URL", async () => {
			const config: WmtsExplicitConfig = {
				id: "test-layer",
				tileUrlTemplate:
					"https://example.com/wmts/{TileMatrix}/{TileCol}/{TileRow}.png?time={time}",
				matrixSet: "EPSG:3857",
				tileMatrix: [
					{
						zoom: 0,
						matrixWidth: 1,
						matrixHeight: 1,
						tileWidth: 256,
						tileHeight: 256,
						topLeftCorner: [-20037508.34, 20037508.34],
						scaleDenominator: 559082264.029,
					},
				],
				dimensions: {
					time: "2024-01-01",
				},
			};

			const layer = await createWmtsRasterLayer(config);
			expect(layer).toBeDefined();
		});
	});
});
