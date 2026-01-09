import { describe, expect, it, vi } from "vitest";
import {
	createPluginManager,
	type PluginManagerDependencies,
} from "../src/registry/plugin-registry";
import type { PluginDefinition } from "../src/registry/plugin-types";
import { createEventBus } from "../src/events/event-bus";

// Mocks
const mockMap = {
	on: vi.fn(),
	off: vi.fn(),
	getCenter: () => ({ lng: 0, lat: 0 }),
	getZoom: () => 0,
	getBearing: () => 0,
	getPitch: () => 0,
};
const mockDeps = {
	getMap: () =>
		mockMap as unknown as PluginManagerDependencies["getMap"] extends () => infer R ? R : never,
	getMapId: () => "map-1",
	isMapReady: () => true,
	layerRegistry: {} as unknown as PluginManagerDependencies["layerRegistry"],
	styleManager: {} as unknown as PluginManagerDependencies["styleManager"],
	eventBus: createEventBus(),
	interactionMode: {} as unknown as PluginManagerDependencies["interactionMode"],
	cursorManager: {} as unknown as PluginManagerDependencies["cursorManager"],
	keyboard: {} as unknown as PluginManagerDependencies["keyboard"],
};

describe("Plugin Persistence", () => {
	it("should serialize default state", async () => {
		const manager = createPluginManager(mockDeps as unknown as PluginManagerDependencies);
		const plugin: PluginDefinition = {
			id: "default-plugin",
			onRegister: (ctx) => {
				ctx.state.set("foo", "bar");
			},
		};

		await manager.register(plugin);

		const serialized = manager.serializePlugin("default-plugin");
		expect(serialized).toEqual({ foo: "bar" });
	});

	it("should use custom serializer", async () => {
		const manager = createPluginManager(mockDeps as unknown as PluginManagerDependencies);
		const plugin: PluginDefinition = {
			id: "custom-serialize",
			onRegister: () => {
				// no-op
			},
			persistence: {
				serialize: () => ({ custom: "data" }),
			},
		};

		await manager.register(plugin);

		const serialized = manager.serializePlugin("custom-serialize");
		expect(serialized).toEqual({ custom: "data" });
	});

	it("should hydrate default state", async () => {
		const manager = createPluginManager(mockDeps as unknown as PluginManagerDependencies);
		const plugin: PluginDefinition = {
			id: "default-hydrate",
			onRegister: () => {
				// no-op
			},
		};

		await manager.register(plugin);

		await manager.hydratePlugin("default-hydrate", { restored: "value" });

		const state = manager.getPluginStateStore("default-hydrate");
		expect(state?.get("restored")).toBe("value");
	});

	it("should use custom hydrator", async () => {
		const manager = createPluginManager(mockDeps as unknown as PluginManagerDependencies);
		const plugin: PluginDefinition = {
			id: "custom-hydrate",
			onRegister: () => {
				// no-op
			},
			persistence: {
				hydrate: (ctx, state) => {
					ctx.state.set("custom", state.data);
				},
			},
		};

		await manager.register(plugin);

		await manager.hydratePlugin("custom-hydrate", { data: "injected" });

		const state = manager.getPluginStateStore("custom-hydrate");
		expect(state?.get("custom")).toBe("injected");
	});

	it("should migrate state when version is old", async () => {
		const manager = createPluginManager(mockDeps as unknown as PluginManagerDependencies);
		const plugin: PluginDefinition = {
			id: "migration-plugin",
			onRegister: () => {
				// no-op
			},
			persistence: {
				schemaVersion: 2,
				migrate: (state, fromVersion) => {
					if (fromVersion === 1) {
						return { ...state, migrated: true, v1: false };
					}
					return state;
				},
			},
		};

		await manager.register(plugin);

		// Hydrate with old version
		await manager.hydratePlugin("migration-plugin", { v1: true }, 1);

		const state = manager.getPluginStateStore("migration-plugin");
		expect(state?.get("migrated")).toBe(true);
		expect(state?.get("v1")).toBe(false);
	});

	it("should not migrate if version matches", async () => {
		const manager = createPluginManager(mockDeps as unknown as PluginManagerDependencies);
		const migrate = vi.fn();
		const plugin: PluginDefinition = {
			id: "no-migration",
			onRegister: () => {
				// no-op
			},
			persistence: {
				schemaVersion: 2,
				migrate,
			},
		};

		await manager.register(plugin);

		await manager.hydratePlugin("no-migration", { data: "ok" }, 2);

		expect(migrate).not.toHaveBeenCalled();
		const state = manager.getPluginStateStore("no-migration");
		expect(state?.get("data")).toBe("ok");
	});
});
