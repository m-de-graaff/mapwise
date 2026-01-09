import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createKeyboardManager } from "./keyboard-manager";

describe("Keyboard Manager", () => {
	let manager: ReturnType<typeof createKeyboardManager>;
	let handler: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		manager = createKeyboardManager();
		handler = vi.fn();
	});

	afterEach(() => {
		manager.destroy();
	});

	it("should register and trigger hotkey", () => {
		const unregister = manager.register("test", "i", handler);

		const event = new KeyboardEvent("keydown", { key: "i" });
		window.dispatchEvent(event);

		expect(handler).toHaveBeenCalledTimes(1);
		unregister();
	});

	it("should handle key combinations", () => {
		manager.register("test", "Ctrl+z", handler);

		const event = new KeyboardEvent("keydown", { key: "z", ctrlKey: true });
		window.dispatchEvent(event);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("should handle Shift+Ctrl combinations", () => {
		manager.register("test", "Ctrl+Shift+z", handler);

		const event = new KeyboardEvent("keydown", {
			key: "z",
			ctrlKey: true,
			shiftKey: true,
		});
		window.dispatchEvent(event);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("should not trigger if modifiers don't match", () => {
		manager.register("test", "Ctrl+z", handler);

		const event = new KeyboardEvent("keydown", { key: "z" }); // No Ctrl
		window.dispatchEvent(event);

		expect(handler).not.toHaveBeenCalled();
	});

	it("should use priority (higher priority handles first)", () => {
		const handler1 = vi.fn(() => false); // Return false to allow propagation
		const handler2 = vi.fn();

		manager.register("low", "i", handler1, 0);
		manager.register("high", "i", handler2, 10);

		const event = new KeyboardEvent("keydown", { key: "i" });
		window.dispatchEvent(event);

		// High priority should be called first, but since handler1 returns false, both should be called
		expect(handler2).toHaveBeenCalledTimes(1);
		expect(handler1).toHaveBeenCalledTimes(1);
	});

	it("should prevent default when handler returns non-false", () => {
		const event = new KeyboardEvent("keydown", { key: "i", cancelable: true });
		const preventDefault = vi.spyOn(event, "preventDefault");

		manager.register("test", "i", handler);

		window.dispatchEvent(event);

		expect(preventDefault).toHaveBeenCalled();
	});

	it("should unregister hotkey", () => {
		const unregister = manager.register("test", "i", handler);
		unregister();

		const event = new KeyboardEvent("keydown", { key: "i" });
		window.dispatchEvent(event);

		expect(handler).not.toHaveBeenCalled();
	});

	it("should enable/disable specific hotkey", () => {
		manager.register("test", "i", handler);
		manager.setEnabled("test", false);

		const event = new KeyboardEvent("keydown", { key: "i" });
		window.dispatchEvent(event);

		expect(handler).not.toHaveBeenCalled();

		manager.setEnabled("test", true);
		window.dispatchEvent(event);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("should enable/disable all hotkeys", () => {
		manager.register("test", "i", handler);
		manager.setEnabledAll(false);

		const event = new KeyboardEvent("keydown", { key: "i" });
		window.dispatchEvent(event);

		expect(handler).not.toHaveBeenCalled();

		manager.setEnabledAll(true);
		window.dispatchEvent(event);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("should check if enabled", () => {
		expect(manager.isEnabled()).toBe(true);

		manager.setEnabledAll(false);
		expect(manager.isEnabled()).toBe(false);

		manager.setEnabledAll(true);
		expect(manager.isEnabled()).toBe(true);
	});

	it("should handle Escape key", () => {
		manager.register("test", "Escape", handler);

		const event = new KeyboardEvent("keydown", { key: "Escape" });
		window.dispatchEvent(event);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("should clean up on destroy", () => {
		manager.register("test", "i", handler);
		manager.destroy();

		const event = new KeyboardEvent("keydown", { key: "i" });
		window.dispatchEvent(event);

		expect(handler).not.toHaveBeenCalled();
	});
});
