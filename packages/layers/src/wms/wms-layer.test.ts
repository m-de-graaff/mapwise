import { describe, expect, it } from "vitest";
import type { WmsRasterLayerConfig } from "./types";
import { createWmsRasterLayer, validateWmsConfig } from "./wms-layer";

describe("WMS Raster Layer", () => {
	describe("validateWmsConfig", () => {
		it("should accept valid config", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
			};
			expect(() => validateWmsConfig(config)).not.toThrow();
		});

		it("should reject config without baseUrl", () => {
			const config = {
				id: "test-layer",
				layers: "myLayer",
			} as Partial<WmsRasterLayerConfig>;
			expect(() => validateWmsConfig(config)).toThrow("requires 'baseUrl'");
		});

		it("should reject config with invalid baseUrl", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "javascript:alert('xss')",
				layers: "myLayer",
			};
			expect(() => validateWmsConfig(config)).toThrow("invalid");
		});

		it("should reject config without layers", () => {
			const config = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
			} as Partial<WmsRasterLayerConfig>;
			expect(() => validateWmsConfig(config)).toThrow("requires 'layers'");
		});

		it("should reject config with invalid layers type", () => {
			const config = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: 123,
			} as unknown as WmsRasterLayerConfig;
			expect(() => validateWmsConfig(config)).toThrow("must be a string or array");
		});

		it("should reject config with empty layers array", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: [],
			};
			expect(() => validateWmsConfig(config)).toThrow("cannot be empty");
		});

		it("should reject config with mismatched styles length", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: ["layer1", "layer2"],
				styles: ["style1"], // Only one style for two layers
			};
			expect(() => validateWmsConfig(config)).toThrow("length must match");
		});

		it("should accept config with matching styles length", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: ["layer1", "layer2"],
				styles: ["style1", "style2"],
			};
			expect(() => validateWmsConfig(config)).not.toThrow();
		});

		it("should reject invalid version", () => {
			const config = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				version: "2.0.0",
			} as unknown as WmsRasterLayerConfig;
			expect(() => validateWmsConfig(config)).toThrow("must be '1.1.1' or '1.3.0'");
		});

		it("should reject invalid tileWidth", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				tileWidth: -1,
			};
			expect(() => validateWmsConfig(config)).toThrow("must be a positive number");
		});

		it("should reject invalid tileHeight", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				tileHeight: 0,
			};
			expect(() => validateWmsConfig(config)).toThrow("must be a positive number");
		});
	});

	describe("createWmsRasterLayer", () => {
		it("should create layer with basic config", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
			};

			const layer = createWmsRasterLayer(config);

			expect(layer.id).toBe("test-layer");
			expect(layer.type).toBe("wms-raster");
			expect(layer.source).toBeDefined();
			expect(layer.source?.id).toBe("test-layer-source");
			expect(layer.source?.spec.type).toBe("raster");
			expect(layer.layers.length).toBe(1);
			expect(layer.layers[0]?.type).toBe("raster");
		});

		it("should use default values", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
			};

			const layer = createWmsRasterLayer(config);
			const sourceSpec = layer.source?.spec as { minzoom?: number; maxzoom?: number };
			const layerSpec = layer.layers[0];

			expect(sourceSpec.minzoom).toBe(0);
			expect(sourceSpec.maxzoom).toBe(22);
			expect(layerSpec?.paint?.["raster-opacity"]).toBe(1);
		});

		it("should use custom format and transparency", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				format: "image/jpeg",
				transparent: false,
			};

			const layer = createWmsRasterLayer(config);
			// Format and transparency are handled in the source spec's tiles function
			expect(layer).toBeDefined();
		});

		it("should handle WMS 1.1.1 version", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				version: "1.1.1",
			};

			const layer = createWmsRasterLayer(config);
			expect(layer).toBeDefined();
		});

		it("should handle multiple layers", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: ["layer1", "layer2"],
			};

			const layer = createWmsRasterLayer(config);
			expect(layer).toBeDefined();
		});

		it("should handle extraParams", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				extraParams: {
					time: "2024-01-01",
					elevation: "0",
				},
			};

			const layer = createWmsRasterLayer(config);
			expect(layer).toBeDefined();
		});

		it("should set opacity from config", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				opacity: 0.5,
			};

			const layer = createWmsRasterLayer(config);
			const layerSpec = layer.layers[0];

			expect(layerSpec?.paint?.["raster-opacity"]).toBe(0.5);
		});

		it("should include attribution in metadata", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				attribution: "© Example Contributors",
			};

			const layer = createWmsRasterLayer(config);

			expect(layer.metadata?.attribution).toBe("© Example Contributors");
		});

		it("should support getPersistedConfig", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				format: "image/png",
				version: "1.3.0",
			};

			const layer = createWmsRasterLayer(config);
			const layerWithPersistence = layer as typeof layer & {
				getPersistedConfig?: () => unknown;
			};

			expect(layerWithPersistence.getPersistedConfig).toBeDefined();
			const persisted = layerWithPersistence.getPersistedConfig?.();
			expect(persisted).toBeDefined();
			expect((persisted as { _type: string })._type).toBe("wms-raster");
			expect((persisted as { id: string }).id).toBe("test-layer");
			expect((persisted as { baseUrl: string }).baseUrl).toBe("https://example.com/wms");
		});
	});
});
