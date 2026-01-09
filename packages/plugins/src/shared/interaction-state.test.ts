import { beforeEach, describe, expect, it } from "vitest";
import { createInteractionModeStore } from "./interaction-state";

describe("Interaction Mode Store", () => {
	let store: ReturnType<typeof createInteractionModeStore>;

	beforeEach(() => {
		store = createInteractionModeStore();
	});

	it("should register a mode", () => {
		const unregister = store.register("inspect", { exclusive: true });
		expect(store.isActive("inspect")).toBe(false);
		unregister();
	});

	it("should set mode as active", () => {
		store.register("inspect", { exclusive: true });
		store.setActive("inspect", true);
		expect(store.isActive("inspect")).toBe(true);
	});

	it("should deactivate other exclusive modes when activating one", () => {
		store.register("inspect", { exclusive: true, priority: 0 });
		store.register("draw", { exclusive: true, priority: 0 });
		store.register("measure", { exclusive: true, priority: 0 });

		store.setActive("inspect", true);
		expect(store.isActive("inspect")).toBe(true);
		expect(store.isActive("draw")).toBe(false);
		expect(store.isActive("measure")).toBe(false);

		store.setActive("draw", true);
		expect(store.isActive("inspect")).toBe(false);
		expect(store.isActive("draw")).toBe(true);
		expect(store.isActive("measure")).toBe(false);
	});

	it("should allow multiple non-exclusive modes to be active", () => {
		store.register("plugin-1", { exclusive: false });
		store.register("plugin-2", { exclusive: false });

		store.setActive("plugin-1", true);
		store.setActive("plugin-2", true);

		expect(store.isActive("plugin-1")).toBe(true);
		expect(store.isActive("plugin-2")).toBe(true);
		expect(store.getAllActive()).toContain("plugin-1");
		expect(store.getAllActive()).toContain("plugin-2");
	});

	it("should return active exclusive mode with highest priority", () => {
		store.register("inspect", { exclusive: true, priority: 0 });
		store.register("draw", { exclusive: true, priority: 10 });
		store.register("measure", { exclusive: true, priority: 5 });

		store.setActive("inspect", true);
		store.setActive("draw", true);
		store.setActive("measure", true);

		// Only the last activated exclusive mode should be active
		expect(store.getActiveMode()).toBe("measure");
	});

	it("should return null when no exclusive mode is active", () => {
		store.register("plugin-1", { exclusive: false });
		store.setActive("plugin-1", true);

		expect(store.getActiveMode()).toBeNull();
	});

	it("should call handler when handling interaction", () => {
		let handlerCalled = false;
		store.register("inspect", {
			exclusive: true,
			handler: () => {
				handlerCalled = true;
				return true;
			},
		});

		store.setActive("inspect", true);
		const handled = store.handleInteraction();

		expect(handled).toBe(true);
		expect(handlerCalled).toBe(true);
	});

	it("should return false if no handler or no active mode", () => {
		store.register("inspect", { exclusive: true });
		store.setActive("inspect", true);

		expect(store.handleInteraction()).toBe(false);
	});

	it("should unregister mode", () => {
		const unregister = store.register("inspect", { exclusive: true });
		store.setActive("inspect", true);
		unregister();

		expect(store.isActive("inspect")).toBe(false);
		expect(store.getActiveMode()).toBeNull();
	});

	it("should clear all modes", () => {
		store.register("plugin-1", { exclusive: true });
		store.register("plugin-2", { exclusive: false });
		store.setActive("plugin-1", true);
		store.setActive("plugin-2", true);

		store.clear();

		expect(store.getAllActive()).toEqual([]);
		expect(store.getActiveMode()).toBeNull();
	});

	it("should handle priority correctly", () => {
		store.register("low", { exclusive: true, priority: 0 });
		store.register("high", { exclusive: true, priority: 100 });

		store.setActive("low", true);
		store.setActive("high", true);

		expect(store.getActiveMode()).toBe("high");
	});
});
