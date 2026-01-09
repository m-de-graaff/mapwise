import { describe, expect, it, beforeEach } from "vitest";
import { MeasureStore } from "./measure-store";

describe("MeasureStore", () => {
	let store: MeasureStore;

	beforeEach(() => {
		store = new MeasureStore();
	});

	it("should initialize with idle mode", () => {
		expect(store.getState().mode).toBe("idle");
	});

	it("should switch modes", () => {
		store.setMode("distance");
		expect(store.getState().mode).toBe("distance");

		store.setMode("area");
		expect(store.getState().mode).toBe("area");
	});

	it("should accumulate points", () => {
		store.setMode("distance");
		store.addPoint([0, 0]);
		store.addPoint([1, 1]);

		expect(store.getState().points.length).toBe(2);
	});

	it("should calculate distance result", () => {
		store.setMode("distance");
		store.addPoint([0, 0]);
		store.addPoint([0.01, 0]); // Roughly 1.11km

		const result = store.getState().result;
		expect(result).not.toBeNull();
		if (result) {
			expect(result.value).toBeGreaterThan(1); // Should be > 1 km
			expect(result.unit).toBe("km");
		}
	});

	it("should finish measurement", () => {
		store.setMode("distance");
		store.addPoint([0, 0]);
		store.addPoint([1, 0]);
		store.finish();

		expect(store.getState().isFinished).toBe(true);
	});

	it("should cancel measurement", () => {
		store.setMode("distance");
		store.addPoint([0, 0]);
		store.cancel();

		expect(store.getState().mode).toBe("idle");
		expect(store.getState().points.length).toBe(0);
	});
});
