import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PluginContext } from "@mapwise/core";
import { createGeocoderPlugin } from "./geocoder-plugin";
import type { GeocoderProvider, GeocoderResult } from "./types";
import type { Map as MapLibreMap } from "maplibre-gl";

describe("Geocoder Plugin", () => {
	const mockProvider: GeocoderProvider = {
		search: vi.fn(),
		reverse: vi.fn(),
	};

	const mockMap = {
		flyTo: vi.fn(),
		fitBounds: vi.fn(),
	} as unknown as MapLibreMap;

	const mockEvents = {
		emit: vi.fn(),
		on: vi.fn((_event, _handler) => {
			// handlers[event] = handler;
		}),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create plugin", () => {
		const plugin = createGeocoderPlugin({ provider: mockProvider });
		expect(plugin.id).toBe("@mapwise/geocoder");
	});

	it("should perform search and emit results", async () => {
		// Setup mock response
		const mockResults: GeocoderResult[] = [{ id: "1", name: "Result 1", center: [0, 0] }];
		vi.mocked(mockProvider.search).mockResolvedValue(mockResults);

		const plugin = createGeocoderPlugin({ provider: mockProvider });
		plugin.onRegister({ map: mockMap, events: mockEvents } as unknown as PluginContext);

		// Find the search handler registered to the event bus
		const mockedOn = mockEvents.on as unknown as {
			mock: { calls: [string, (data: unknown) => void][] };
		};
		const searchHandler = mockedOn.mock.calls.find(
			(call) => call[0] === "plugin:@mapwise/geocoder:search",
		)?.[1];

		if (!searchHandler) {
			throw new Error("Handler not found");
		}

		// Trigger search
		await searchHandler({ query: "test" });

		expect(mockProvider.search).toHaveBeenCalledWith("test");
		expect(mockEvents.emit).toHaveBeenCalledWith("plugin:@mapwise/geocoder:results", {
			query: "test",
			results: mockResults,
		});
	});

	it("should handle flyTo on selection if enabled", () => {
		const plugin = createGeocoderPlugin({ provider: mockProvider, flyToSelected: true });
		plugin.onRegister({ map: mockMap, events: mockEvents } as unknown as PluginContext);

		const mockedOn = mockEvents.on as unknown as {
			mock: { calls: [string, (data: unknown) => void][] };
		};
		const selectHandler = mockedOn.mock.calls.find(
			(call) => call[0] === "plugin:@mapwise/geocoder:select",
		)?.[1];

		if (!selectHandler) {
			throw new Error("Handler not found");
		}

		const result: GeocoderResult = { id: "1", name: "A", center: [10, 20] };

		selectHandler({ result }); // Simulate UI selecting a result

		expect(mockMap.flyTo).toHaveBeenCalledWith(
			expect.objectContaining({
				center: [10, 20],
			}),
		);
	});
});
