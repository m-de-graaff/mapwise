import { describe, expect, it, vi } from "vitest";
import { createDrawPlugin } from "./draw-plugin.js";
import type { PluginContext } from "@mapwise/core";

// Mock dependencies
vi.mock("../shared/pointer-router", () => ({
	createPointerRouter: vi.fn(() => vi.fn()),
}));

vi.mock("./render-layer", () => {
	return {
		RenderLayer: vi.fn().mockImplementation(() => ({
			mount: vi.fn(),
			update: vi.fn(),
			unmount: vi.fn(),
		})),
	};
});

describe("DrawPlugin Lifecycle", () => {
	it("should register and clean up correctly", async () => {
		const plugin = createDrawPlugin({ enabled: true });

		// Mock Context
		const unregisterMode = vi.fn();
		const mockContext = {
			map: {
				on: vi.fn(),
				off: vi.fn(),
			},
			events: {
				emit: vi.fn(),
				on: vi.fn(),
			},
			interactionMode: {
				register: vi.fn(() => unregisterMode),
				setActive: vi.fn(),
				isActive: vi.fn(() => true),
			},
			cursorManager: {
				set: vi.fn(),
				clear: vi.fn(),
			},
			keyboard: {
				register: vi.fn(() => vi.fn()),
			},
		} as unknown as PluginContext;

		// Register
		const cleanup = await plugin.onRegister(mockContext);

		// Assert Registration
		expect(mockContext.interactionMode.register).toHaveBeenCalledWith(
			"@mapwise/draw",
			expect.any(Object),
		);
		expect(mockContext.interactionMode.setActive).toHaveBeenCalledWith("@mapwise/draw", true);
		expect(mockContext.keyboard.register).toHaveBeenCalled(); // shortcuts

		// Unregister/Cleanup
		expect(typeof cleanup).toBe("function");
		if (typeof cleanup === "function") {
			cleanup();
		}

		// Assert Cleanup
		expect(unregisterMode).toHaveBeenCalled();
		// Since we mocked RenderLayer, we verify its unmount was called if we could access the instance.
		// But verifying interactions were unregistered is key.
	});

	it("should respect enabled config", async () => {
		const plugin = createDrawPlugin({ enabled: false });

		const mockContext = {
			map: { on: vi.fn(), off: vi.fn() },
			events: { emit: vi.fn(), on: vi.fn() },
			interactionMode: {
				register: vi.fn(() => vi.fn()),
				setActive: vi.fn(),
				isActive: vi.fn(() => false),
			},
			cursorManager: { set: vi.fn(), clear: vi.fn() },
			keyboard: { register: vi.fn(() => vi.fn()) },
		} as unknown as PluginContext;

		await plugin.onRegister(mockContext);
		expect(mockContext.interactionMode.setActive).toHaveBeenCalledWith("@mapwise/draw", false);
	});
});
