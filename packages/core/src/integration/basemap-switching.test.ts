import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createMap } from "../map/create-map";
import type { MapController } from "../map/create-map";

/**
 * Integration tests for basemap switching.
 *
 * These tests verify that basemap switching works correctly
 * and preserves layers across style changes.
 */
describe("Basemap Switching Integration", () => {
	let container: HTMLDivElement;
	let controller: MapController;

	beforeAll(() => {
		// Mock MapLibre GL
		vi.mock("maplibre-gl", () => {
			return {
				Map: class MockMap {
					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					private listeners: Record<string, ((e: any) => void)[]> = {};
					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					private layers: any[] = [];
					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					private sources: Record<string, any> = {};
					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					private style: any = { layers: [] };

					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					constructor(_options: any) {
						setTimeout(() => {
							this.emit("load", {});
						}, 0);
					}

					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					on(event: string, listener: (e: any) => void) {
						this.listeners[event] = this.listeners[event] || [];
						this.listeners[event].push(listener);
						return this;
					}

					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					once(event: string, listener: (e: any) => void) {
						// biome-ignore lint/suspicious/noExplicitAny: mock implementation
						const onceListener = (e: any) => {
							listener(e);
							this.off(event, onceListener);
						};
						return this.on(event, onceListener);
					}

					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					off(event: string, listener: (e: any) => void) {
						if (!this.listeners[event]) {
							return this;
						}
						this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
						return this;
					}

					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					emit(event: string, data: any = {}) {
						if (this.listeners[event]) {
							for (const listener of this.listeners[event]) {
								listener(data);
							}
						}
					}

					remove() {
						this.listeners = {};
					}

					resize() {
						// Mock implementation
					}

					getStyle() {
						return this.style;
					}

					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					setStyle(style: any) {
						this.style = typeof style === "string" ? { layers: [] } : style;
						setTimeout(() => {
							this.emit("style.load", {});
						}, 10);
					}

					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					addLayer(layer: any) {
						this.layers.push(layer);
					}

					getLayer(id: string) {
						return this.layers.find((l) => l.id === id);
					}

					removeLayer(id: string) {
						this.layers = this.layers.filter((l) => l.id !== id);
					}

					// biome-ignore lint/suspicious/noExplicitAny: mock implementation
					addSource(id: string, source: any) {
						this.sources[id] = source;
					}

					getSource(id: string) {
						return this.sources[id];
					}

					removeSource(id: string) {
						delete this.sources[id];
					}

					setFeatureState() {
						// Mock implementation
					}
					removeFeatureState() {
						// Mock implementation
					}
				},
			};
		});
	});

	beforeEach(() => {
		container = document.createElement("div");
		container.style.width = "400px";
		container.style.height = "400px";
		document.body.appendChild(container);
	});

	afterEach(() => {
		if (controller) {
			controller.destroy();
		}
		if (container.parentNode) {
			container.parentNode.removeChild(container);
		}
	});

	it("should create a map instance", async () => {
		controller = createMap(container, {
			style: "https://demotiles.maplibre.org/style.json",
			center: [0, 0],
			zoom: 2,
		});

		expect(controller.id).toBeDefined();
		expect(controller.state).toBe("creating");

		await controller.awaitReady();

		expect(controller.isReady).toBe(true);
		expect(controller.state).toBe("ready");
	});

	it("should switch basemap styles", async () => {
		controller = createMap(container, {
			style: "https://demotiles.maplibre.org/style.json",
			center: [0, 0],
			zoom: 2,
		});

		await controller.awaitReady();

		const result = await controller.setBasemap("https://demotiles.maplibre.org/style.json", {
			timeout: 5000,
		});

		expect(result.success).toBe(true);
		expect(result.durationMs).toBeGreaterThan(0);
	});

	it("should preserve layers across basemap changes", async () => {
		controller = createMap(container, {
			style: "https://demotiles.maplibre.org/style.json",
			center: [0, 0],
			zoom: 2,
		});

		await controller.awaitReady();

		// Register a layer
		controller.layers.registerLayer({
			id: "test-layer",
			type: "geojson-points",
			source: {
				id: "test-source",
				spec: {
					type: "geojson",
					data: {
						type: "FeatureCollection",
						features: [],
					},
				},
			},
			layers: [
				{
					id: "test-layer",
					type: "circle",
					source: "test-source",
					paint: { "circle-radius": 5 },
				},
			],
		});

		// Wait for layer to be applied
		await new Promise((resolve) => setTimeout(resolve, 100));

		const beforeCount = controller.layers.count;

		// Switch basemap
		await controller.setBasemap("https://demotiles.maplibre.org/style.json", {
			timeout: 5000,
		});

		// Layer should still be registered
		expect(controller.layers.count).toBe(beforeCount);
		expect(controller.layers.hasLayer("test-layer")).toBe(true);
	});
});
