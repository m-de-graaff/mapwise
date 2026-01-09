import { describe, expect, it } from "vitest";
import type { VectorTileLayerConfig } from "./types";
import { createVectorTileLayer, validateVectorTileConfig } from "./vector-tile-layer";

describe("Vector Tile Layer", () => {
	describe("validateVectorTileConfig", () => {
		it("should accept valid config with preset", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: "myLayer",
				style: "fill",
			};
			expect(() => validateVectorTileConfig(config)).not.toThrow();
		});

		it("should accept valid config with array tiles", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: [
					"https://tile1.example.com/{z}/{x}/{y}.pbf",
					"https://tile2.example.com/{z}/{x}/{y}.pbf",
				],
				sourceLayer: "myLayer",
			};
			expect(() => validateVectorTileConfig(config)).not.toThrow();
		});

		it("should reject config without tiles", () => {
			const config = {
				id: "test-layer",
				sourceLayer: "myLayer",
			} as Partial<VectorTileLayerConfig>;
			expect(() => validateVectorTileConfig(config)).toThrow("requires 'tiles'");
		});

		it("should reject config with invalid tiles type", () => {
			const config = {
				id: "test-layer",
				tiles: 123,
				sourceLayer: "myLayer",
			} as unknown as VectorTileLayerConfig;
			expect(() => validateVectorTileConfig(config)).toThrow("must be a string or array");
		});

		it("should reject config with empty tiles array", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: [],
				sourceLayer: "myLayer",
			};
			expect(() => validateVectorTileConfig(config)).toThrow("cannot be empty");
		});

		it("should reject config with invalid sourceLayer type", () => {
			const config = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: 123,
			} as unknown as VectorTileLayerConfig;
			expect(() => validateVectorTileConfig(config)).toThrow("must be a string");
		});
	});

	describe("createVectorTileLayer", () => {
		it("should create layer with fill preset", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: "buildings",
				style: "fill",
			};

			const layer = createVectorTileLayer(config);

			expect(layer.id).toBe("test-layer");
			expect(layer.type).toBe("vector-tile");
			expect(layer.source).toBeDefined();
			expect(layer.source?.id).toBe("test-layer-source");
			expect(layer.source?.spec.type).toBe("vector");
			expect(layer.layers.length).toBe(1);
			expect(layer.layers[0]?.type).toBe("fill");
		});

		it("should create layer with line preset", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: "roads",
				style: "line",
			};

			const layer = createVectorTileLayer(config);
			expect(layer.layers[0]?.type).toBe("line");
		});

		it("should create layer with circle preset", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: "points",
				style: "circle",
			};

			const layer = createVectorTileLayer(config);
			expect(layer.layers[0]?.type).toBe("circle");
		});

		it("should create layer with symbol preset", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: "labels",
				style: "symbol",
			};

			const layer = createVectorTileLayer(config);
			expect(layer.layers[0]?.type).toBe("symbol");
		});

		it("should use simple style options", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: "buildings",
				style: {
					preset: "fill",
					options: {
						color: "#ff0000",
						opacity: 0.5,
						strokeColor: "#ffffff",
						strokeWidth: 2,
					},
				},
			};

			const layer = createVectorTileLayer(config);
			const fillLayer = layer.layers[0];
			expect(fillLayer?.type).toBe("fill");
			if (fillLayer?.type === "fill" && fillLayer.paint) {
				expect(fillLayer.paint["fill-color"]).toBe("#ff0000");
				expect(fillLayer.paint["fill-opacity"]).toBe(0.5);
				expect(fillLayer.paint["fill-outline-color"]).toBe("#ffffff");
			}
		});

		it("should use advanced layer specs", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: "buildings",
				style: [
					{
						id: "building-fill",
						type: "fill",
						paint: {
							"fill-color": "#888888",
							"fill-opacity": 0.6,
						},
					},
					{
						id: "building-outline",
						type: "line",
						paint: {
							"line-color": "#000000",
							"line-width": 1,
						},
					},
				],
			};

			const layer = createVectorTileLayer(config);
			expect(layer.layers.length).toBe(2);
			expect(layer.layers[0]?.type).toBe("fill");
			expect(layer.layers[1]?.type).toBe("line");
		});

		it("should apply opacity from base config", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: "buildings",
				style: "fill",
				opacity: 0.7,
			};

			const layer = createVectorTileLayer(config);
			const fillLayer = layer.layers[0];
			if (fillLayer?.type === "fill" && fillLayer.paint) {
				expect(fillLayer.paint["fill-opacity"]).toBe(0.7);
			}
		});

		it("should use default fill if no style specified", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: "buildings",
			};

			const layer = createVectorTileLayer(config);
			expect(layer.layers[0]?.type).toBe("fill");
		});

		it("should handle multiple tile URLs", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: [
					"https://tile1.example.com/{z}/{x}/{y}.pbf",
					"https://tile2.example.com/{z}/{x}/{y}.pbf",
				],
				sourceLayer: "buildings",
				style: "fill",
			};

			const layer = createVectorTileLayer(config);
			const sourceSpec = layer.source?.spec as { tiles?: string[] };
			expect(Array.isArray(sourceSpec.tiles)).toBe(true);
			expect(sourceSpec.tiles?.length).toBe(2);
		});

		it("should set zoom levels", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				sourceLayer: "buildings",
				style: "fill",
				minzoom: 5,
				maxzoom: 18,
			};

			const layer = createVectorTileLayer(config);
			const sourceSpec = layer.source?.spec as { minzoom?: number; maxzoom?: number };
			expect(sourceSpec.minzoom).toBe(5);
			expect(sourceSpec.maxzoom).toBe(18);
			expect(layer.layers[0]?.minzoom).toBe(5);
			expect(layer.layers[0]?.maxzoom).toBe(18);
		});

		it("should require sourceLayer unless using advanced specs", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				style: "fill",
			};

			expect(() => createVectorTileLayer(config)).toThrow("requires 'sourceLayer'");
		});

		it("should not require sourceLayer when using advanced specs with source-layer", () => {
			const config: VectorTileLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/tiles/{z}/{x}/{y}.pbf",
				style: [
					{
						id: "building-fill",
						type: "fill",
						"source-layer": "buildings",
						paint: {
							"fill-color": "#888888",
						},
					},
				],
			};

			const layer = createVectorTileLayer(config);
			expect(layer).toBeDefined();
		});
	});
});
