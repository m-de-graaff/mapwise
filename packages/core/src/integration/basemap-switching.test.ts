import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
