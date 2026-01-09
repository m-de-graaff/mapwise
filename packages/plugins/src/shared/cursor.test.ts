import { beforeEach, describe, expect, it } from "vitest";
import { createCursorManager } from "./cursor";

describe("Cursor Manager", () => {
	let element: HTMLElement;
	let manager: ReturnType<typeof createCursorManager>;

	beforeEach(() => {
		element = document.createElement("div");
		manager = createCursorManager(element);
	});

	it("should set cursor", () => {
		const unset = manager.set("plugin-1", "pointer");
		expect(element.style.cursor).toBe("pointer");
		expect(manager.getCurrent()).toBe("pointer");
		unset();
	});

	it("should use highest priority cursor", () => {
		manager.set("plugin-1", "pointer", 0);
		manager.set("plugin-2", "crosshair", 10);
		manager.set("plugin-3", "grab", 5);

		expect(element.style.cursor).toBe("crosshair");
		expect(manager.getCurrent()).toBe("crosshair");
	});

	it("should update cursor when higher priority is set", () => {
		manager.set("plugin-1", "pointer", 10);
		expect(element.style.cursor).toBe("pointer");

		manager.set("plugin-2", "crosshair", 20);
		expect(element.style.cursor).toBe("crosshair");
	});

	it("should clear cursor for specific ID", () => {
		manager.set("plugin-1", "pointer");
		manager.set("plugin-2", "crosshair");

		manager.clear("plugin-1");
		expect(element.style.cursor).toBe("crosshair");
	});

	it("should reset cursor when all cleared", () => {
		manager.set("plugin-1", "pointer");
		manager.clearAll();

		expect(element.style.cursor).toBe("");
		expect(manager.getCurrent()).toBe("");
	});

	it("should replace cursor for same ID", () => {
		manager.set("plugin-1", "pointer", 10);
		manager.set("plugin-1", "crosshair", 10);

		expect(element.style.cursor).toBe("crosshair");
	});

	it("should return unset function", () => {
		const unset = manager.set("plugin-1", "pointer");
		expect(element.style.cursor).toBe("pointer");

		unset();
		expect(element.style.cursor).toBe("");
	});

	it("should handle multiple unset calls", () => {
		const unset = manager.set("plugin-1", "pointer");
		unset();
		unset(); // Should not throw
		expect(element.style.cursor).toBe("");
	});
});
