import { describe, expect, it } from "vitest";
import type {
	PluginContext,
	PluginDefinition,
	PluginLifecycleHooks,
	PluginStateStore,
} from "../registry/plugin-types";

/**
 * Contract tests for Plugin API stability.
 *
 * These tests ensure that the plugin API contract remains stable
 * and that plugins can rely on specific behaviors.
 */
describe("Plugin API Contracts", () => {
	describe("PluginDefinition structure", () => {
		it("should require id and onRegister fields", () => {
			// This is a type-level test - TypeScript will error if id is missing
			const plugin: PluginDefinition = {
				id: "test-plugin",
				onRegister: () => {
					// noop
				},
			};

			expect(plugin.id).toBe("test-plugin");
		});

		it("should support optional lifecycle hooks", () => {
			const plugin: PluginDefinition = {
				id: "test-plugin",
				onRegister: () => {
					// noop
				},
				onMapReady: () => {
					// noop
				},
				onDestroy: () => {
					// noop
				},
			};

			expect(plugin.onRegister).toBeDefined();
			expect(plugin.onMapReady).toBeDefined();
			expect(plugin.onDestroy).toBeDefined();
		});

		it("should support dependencies", () => {
			const plugin: PluginDefinition = {
				id: "test-plugin",
				onRegister: () => {
					// noop
				},
				dependencies: ["plugin-1", "plugin-2"],
			};

			expect(plugin.dependencies).toEqual(["plugin-1", "plugin-2"]);
		});
	});

	describe("PluginContext contract", () => {
		it("should provide mapId accessor", () => {
			// Type-level test - verify structure exists
			const ctx: PluginContext = {
				get mapId() {
					return "test-map";
				},
				get map() {
					throw new Error("Not implemented");
				},
				get layers() {
					throw new Error("Not implemented");
				},
				get style() {
					throw new Error("Not implemented");
				},
				get events() {
					throw new Error("Not implemented");
				},
				get state() {
					throw new Error("Not implemented");
				},
				getViewport: () => ({
					center: [0, 0],
					zoom: 0,
					bearing: 0,
					pitch: 0,
				}),
				log: () => {
					// noop
				},
			};

			expect(ctx.mapId).toBe("test-map");
		});

		it("should provide viewport getter", () => {
			const ctx: PluginContext = {
				get mapId() {
					return "test-map";
				},
				get map() {
					throw new Error("Not implemented");
				},
				get layers() {
					throw new Error("Not implemented");
				},
				get style() {
					throw new Error("Not implemented");
				},
				get events() {
					throw new Error("Not implemented");
				},
				get state() {
					throw new Error("Not implemented");
				},
				getViewport: () => ({
					center: [1, 2],
					zoom: 3,
					bearing: 4,
					pitch: 5,
				}),
				log: () => {
					// noop
				},
			};

			const viewport = ctx.getViewport();
			expect(viewport.center).toEqual([1, 2]);
			expect(viewport.zoom).toBe(3);
			expect(viewport.bearing).toBe(4);
			expect(viewport.pitch).toBe(5);
		});
	});

	describe("PluginStateStore contract", () => {
		it("should support get/set/has/delete operations", () => {
			const store: PluginStateStore = {
				get: <T>(_key: string): T | undefined => {
					return undefined;
				},
				set: <T>(_key: string, _value: T): void => {
					// noop
				},
				has: (_key: string): boolean => {
					return false;
				},
				delete: (_key: string): boolean => {
					return false;
				},
				clear: (): void => {
					// noop
				},
			};

			expect(typeof store.get).toBe("function");
			expect(typeof store.set).toBe("function");
			expect(typeof store.has).toBe("function");
			expect(typeof store.delete).toBe("function");
			expect(typeof store.clear).toBe("function");
		});
	});

	describe("PluginLifecycleHooks contract", () => {
		it("should support all lifecycle hooks", () => {
			const hooks: PluginLifecycleHooks = {
				onMapReady: () => {
					// noop
				},
				onStyleChangeStart: () => {
					// noop
				},
				onStyleChangeComplete: () => {
					// noop
				},
				onLayerAdded: () => {
					// noop
				},
				onLayerRemoved: () => {
					// noop
				},
				onResize: () => {
					// noop
				},
				onViewportChange: () => {
					// noop
				},
				onDestroy: () => {
					// noop
				},
			};

			expect(typeof hooks.onMapReady).toBe("function");
			expect(typeof hooks.onDestroy).toBe("function");
			expect(typeof hooks.onLayerAdded).toBe("function");
		});
	});
});
