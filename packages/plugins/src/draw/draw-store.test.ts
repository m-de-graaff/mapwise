import { describe, expect, it, beforeEach } from "vitest";
import { DrawStore } from "./draw-store.js";
import type { LineString, Point, Polygon } from "geojson";

describe("DrawStore", () => {
	let store: DrawStore;

	beforeEach(() => {
		store = new DrawStore();
	});

	it("should initialize with static mode", () => {
		const state = store.getState();
		expect(state.mode).toBe("static");
		expect(state.features).toEqual([]);
	});

	it("should change modes", () => {
		let callCount = 0;
		store.subscribe(() => callCount++);

		store.setMode("draw_point");
		expect(store.getState().mode).toBe("draw_point");
		expect(callCount).toBe(1);
	});

	it("should add point feature", () => {
		store.setMode("draw_point");
		store.addVertex([0, 0]);

		const state = store.getState();
		expect(state.features.length).toBe(1);
		expect(state.features[0].geometry.type).toBe("Point");
		const geom = state.features[0].geometry as Point;
		expect(geom.coordinates).toEqual([0, 0]);
	});

	it("should draw distinct line feature", () => {
		store.setMode("draw_line");
		store.addVertex([0, 0]); // Start

		expect(store.getState().currentFeature).not.toBeNull();

		store.addVertex([1, 1]); // Next point

		store.finishDrawing();

		const state = store.getState();
		expect(state.features.length).toBe(1);
		expect(state.features[0].geometry.type).toBe("LineString");
		const geom = state.features[0].geometry as LineString;
		expect(geom.coordinates).toHaveLength(2);
	});

	it("should draw polygon feature", () => {
		store.setMode("draw_polygon");
		store.addVertex([0, 0]);
		store.addVertex([1, 0]);
		store.addVertex([1, 1]);

		store.finishDrawing(); // Should auto-close

		const state = store.getState();
		expect(state.features.length).toBe(1);
		const poly = state.features[0];
		expect(poly.geometry.type).toBe("Polygon");
		const ring = (poly.geometry as Polygon).coordinates[0];
		expect(ring).toHaveLength(4); // 3 points + closing point
		expect(ring[0]).toEqual(ring[3]);
	});

	it("should cancel drawing", () => {
		store.setMode("draw_line");
		store.addVertex([0, 0]);
		store.cancelDrawing();

		const state = store.getState();
		expect(state.currentFeature).toBeNull();
		expect(state.features).toHaveLength(0);
	});

	it("should delete selected feature", () => {
		store.setMode("draw_point");
		store.addVertex([0, 0]);
		const id = store.getState().features[0].id as string;

		store.select(id);
		store.deleteSelected();

		expect(store.getState().features).toHaveLength(0);
	});
});
