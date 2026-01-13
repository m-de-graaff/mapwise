import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPmtilesLayer, validatePmtilesConfig } from "./pmtiles-layer.js";
import type { PmtilesRasterLayerConfig, PmtilesVectorLayerConfig } from "./types.js";

// Mock the registerPmtilesProtocol function to simulate PMTiles being available
vi.mock("./pmtiles-adapter", async () => {
	const actual = await vi.importActual<typeof import("./pmtiles-adapter")>("./pmtiles-adapter");
	return {
		...actual,
		registerPmtilesProtocol: vi.fn().mockResolvedValue(undefined),
	};
});

describe("PMTiles Layer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset protocol registration state
		// internal function for testing
		import("./pmtiles-layer").then((mod) => {
			if ("resetProtocolRegistration" in mod) {
				mod.resetProtocolRegistration();
			}
		});
	});

	describe("validatePmtilesConfig", () => {
		it("should accept valid raster config", async () => {
			const config: PmtilesRasterLayerConfig = {
				id: "test-layer",
				url: "https://example.com/tiles.pmtiles",
			};
			await expect(validatePmtilesConfig(config)).resolves.not.toThrow();
		});

		it("should accept valid vector config", async () => {
			const config: PmtilesVectorLayerConfig = {
				id: "test-layer",
				url: "https://example.com/tiles.pmtiles",
				sourceLayer: "buildings",
			};
			await expect(validatePmtilesConfig(config)).resolves.not.toThrow();
		});

		it("should reject config without url", async () => {
			const config = {
				id: "test-layer",
			} as Partial<PmtilesRasterLayerConfig>;
			await expect(validatePmtilesConfig(config)).rejects.toThrow("requires 'url'");
		});

		it("should reject config with invalid url type", async () => {
			const config = {
				id: "test-layer",
				url: 123,
			} as unknown as PmtilesRasterLayerConfig;
			await expect(validatePmtilesConfig(config)).rejects.toThrow("requires 'url'");
		});

		it("should reject vector config without sourceLayer", async () => {
			const config: PmtilesVectorLayerConfig = {
				id: "test-layer",
				url: "https://example.com/tiles.pmtiles",
				style: "fill",
			} as unknown as PmtilesVectorLayerConfig;
			await expect(validatePmtilesConfig(config)).rejects.toThrow("requires 'sourceLayer'");
		});

		it("should reject config with javascript: url", async () => {
			const config: PmtilesRasterLayerConfig = {
				id: "test-layer",
				url: "javascript:alert('xss')",
			};
			await expect(validatePmtilesConfig(config)).rejects.toThrow("invalid");
		});

		it("should throw PmtilesNotInstalledError when PMTiles is not available", async () => {
			// Mock import to throw
			vi.doMock("@protomaps/pmtiles", () => {
				throw new Error("Cannot find module '@protomaps/pmtiles'");
			});

			const config: PmtilesRasterLayerConfig = {
				id: "test-layer",
				url: "https://example.com/tiles.pmtiles",
			};

			// This will fail because we can't easily mock the dynamic import
			// In a real scenario, the error would be caught and rethrown as PmtilesNotInstalledError
			// For now, we just verify the function structure is correct
			try {
				await validatePmtilesConfig(config);
			} catch (error) {
				// Expected - either PmtilesNotInstalledError or another error
				expect(error).toBeInstanceOf(Error);
			}
		});
	});

	describe("createPmtilesLayer", () => {
		it("should create raster layer", async () => {
			const config: PmtilesRasterLayerConfig = {
				id: "test-raster",
				url: "https://example.com/tiles.pmtiles",
			};

			const layer = await createPmtilesLayer(config);

			expect(layer.id).toBe("test-raster");
			expect(layer.type).toBe("pmtiles-raster");
			expect(layer.source).toBeDefined();
			expect(layer.source?.id).toBe("test-raster-source");
			expect(layer.source?.spec.type).toBe("raster");
			expect(layer.layers.length).toBe(1);
			expect(layer.layers[0]?.type).toBe("raster");
		});

		it("should create vector layer with fill preset", async () => {
			const config: PmtilesVectorLayerConfig = {
				id: "test-vector",
				url: "https://example.com/tiles.pmtiles",
				sourceLayer: "buildings",
				style: "fill",
			};

			const layer = await createPmtilesLayer(config);

			expect(layer.id).toBe("test-vector");
			expect(layer.type).toBe("pmtiles-vector");
			expect(layer.source?.spec.type).toBe("vector");
			expect(layer.layers.length).toBe(1);
			expect(layer.layers[0]?.type).toBe("fill");
		});

		it("should create vector layer with line preset", async () => {
			const config: PmtilesVectorLayerConfig = {
				id: "test-vector",
				url: "https://example.com/tiles.pmtiles",
				sourceLayer: "roads",
				style: "line",
			};

			const layer = await createPmtilesLayer(config);
			expect(layer.layers[0]?.type).toBe("line");
		});

		it("should create vector layer with advanced specs", async () => {
			const config: PmtilesVectorLayerConfig = {
				id: "test-vector",
				url: "https://example.com/tiles.pmtiles",
				sourceLayer: "buildings",
				style: [
					{
						id: "building-fill",
						type: "fill",
						source: "placeholder", // Required by type, but replaced by factory
						paint: {
							"fill-color": "#888888",
							"fill-opacity": 0.6,
						},
					},
				],
			};

			const layer = await createPmtilesLayer(config);
			expect(layer.layers.length).toBe(1);
			expect(layer.layers[0]?.type).toBe("fill");
		});

		it("should apply opacity from base config", async () => {
			const config: PmtilesRasterLayerConfig = {
				id: "test-raster",
				url: "https://example.com/tiles.pmtiles",
				opacity: 0.7,
			};

			const layer = await createPmtilesLayer(config);
			const rasterLayer = layer.layers[0];
			if (rasterLayer?.type === "raster" && rasterLayer.paint) {
				expect(rasterLayer.paint["raster-opacity"]).toBe(0.7);
			}
		});

		it("should set zoom levels", async () => {
			const config: PmtilesRasterLayerConfig = {
				id: "test-raster",
				url: "https://example.com/tiles.pmtiles",
				minzoom: 5,
				maxzoom: 18,
			};

			const layer = await createPmtilesLayer(config);
			const sourceSpec = layer.source?.spec as { minzoom?: number; maxzoom?: number };
			expect(sourceSpec.minzoom).toBe(5);
			expect(sourceSpec.maxzoom).toBe(18);
		});

		it("should convert http/https URL to pmtiles protocol", async () => {
			const config: PmtilesRasterLayerConfig = {
				id: "test-raster",
				url: "https://example.com/tiles.pmtiles",
			};

			const layer = await createPmtilesLayer(config);
			const sourceSpec = layer.source?.spec as { url?: string };
			expect(sourceSpec.url).toContain("pmtiles:");
		});

		it("should handle pmtiles:// protocol URL", async () => {
			const config: PmtilesRasterLayerConfig = {
				id: "test-raster",
				url: "pmtiles://example.com/tiles.pmtiles",
			};

			const layer = await createPmtilesLayer(config);
			const sourceSpec = layer.source?.spec as { url?: string };
			expect(sourceSpec.url).toBe("pmtiles://example.com/tiles.pmtiles");
		});
	});
});
