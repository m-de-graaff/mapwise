import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEventBus } from "../events/event-bus.js";
import { createStyleManager } from "../map/style-manager.js";
import { createLayerRegistry } from "./layer-registry.js";
import { createPluginManager } from "./plugin-registry.js";
import type { PluginDefinition } from "./plugin-types.js";

describe("PluginRegistry", () => {
	let pluginManager: ReturnType<typeof createPluginManager>;
	let mockMap: unknown;
	let eventBus: ReturnType<typeof createEventBus>;
	let layerRegistry: ReturnType<typeof createLayerRegistry>;
	let styleManager: ReturnType<typeof createStyleManager>;

	beforeEach(() => {
		mockMap = null;
		eventBus = createEventBus();
		layerRegistry = createLayerRegistry(() => mockMap, eventBus);
		styleManager = createStyleManager(() => mockMap, eventBus);

		pluginManager = createPluginManager({
			getMap: () => mockMap,
			getMapId: () => "test-map",
			isMapReady: () => false,
			layerRegistry,
			styleManager,
			eventBus,
		});
	});

	describe("register", () => {
		it("should register a plugin", async () => {
			const plugin: PluginDefinition = {
				id: "test-plugin",
				name: "Test Plugin",
				version: "1.0.0",
				onRegister: vi.fn(),
			};

			await pluginManager.register(plugin);

			expect(pluginManager.has("test-plugin")).toBe(true);
			expect(pluginManager.count).toBe(1);
		});

		it("should throw if plugin ID already exists", async () => {
			const plugin: PluginDefinition = {
				id: "test-plugin",
				onRegister: vi.fn(),
			};

			await pluginManager.register(plugin);

			await expect(pluginManager.register(plugin)).rejects.toThrow(
				'Plugin "test-plugin" is already registered',
			);
		});

		it("should validate dependencies", async () => {
			const plugin: PluginDefinition = {
				id: "dependent-plugin",
				dependencies: ["missing-plugin"],
				onRegister: vi.fn(),
			};

			await expect(pluginManager.register(plugin)).rejects.toThrow(
				'requires plugin "missing-plugin" which is not registered',
			);
		});
	});

	describe("unregister", () => {
		it("should unregister a plugin", async () => {
			const plugin: PluginDefinition = {
				id: "test-plugin",
				onRegister: vi.fn(),
			};

			await pluginManager.register(plugin);
			const result = await pluginManager.unregister("test-plugin");

			expect(result).toBe(true);
			expect(pluginManager.has("test-plugin")).toBe(false);
		});

		it("should return false if plugin does not exist", async () => {
			const result = await pluginManager.unregister("non-existent");
			expect(result).toBe(false);
		});

		it("should prevent unregistering if other plugins depend on it", async () => {
			const basePlugin: PluginDefinition = {
				id: "base-plugin",
				onRegister: vi.fn(),
			};
			const dependentPlugin: PluginDefinition = {
				id: "dependent-plugin",
				dependencies: ["base-plugin"],
				onRegister: vi.fn(),
			};

			await pluginManager.register(basePlugin);
			await pluginManager.register(dependentPlugin);

			await expect(pluginManager.unregister("base-plugin")).rejects.toThrow(
				'Cannot unregister plugin "base-plugin"',
			);
		});
	});

	describe("lifecycle hooks", () => {
		it("should call onRegister hook", async () => {
			const onRegister = vi.fn();
			const plugin: PluginDefinition = {
				id: "test-plugin",
				onRegister,
			};

			await pluginManager.register(plugin);

			expect(onRegister).toHaveBeenCalledOnce();
		});

		it("should call onMapReady when map becomes ready", async () => {
			const onMapReady = vi.fn();
			const plugin: PluginDefinition = {
				id: "test-plugin",
				onRegister: vi.fn(),
				onMapReady,
			};

			await pluginManager.register(plugin);
			await pluginManager.notifyMapReady();

			expect(onMapReady).toHaveBeenCalledOnce();
		});

		it("should call onDestroy hook", async () => {
			const onDestroy = vi.fn();
			const plugin: PluginDefinition = {
				id: "test-plugin",
				onRegister: vi.fn(),
				onDestroy,
			};

			await pluginManager.register(plugin);
			await pluginManager.notifyDestroy();

			expect(onDestroy).toHaveBeenCalledOnce();
		});
	});

	describe("getPluginState", () => {
		it("should return plugin state", async () => {
			const plugin: PluginDefinition = {
				id: "test-plugin",
				name: "Test Plugin",
				version: "1.0.0",
				onRegister: vi.fn(),
			};

			await pluginManager.register(plugin);

			const state = pluginManager.getPluginState("test-plugin");
			expect(state?.id).toBe("test-plugin");
			expect(state?.name).toBe("Test Plugin");
			expect(state?.version).toBe("1.0.0");
		});
	});
});
