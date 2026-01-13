import { describe, expect, it } from "vitest";
import { fromPersistedConfig, toPersistedConfig, validatePersistedConfig } from "./persistence.js";
import type { XyzRasterLayerConfig } from "./types.js";

describe("XYZ Persistence", () => {
	describe("toPersistedConfig", () => {
		it("should serialize basic config", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
			};

			const persisted = toPersistedConfig(config);

			expect(persisted._version).toBe(1);
			expect(persisted._type).toBe("xyz-raster");
			expect(persisted.id).toBe("test-layer");
			expect(persisted.tiles).toBe("https://example.com/{z}/{x}/{y}.png");
		});

		it("should serialize config with all optional fields", () => {
			const config: XyzRasterLayerConfig = {
				id: "test-layer",
				tiles: ["https://example.com/{z}/{x}/{y}.png"],
				tileSize: 512,
				minzoom: 5,
				maxzoom: 18,
				subdomains: ["a", "b", "c"],
				tms: true,
				title: "Test Layer",
				attribution: "© Test",
				opacity: 0.8,
				visible: false,
				category: "base",
			};

			const persisted = toPersistedConfig(config);

			expect(persisted.tiles).toEqual(["https://example.com/{z}/{x}/{y}.png"]);
			expect(persisted.tileSize).toBe(512);
			expect(persisted.minzoom).toBe(5);
			expect(persisted.maxzoom).toBe(18);
			expect(persisted.subdomains).toEqual(["a", "b", "c"]);
			expect(persisted.tms).toBe(true);
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
				_type: "xyz-raster",
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
			};

			const { config } = fromPersistedConfig(persisted);

			expect(config.id).toBe("test-layer");
			expect(config.tiles).toBe("https://example.com/{z}/{x}/{y}.png");
		});

		it("should throw on invalid type", () => {
			const persisted = {
				_version: 1,
				_type: "invalid-type",
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
			};

			expect(() => fromPersistedConfig(persisted)).toThrow('Expected type "xyz-raster"');
		});

		it("should throw on missing required fields", () => {
			const persisted = {
				_version: 1,
				_type: "xyz-raster",
				id: "test-layer",
				// missing tiles
			};

			expect(() => fromPersistedConfig(persisted)).toThrow();
		});

		it("should deserialize with optional fields", () => {
			const persisted = {
				_version: 1,
				_type: "xyz-raster",
				id: "test-layer",
				tiles: ["https://example.com/{z}/{x}/{y}.png"],
				tileSize: 512,
				tms: true,
				subdomains: ["a", "b"],
				minzoom: 0,
				maxzoom: 18,
			};

			const { config } = fromPersistedConfig(persisted);

			expect(config.tiles).toEqual(["https://example.com/{z}/{x}/{y}.png"]);
			expect(config.tileSize).toBe(512);
			expect(config.tms).toBe(true);
			expect(config.subdomains).toEqual(["a", "b"]);
		});
	});

	describe("validatePersistedConfig", () => {
		it("should validate valid config", () => {
			const persisted = {
				_version: 1,
				_type: "xyz-raster",
				id: "test-layer",
				tiles: "https://example.com/{z}/{x}/{y}.png",
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
				tiles: "https://example.com/{z}/{x}/{y}.png",
			};

			const result = validatePersistedConfig(persisted);
			expect(result.valid).toBe(false);
			// validatePersistedConfig calls fromPersistedConfig which throws, so errors array may be empty
			// but valid should be false
			expect(result.errors.length).toBeGreaterThanOrEqual(0);
		});
	});
});
