import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEventBus } from "../events/event-bus";
import { createLayerRegistry } from "./layer-registry";
import type { LayerDefinition } from "./registry-types";

describe("LayerRegistry", () => {
	let registry: ReturnType<typeof createLayerRegistry>;
	let mockMap: {
		getLayer: ReturnType<typeof vi.fn>;
		addLayer: ReturnType<typeof vi.fn>;
		removeLayer: ReturnType<typeof vi.fn>;
		getSource: ReturnType<typeof vi.fn>;
		addSource: ReturnType<typeof vi.fn>;
		removeSource: ReturnType<typeof vi.fn>;
		setLayoutProperty: ReturnType<typeof vi.fn>;
		setPaintProperty: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockMap = {
			getLayer: vi.fn().mockReturnValue(null),
			addLayer: vi.fn(),
			removeLayer: vi.fn(),
			getSource: vi.fn().mockReturnValue(null),
			addSource: vi.fn(),
			removeSource: vi.fn(),
			setLayoutProperty: vi.fn(),
			setPaintProperty: vi.fn(),
		};

		const getMap = () => mockMap as unknown;
		const eventBus = createEventBus();
		registry = createLayerRegistry(getMap, eventBus);
	});

	describe("registerLayer", () => {
		it("should register a layer", () => {
			const definition: LayerDefinition = {
				id: "test-layer",
				type: "geojson-points",
				source: {
					id: "test-source",
					spec: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
				},
				layers: [
					{
						id: "test-layer",
						type: "circle",
						source: "test-source",
						paint: { "circle-radius": 5 },
					},
				],
			};

			registry.registerLayer(definition);

			expect(registry.hasLayer("test-layer")).toBe(true);
			expect(registry.count).toBe(1);
		});

		it("should throw if layer ID already exists", () => {
			const definition: LayerDefinition = {
				id: "test-layer",
				type: "geojson-points",
				layers: [],
			};

			registry.registerLayer(definition);

			expect(() => {
				registry.registerLayer(definition);
			}).toThrow('Layer "test-layer" already exists');
		});

		it("should maintain layer order", () => {
			const layer1: LayerDefinition = {
				id: "layer-1",
				type: "geojson-points",
				layers: [],
			};
			const layer2: LayerDefinition = {
				id: "layer-2",
				type: "geojson-points",
				layers: [],
			};

			registry.registerLayer(layer1);
			registry.registerLayer(layer2);

			const allLayers = registry.getAllLayers();
			expect(allLayers[0]?.id).toBe("layer-1");
			expect(allLayers[1]?.id).toBe("layer-2");
		});
	});

	describe("removeLayer", () => {
		it("should remove a layer", () => {
			const definition: LayerDefinition = {
				id: "test-layer",
				type: "geojson-points",
				layers: [],
			};

			registry.registerLayer(definition);
			expect(registry.hasLayer("test-layer")).toBe(true);

			const removed = registry.removeLayer("test-layer");
			expect(removed).toBe(true);
			expect(registry.hasLayer("test-layer")).toBe(false);
		});

		it("should return false if layer does not exist", () => {
			expect(registry.removeLayer("non-existent")).toBe(false);
		});
	});

	describe("setVisibility", () => {
		it("should set layer visibility", () => {
			const definition: LayerDefinition = {
				id: "test-layer",
				type: "geojson-points",
				layers: [
					{
						id: "test-layer",
						type: "circle",
						source: "test-source",
					},
				],
			};

			registry.registerLayer(definition);
			mockMap.getLayer.mockReturnValue({ type: "circle" });

			const result = registry.setVisibility("test-layer", false);
			expect(result).toBe(true);

			const state = registry.getLayerState("test-layer");
			expect(state?.visible).toBe(false);
		});

		it("should return false if layer does not exist", () => {
			expect(registry.setVisibility("non-existent", false)).toBe(false);
		});
	});

	describe("setOpacity", () => {
		it("should set layer opacity", () => {
			const definition: LayerDefinition = {
				id: "test-layer",
				type: "geojson-points",
				layers: [
					{
						id: "test-layer",
						type: "circle",
						source: "test-source",
					},
				],
			};

			registry.registerLayer(definition);
			mockMap.getLayer.mockReturnValue({ type: "circle" });

			const result = registry.setOpacity("test-layer", 0.5);
			expect(result).toBe(true);

			const state = registry.getLayerState("test-layer");
			expect(state?.opacity).toBe(0.5);
		});

		it("should clamp opacity to 0-1 range", () => {
			const definition: LayerDefinition = {
				id: "test-layer",
				type: "geojson-points",
				layers: [],
			};

			registry.registerLayer(definition);

			registry.setOpacity("test-layer", 1.5);
			const state1 = registry.getLayerState("test-layer");
			expect(state1?.opacity).toBe(1);

			registry.setOpacity("test-layer", -0.5);
			const state2 = registry.getLayerState("test-layer");
			expect(state2?.opacity).toBe(0);
		});
	});

	describe("moveLayer", () => {
		it("should move layer to new position", () => {
			const layer1: LayerDefinition = {
				id: "layer-1",
				type: "geojson-points",
				layers: [],
			};
			const layer2: LayerDefinition = {
				id: "layer-2",
				type: "geojson-points",
				layers: [],
			};

			registry.registerLayer(layer1);
			registry.registerLayer(layer2);

			const moved = registry.moveLayer("layer-1", { type: "top" });
			expect(moved).toBe(true);

			const allLayers = registry.getAllLayers();
			expect(allLayers[0]?.id).toBe("layer-2");
			expect(allLayers[1]?.id).toBe("layer-1");
		});
	});

	describe("getLayersByCategory", () => {
		it("should filter layers by category", () => {
			const overlay: LayerDefinition = {
				id: "overlay-1",
				type: "geojson-points",
				category: "overlay",
				layers: [],
			};
			const base: LayerDefinition = {
				id: "base-1",
				type: "geojson-points",
				category: "base",
				layers: [],
			};

			registry.registerLayer(overlay);
			registry.registerLayer(base);

			const overlays = registry.getLayersByCategory("overlay");
			expect(overlays).toHaveLength(1);
			expect(overlays[0]?.id).toBe("overlay-1");

			const bases = registry.getLayersByCategory("base");
			expect(bases).toHaveLength(1);
			expect(bases[0]?.id).toBe("base-1");
		});
	});

	describe("clear", () => {
		it("should remove all layers", () => {
			const layer1: LayerDefinition = {
				id: "layer-1",
				type: "geojson-points",
				layers: [],
			};
			const layer2: LayerDefinition = {
				id: "layer-2",
				type: "geojson-points",
				layers: [],
			};

			registry.registerLayer(layer1);
			registry.registerLayer(layer2);

			registry.clear();

			expect(registry.count).toBe(0);
			expect(registry.hasLayer("layer-1")).toBe(false);
			expect(registry.hasLayer("layer-2")).toBe(false);
		});
	});
});
