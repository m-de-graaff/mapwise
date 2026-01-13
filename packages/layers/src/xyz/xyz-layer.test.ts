import { describe, expect, it } from "vitest";
import type { XyzRasterLayerConfig } from "./types.js";
import { createXyzRasterLayer, validateXyzConfig } from "./xyz-layer.js";

describe("XYZ Raster Layer", () => {
	describe("validateXyzConfig", () => {
		it("should accept valid config with string tiles", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
			};
			expect(() => validateXyzConfig(config)).not.toThrow();
		});

		it("should accept valid config with array tiles", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: [
					"https://tile1.example.com/{z}/{x}/{y}.png",
					"https://tile2.example.com/{z}/{x}/{y}.png",
				],
			};
			expect(() => validateXyzConfig(config)).not.toThrow();
		});

		it("should reject config without tiles", () => {
			const config = {
				id: "test-layer",
			} as Partial<XyzRasterLayerConfig>;
			expect(() => validateXyzConfig(config)).toThrow("requires 'tiles'");
		});

		it("should reject config with invalid tiles type", () => {
			const config = {
				id: "test-layer",
				tiles: 123,
			} as unknown as XyzRasterLayerConfig;
			expect(() => validateXyzConfig(config)).toThrow("must be a string or array");
		});

		it("should reject config with empty tiles array", () => {
			const config = {
				id: "test-layer",
				tiles: [],
			} as XyzRasterLayerConfig;
			expect(() => validateXyzConfig(config)).toThrow("cannot be empty");
		});

		it("should reject config with invalid tileSize", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				tileSize: -1,
			};
			expect(() => validateXyzConfig(config)).toThrow("must be a positive number");
		});

		it("should reject config with invalid zoom range", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				minzoom: 10,
				maxzoom: 5,
			};
			expect(() => validateXyzConfig(config)).toThrow("minzoom must be less");
		});
	});

	describe("createXyzRasterLayer", () => {
		it("should create layer with basic config", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
			};

			const layer = createXyzRasterLayer(config);

			expect(layer.id).toBe("test-layer");
			expect(layer.type).toBe("xyz-raster");
			expect(layer.source).toBeDefined();
			expect(layer.source?.id).toBe("test-layer-source");
			expect(layer.source?.spec.type).toBe("raster");
			expect(layer.layers.length).toBe(1);
			expect(layer.layers[0]?.type).toBe("raster");
		});

		it("should use default tileSize if not provided", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
			};

			const layer = createXyzRasterLayer(config);
			const sourceSpec = layer.source?.spec as { tileSize?: number };

			expect(sourceSpec.tileSize).toBe(256);
		});

		it("should use custom tileSize", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				tileSize: 512,
			};

			const layer = createXyzRasterLayer(config);
			const sourceSpec = layer.source?.spec as { tileSize?: number };

			expect(sourceSpec.tileSize).toBe(512);
		});

		it("should use default zoom levels if not provided", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
			};

			const layer = createXyzRasterLayer(config);
			const sourceSpec = layer.source?.spec as { minzoom?: number; maxzoom?: number };

			expect(sourceSpec.minzoom).toBe(0);
			expect(sourceSpec.maxzoom).toBe(22);
		});

		it("should use custom zoom levels", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				minzoom: 5,
				maxzoom: 18,
			};

			const layer = createXyzRasterLayer(config);
			const sourceSpec = layer.source?.spec as { minzoom?: number; maxzoom?: number };
			const layerSpec = layer.layers[0];

			expect(sourceSpec.minzoom).toBe(5);
			expect(sourceSpec.maxzoom).toBe(18);
			expect(layerSpec?.minzoom).toBe(5);
			expect(layerSpec?.maxzoom).toBe(18);
		});

		it("should handle subdomains", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://{s}.tile.example.com/{z}/{x}/{y}.png",
				subdomains: ["a", "b", "c"],
			};

			const layer = createXyzRasterLayer(config);
			const sourceSpec = layer.source?.spec as { tiles?: string[] };

			expect(sourceSpec.tiles).toBeDefined();
			expect(Array.isArray(sourceSpec.tiles)).toBe(true);
			expect(sourceSpec.tiles?.length).toBe(3);
			expect(sourceSpec.tiles?.[0]).toContain("a.tile");
			expect(sourceSpec.tiles?.[1]).toContain("b.tile");
			expect(sourceSpec.tiles?.[2]).toContain("c.tile");
		});

		it("should handle TMS y-flip", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tms/{z}/{x}/{y}.png",
				tms: true,
			};

			const layer = createXyzRasterLayer(config);
			const sourceSpec = layer.source?.spec as { scheme?: string };

			expect(sourceSpec.scheme).toBe("tms");
		});

		it("should not set scheme for non-TMS layers", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				tms: false,
			};

			const layer = createXyzRasterLayer(config);
			const sourceSpec = layer.source?.spec as { scheme?: string };

			expect(sourceSpec.scheme).toBeUndefined();
		});

		it("should include attribution in metadata", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				attribution: "© Example Contributors",
			};

			const layer = createXyzRasterLayer(config);

			expect(layer.metadata?.attribution).toBe("© Example Contributors");
		});

		it("should set opacity from config", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				opacity: 0.5,
			};

			const layer = createXyzRasterLayer(config);
			const layerSpec = layer.layers[0];

			expect(layerSpec?.paint?.["raster-opacity"]).toBe(0.5);
		});

		it("should use default opacity if not provided", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
			};

			const layer = createXyzRasterLayer(config);
			const layerSpec = layer.layers[0];

			expect(layerSpec?.paint?.["raster-opacity"]).toBe(1);
		});

		it("should handle multiple tile URLs", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: [
					"https://tile1.example.com/{z}/{x}/{y}.png",
					"https://tile2.example.com/{z}/{x}/{y}.png",
				],
			};

			const layer = createXyzRasterLayer(config);
			const sourceSpec = layer.source?.spec as { tiles?: string[] };

			expect(sourceSpec.tiles).toBeDefined();
			expect(Array.isArray(sourceSpec.tiles)).toBe(true);
			expect(sourceSpec.tiles?.length).toBe(2);
		});

		it("should use category from config", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				category: "base",
			};

			const layer = createXyzRasterLayer(config);

			expect(layer.category).toBe("base");
		});

		it("should include zoom levels in metadata", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				minzoom: 5,
				maxzoom: 18,
			};

			const layer = createXyzRasterLayer(config);

			expect(layer.metadata?.minZoom).toBe(5);
			expect(layer.metadata?.maxZoom).toBe(18);
		});

		it("should support getPersistedConfig", () => {
			const config: XyzRasterLayerConfig = {
				id: "xyz-persistence-test",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				tileSize: 512,
				maxzoom: 18,
			};

			const layer = createXyzRasterLayer(config);
			const layerWithPersistence = layer as typeof layer & {
				getPersistedConfig?: () => unknown;
			};

			expect(layerWithPersistence.getPersistedConfig).toBeDefined();
			const persisted = layerWithPersistence.getPersistedConfig?.();
			expect(persisted).toBeDefined();
			expect((persisted as { _type: string })._type).toBe("xyz-raster");
			expect((persisted as { id: string }).id).toBe("xyz-persistence-test");
			expect((persisted as { tiles: string }).tiles).toBe(config.tiles);
		});

		it("should support tileUrlTransform", () => {
			const config: XyzRasterLayerConfig = {
				id: "xyz-transform-test",
				tiles: "https://example.com/{z}/{x}/{y}.png",
				tileUrlTransform: (url) => {
					const parsed = new URL(url);
					parsed.searchParams.set("token", "test-token");
					return parsed.toString();
				},
			};

			const layer = createXyzRasterLayer(config);
			// The transform is applied at tile request time, so we just verify layer creation
			expect(layer.id).toBe("xyz-transform-test");
			expect(layer.source).toBeDefined();
		});
	});
});
