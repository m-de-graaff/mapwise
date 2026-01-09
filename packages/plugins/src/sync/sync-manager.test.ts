import { describe, expect, it, vi, beforeEach } from "vitest";
import { SyncManager } from "./sync-manager";
import type { Map as MapLibreMap } from "maplibre-gl";

describe("SyncManager", () => {
	// Mock maps
	const map1 = {} as MapLibreMap;
	const map2 = {} as MapLibreMap;
	const map3 = {} as MapLibreMap;

	beforeEach(() => {
		// Reset manager state if possible.
		// Since it's a singleton, we might need a reset method or just use unique group IDs per test.
	});

	it("should register maps to a group", () => {
		const handler1 = vi.fn();
		const unregister = SyncManager.register("group-a", map1, handler1);

		expect(unregister).toBeDefined();
	});

	it("should notify other maps in the group", () => {
		const handler1 = vi.fn();
		const handler2 = vi.fn();

		SyncManager.register("group-b", map1, handler1);
		SyncManager.register("group-b", map2, handler2);

		const state = {
			center: { lng: 0, lat: 0 },
			zoom: 10,
			bearing: 0,
			pitch: 0,
		};

		// Notify from map1
		SyncManager.notify("group-b", map1, state);

		expect(handler2).toHaveBeenCalledWith(state);
		expect(handler1).not.toHaveBeenCalled(); // Should not notify source
	});

	it("should not notify maps in other groups", () => {
		const handler1 = vi.fn();
		const handler3 = vi.fn();

		SyncManager.register("group-c", map1, handler1);
		SyncManager.register("group-d", map3, handler3);

		const state = {
			center: { lng: 0, lat: 0 },
			zoom: 10,
			bearing: 0,
			pitch: 0,
		};

		SyncManager.notify("group-c", map1, state);

		expect(handler3).not.toHaveBeenCalled();
	});

	it("should stop notifying unregistered maps", () => {
		const handler1 = vi.fn();
		const handler2 = vi.fn();

		const unreg1 = SyncManager.register("group-e", map1, handler1);
		SyncManager.register("group-e", map2, handler2);

		unreg1();

		const state = {
			center: { lng: 0, lat: 0 },
			zoom: 10,
			bearing: 0,
			pitch: 0,
		};

		SyncManager.notify("group-e", map2, state);
		expect(handler1).not.toHaveBeenCalled();
	});
});
