import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import type { PluginContext } from "@mapwise/core";
import { createInspectPlugin } from "./inspect-plugin.js";
import type { Map as MapLibreMap } from "maplibre-gl";

// Mock dependencies
const mockMap = {
	queryRenderedFeatures: vi.fn(),
	setFeatureState: vi.fn(),
	on: vi.fn(),
	off: vi.fn(),
	getCanvas: vi.fn(() => ({
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		style: {},
	})),
} as unknown as MapLibreMap;

const mockEvents = {
	emit: vi.fn(),
	on: vi.fn(),
	off: vi.fn(),
};

const mockInteractionMode = {
	register: vi.fn(() => vi.fn()),
	setActive: vi.fn(),
	isActive: vi.fn(() => true),
};

const mockCursorManager = {
	set: vi.fn(),
	clear: vi.fn(),
};

describe("Inspect Plugin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create plugin definition", () => {
		const plugin = createInspectPlugin({});
		expect(plugin.id).toBe("@mapwise/inspect");
		expect(plugin.name).toBe("Inspect");
	});

	it("should register and setup listeners", () => {
		const plugin = createInspectPlugin({});
		const cleanup = plugin.onRegister({
			map: mockMap,
			events: mockEvents,
			interactionMode: mockInteractionMode,
			cursorManager: mockCursorManager,
		} as unknown as PluginContext);

		expect(mockInteractionMode.register).toHaveBeenCalledWith(
			"@mapwise/inspect",
			expect.objectContaining({ priority: 0, exclusive: true }),
		);
		expect(mockMap.on).toHaveBeenCalledWith("mousedown", expect.any(Function));

		// Cleanup
		if (typeof cleanup === "function") {
			cleanup();
		}
		expect(mockMap.off).toHaveBeenCalled();
	});

	it("should query features and emit event on click", () => {
		const plugin = createInspectPlugin({});
		plugin.onRegister({
			map: mockMap,
			events: mockEvents,
			interactionMode: mockInteractionMode,
			cursorManager: mockCursorManager,
		} as unknown as PluginContext);

		// Mock query response
		const mockFeature = {
			id: 1,
			source: "test-source",
			layer: { id: "test-layer" },
		};
		(mockMap.queryRenderedFeatures as Mock).mockReturnValue([mockFeature]);

		// Find the mousedown handler
		const mockedOn = mockMap.on as Mock;
		const mousedownCall = mockedOn.mock.calls.find((call) => call[0] === "mousedown");

		if (!mousedownCall) {
			console.error("Available calls:", (mockMap.on as Mock).mock.calls);
			throw new Error("Could not find mousedown handler registration");
		}

		const mousedownHandler = mousedownCall[1] as (e: unknown) => void;

		// Simulate down (this should attach mouseup)
		mousedownHandler({
			lngLat: { lng: 0, lat: 0 },
			point: { x: 0, y: 0 },
			originalEvent: {},
		});

		// Now find mouseup handler (it should be attached now)
		const mouseupCallAfterDown = mockedOn.mock.calls.find((call) => call[0] === "mouseup");

		if (!mouseupCallAfterDown) {
			// Debug why mouseup wasn't attached
			throw new Error("Mouseup handler was not attached after mousedown");
		}

		const mouseupHandler = mouseupCallAfterDown[1] as (e: unknown) => void;

		mouseupHandler({
			lngLat: { lng: 0, lat: 0 },
			point: { x: 0, y: 0 },
			originalEvent: {},
		});

		expect(mockMap.queryRenderedFeatures).toHaveBeenCalled();
		expect(mockEvents.emit).toHaveBeenCalledWith(
			"plugin:@mapwise/inspect:click",
			expect.objectContaining({
				features: [mockFeature],
			}),
		);
	});

	it("should highlight feature on click", () => {
		const plugin = createInspectPlugin({ highlight: true });
		plugin.onRegister({
			map: mockMap,
			events: mockEvents,
			interactionMode: mockInteractionMode,
			cursorManager: mockCursorManager,
		} as unknown as PluginContext);

		const mockFeature = {
			id: 1,
			source: "test-source",
			sourceLayer: "test-source-layer",
			layer: { id: "test-layer" },
		};
		(mockMap.queryRenderedFeatures as Mock).mockReturnValue([mockFeature]);

		// Trigger click
		// Find mousedown handler
		const mockedOn = mockMap.on as Mock;
		const mousedownHandler = mockedOn.mock.calls.find((call) => call[0] === "mousedown")?.[1] as (
			e: unknown,
		) => void;

		if (!mousedownHandler) {
			throw new Error("Mousedown handler not found");
		}

		// Simulate down
		mousedownHandler({
			lngLat: { lng: 0, lat: 0 },
			point: { x: 0, y: 0 },
			originalEvent: {},
		});

		// Find mouseup handler (attached dynamically)
		const mouseupHandler = mockedOn.mock.calls.find((call) => call[0] === "mouseup")?.[1] as (
			e: unknown,
		) => void;

		if (!mouseupHandler) {
			throw new Error("Mouseup handler not found");
		}

		mouseupHandler({
			lngLat: { lng: 0, lat: 0 },
			point: { x: 0, y: 0 },
			originalEvent: {},
		});

		expect(mockMap.setFeatureState).toHaveBeenCalledWith(
			{ source: "test-source", sourceLayer: "test-source-layer", id: 1 },
			{ highlight: true },
		);
	});
});
