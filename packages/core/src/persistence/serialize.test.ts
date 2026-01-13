import type { Map as MapLibreMap } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import type { SerializationContext } from "./persistence-types.js";
import { serializeState } from "./serialize.js";

describe("serializeState", () => {
	it("should serialize map viewport", () => {
		const mockMap = {
			getCenter: () => ({ lng: 1, lat: 2 }),
			getZoom: () => 3,
			getBearing: () => 4,
			getPitch: () => 5,
			getBounds: () => ({
				getWest: () => 0,
				getSouth: () => 1,
				getEast: () => 2,
				getNorth: () => 3,
			}),
		} as unknown as MapLibreMap;

		const ctx: SerializationContext = {
			map: mockMap,
			styleManager: {
				currentStyle: "test-style",
			} as SerializationContext["styleManager"],
			layerRegistry: {
				getAllLayers: () => [],
			} as SerializationContext["layerRegistry"],
			pluginManager: {
				getAllPlugins: () => [],
			} as SerializationContext["pluginManager"],
			getPluginStateStore: () => new Map(),
		};

		const result = serializeState(ctx);

		expect(result.viewport.center).toEqual([1, 2]);
		expect(result.viewport.zoom).toBe(3);
		expect(result.viewport.bearing).toBe(4);
		expect(result.viewport.pitch).toBe(5);
		expect(result.viewport.bounds).toEqual([0, 1, 2, 3]);
	});

	it("should include version", () => {
		const mockMap = {
			getCenter: () => ({ lng: 0, lat: 0 }),
			getZoom: () => 0,
			getBearing: () => 0,
			getPitch: () => 0,
			getBounds: () => null,
		} as unknown as MapLibreMap;

		const ctx: SerializationContext = {
			map: mockMap,
			styleManager: {
				currentStyle: null,
			} as SerializationContext["styleManager"],
			layerRegistry: {
				getAllLayers: () => [],
			} as SerializationContext["layerRegistry"],
			pluginManager: {
				getAllPlugins: () => [],
			} as SerializationContext["pluginManager"],
			getPluginStateStore: () => new Map(),
		};

		const result = serializeState(ctx);

		expect(result.version).toBeDefined();
		expect(typeof result.version).toBe("number");
	});

	it("should serialize layers", () => {
		const mockMap = {
			getCenter: () => ({ lng: 0, lat: 0 }),
			getZoom: () => 0,
			getBearing: () => 0,
			getPitch: () => 0,
			getBounds: () => null,
		} as unknown as MapLibreMap;

		const mockLayers = [
			{
				id: "layer-1",
				type: "geojson-points" as const,
				visible: true,
				opacity: 0.8,
				order: 0,
				category: "overlay" as const,
				metadata: { title: "Test Layer" },
			},
		];

		const ctx: SerializationContext = {
			map: mockMap,
			styleManager: {
				currentStyle: null,
			} as SerializationContext["styleManager"],
			layerRegistry: {
				getAllLayers: () => mockLayers,
			} as SerializationContext["layerRegistry"],
			pluginManager: {
				getAllPlugins: () => [],
			} as SerializationContext["pluginManager"],
			getPluginStateStore: () => new Map(),
		};

		const result = serializeState(ctx);

		expect(result.layers).toHaveLength(1);
		expect(result.layers[0]?.id).toBe("layer-1");
		expect(result.layers[0]?.visible).toBe(true);
		expect(result.layers[0]?.opacity).toBe(0.8);
	});
});
