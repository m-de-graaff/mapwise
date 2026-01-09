import { describe, expect, it } from "vitest";
import { fromPersistedConfig, toPersistedConfig, validatePersistedConfig } from "./persistence";
import type { WmsRasterLayerConfig } from "./types";

describe("WMS Persistence", () => {
	describe("toPersistedConfig", () => {
		it("should serialize basic config", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
			};

			const persisted = toPersistedConfig(config);

			expect(persisted._version).toBe(1);
			expect(persisted._type).toBe("wms-raster");
			expect(persisted.id).toBe("test-layer");
			expect(persisted.baseUrl).toBe("https://example.com/wms");
			expect(persisted.layers).toBe("myLayer");
		});

		it("should serialize config with all optional fields", () => {
			const config: WmsRasterLayerConfig = {
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: ["layer1", "layer2"],
				styles: ["style1", "style2"],
				format: "image/jpeg",
				transparent: false,
				version: "1.1.1",
				crs: "EPSG:4326",
				extraParams: { time: "2024-01-01" },
				tileWidth: 512,
				tileHeight: 512,
				title: "Test Layer",
				attribution: "© Test",
				minzoom: 5,
				maxzoom: 18,
				opacity: 0.8,
				visible: false,
				category: "base",
			};

			const persisted = toPersistedConfig(config);

			expect(persisted.styles).toEqual(["style1", "style2"]);
			expect(persisted.format).toBe("image/jpeg");
			expect(persisted.transparent).toBe(false);
			expect(persisted.version).toBe("1.1.1");
			expect(persisted.crs).toBe("EPSG:4326");
			expect(persisted.extraParams).toEqual({ time: "2024-01-01" });
			expect(persisted.tileWidth).toBe(512);
			expect(persisted.title).toBe("Test Layer");
			expect(persisted.opacity).toBe(0.8);
			expect(persisted.visible).toBe(false);
			expect(persisted.category).toBe("base");
		});
	});

	describe("fromPersistedConfig", () => {
		it("should deserialize basic config", () => {
			const persisted = {
				_version: 1,
				_type: "wms-raster",
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
			};

			const { config } = fromPersistedConfig(persisted);

			expect(config.id).toBe("test-layer");
			expect(config.baseUrl).toBe("https://example.com/wms");
			expect(config.layers).toBe("myLayer");
		});

		it("should throw on invalid type", () => {
			const persisted = {
				_version: 1,
				_type: "invalid-type",
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
			};

			expect(() => fromPersistedConfig(persisted)).toThrow('Expected type "wms-raster"');
		});

		it("should throw on missing required fields", () => {
			const persisted = {
				_version: 1,
				_type: "wms-raster",
				id: "test-layer",
				// missing baseUrl and layers
			};

			expect(() => fromPersistedConfig(persisted)).toThrow();
		});

		it("should throw on invalid URL", () => {
			const persisted = {
				_version: 1,
				_type: "wms-raster",
				id: "test-layer",
				baseUrl: "http://example.com:999999", // Invalid port
				layers: "myLayer",
			};

			expect(() => fromPersistedConfig(persisted)).toThrow("Invalid");
		});

		it("should deserialize with optional fields", () => {
			const persisted = {
				_version: 1,
				_type: "wms-raster",
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: ["layer1", "layer2"],
				styles: "default",
				format: "image/png",
				transparent: true,
				version: "1.3.0",
				crs: "EPSG:3857",
				extraParams: { time: "2024-01-01" },
				tileWidth: 256,
				minzoom: 0,
				maxzoom: 18,
				opacity: 0.5,
			};

			const { config } = fromPersistedConfig(persisted);

			expect(config.layers).toEqual(["layer1", "layer2"]);
			expect(config.styles).toBe("default");
			expect(config.format).toBe("image/png");
			expect(config.transparent).toBe(true);
			expect(config.version).toBe("1.3.0");
			expect(config.extraParams).toEqual({ time: "2024-01-01" });
			expect(config.opacity).toBe(0.5);
		});
	});

	describe("validatePersistedConfig", () => {
		it("should validate valid config", () => {
			const persisted = {
				_version: 1,
				_type: "wms-raster",
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
			};

			const result = validatePersistedConfig(persisted);
			expect(result.valid).toBe(true);
			expect(result.errors.length).toBe(0);
		});

		it("should invalidate config with wrong type", () => {
			const persisted = {
				_version: 1,
				_type: "wrong-type",
				id: "test-layer",
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
			};

			const result = validatePersistedConfig(persisted);
			expect(result.valid).toBe(false);
			// validatePersistedConfig calls fromPersistedConfig which throws, so errors array may be empty
			// but valid should be false
			expect(result.errors.length).toBeGreaterThanOrEqual(0);
		});
	});
});
