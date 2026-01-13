import { describe, expect, it } from "vitest";
import type {
	CustomLayerDefinition,
	LayerCategory,
	LayerDefinition,
	LayerPosition,
	LayerState,
	MapLibreLayerDefinition,
} from "../registry/registry-types.js";
import { isCustomLayerDefinition, isMapLibreLayerDefinition } from "../registry/registry-types.js";

/**
 * Contract tests for Layer Definition invariants.
 *
 * These tests ensure that layer definitions maintain their contracts
 * and that type guards work correctly.
 */
describe("Layer Definition Contracts", () => {
	describe("LayerDefinition type", () => {
		it("should require id and type fields", () => {
			const layer: LayerDefinition = {
				id: "test-layer",
				type: "geojson-points",
				layers: [],
			};

			expect(layer.id).toBe("test-layer");
			expect(layer.type).toBe("geojson-points");
		});

		it("should support optional category", () => {
			const layer: LayerDefinition = {
				id: "test-layer",
				type: "geojson-points",
				category: "overlay",
				layers: [],
			};

			expect(layer.category).toBe("overlay");
		});

		it("should support optional metadata", () => {
			const layer: LayerDefinition = {
				id: "test-layer",
				type: "geojson-points",
				metadata: { title: "Test Layer", description: "A test layer" },
				layers: [],
			};

			expect(layer.metadata?.title).toBe("Test Layer");
		});
	});

	describe("MapLibreLayerDefinition", () => {
		it("should be identifiable by type guard", () => {
			const layer: MapLibreLayerDefinition = {
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
					},
				],
			};

			expect(isMapLibreLayerDefinition(layer)).toBe(true);
			expect(isCustomLayerDefinition(layer)).toBe(false);
		});

		it("should require source and layers", () => {
			const layer: MapLibreLayerDefinition = {
				id: "test-layer",
				type: "geojson-points",
				source: {
					id: "test-source",
					spec: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
				},
				layers: [],
			};

			expect(layer.source).toBeDefined();
			expect(layer.layers).toBeDefined();
		});
	});

	describe("CustomLayerDefinition", () => {
		it("should be identifiable by type guard", () => {
			const layer: CustomLayerDefinition = {
				id: "test-layer",
				type: "custom",
				apply: () => Promise.resolve(),
				remove: () => Promise.resolve(),
			};

			expect(isCustomLayerDefinition(layer)).toBe(true);
			expect(isMapLibreLayerDefinition(layer)).toBe(false);
		});

		it("should require apply and remove functions", () => {
			const layer: CustomLayerDefinition = {
				id: "test-layer",
				type: "custom",
				apply: async () => {
					// noop
				},
				remove: async () => {
					// noop
				},
			};

			expect(typeof layer.apply).toBe("function");
			expect(typeof layer.remove).toBe("function");
		});
	});

	describe("LayerState invariants", () => {
		it("should maintain state structure", () => {
			const state: LayerState = {
				id: "test-layer",
				type: "geojson-points",
				visible: true,
				opacity: 0.8,
				applied: false,
				order: 0,
				category: "overlay",
				metadata: {},
			};

			expect(state.id).toBe("test-layer");
			expect(state.visible).toBe(true);
			expect(state.opacity).toBe(0.8);
			expect(state.applied).toBe(false);
			expect(state.order).toBe(0);
		});

		it("should support opacity in 0-1 range", () => {
			const state: LayerState = {
				id: "test-layer",
				type: "geojson-points",
				visible: true,
				opacity: 0.5,
				applied: false,
				order: 0,
				category: "overlay",
				metadata: {},
			};

			expect(state.opacity).toBeGreaterThanOrEqual(0);
			expect(state.opacity).toBeLessThanOrEqual(1);
		});
	});

	describe("LayerCategory", () => {
		it("should support valid categories", () => {
			const categories: LayerCategory[] = ["base", "overlay", "annotation"];

			expect(categories).toContain("base");
			expect(categories).toContain("overlay");
			expect(categories).toContain("annotation");
		});
	});

	describe("LayerPosition", () => {
		it("should support top position", () => {
			const position: LayerPosition = { type: "top" };
			expect(position.type).toBe("top");
		});

		it("should support bottom position", () => {
			const position: LayerPosition = { type: "bottom" };
			expect(position.type).toBe("bottom");
		});

		it("should support index position", () => {
			const position: LayerPosition = { type: "index", index: 5 };
			expect(position.type).toBe("index");
			expect(position.index).toBe(5);
		});

		it("should support above position", () => {
			const position: LayerPosition = { type: "above", layerId: "other-layer" };
			expect(position.type).toBe("above");
			expect(position.layerId).toBe("other-layer");
		});

		it("should support below position", () => {
			const position: LayerPosition = { type: "below", layerId: "other-layer" };
			expect(position.type).toBe("below");
			expect(position.layerId).toBe("other-layer");
		});
	});
});
