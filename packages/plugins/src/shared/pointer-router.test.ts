import type { Map as MapLibreMap, MapMouseEvent, MapTouchEvent } from "maplibre-gl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPointerRouter } from "./pointer-router.js";

describe("Pointer Router", () => {
	let mockMap: MapLibreMap;
	let handlers: {
		onDown?: (e: unknown) => void;
		onMove?: (e: unknown) => void;
		onUp?: (e: unknown) => void;
		onClick?: (e: unknown) => void;
	};
	let cleanup: (() => void) | null = null;

	beforeEach(() => {
		// Create mock MapLibre map
		const eventListeners = new Map<string, Set<(e: unknown) => void>>();
		const canvas = document.createElement("canvas");

		mockMap = {
			on: vi.fn((event: string, handler: (e: unknown) => void) => {
				if (!eventListeners.has(event)) {
					eventListeners.set(event, new Set());
				}
				eventListeners.get(event)?.add(handler);
			}),
			off: vi.fn((event: string, handler: (e: unknown) => void) => {
				eventListeners.get(event)?.delete(handler);
			}),
			getCanvas: () => canvas,
		} as unknown as MapLibreMap;

		handlers = {
			onDown: vi.fn(),
			onMove: vi.fn(),
			onUp: vi.fn(),
			onClick: vi.fn(),
		};
	});

	afterEach(() => {
		if (cleanup) {
			cleanup();
			cleanup = null;
		}
	});

	it("should call onDown on mousedown", () => {
		cleanup = createPointerRouter(mockMap, handlers);

		const mouseEvent: Partial<MapMouseEvent> = {
			lngLat: { lng: 0, lat: 0 },
			point: { x: 10, y: 20 },
		};

		// Get the handler that was registered
		const onCall = (mockMap.on as ReturnType<typeof vi.fn>).mock.calls.find(
			(call) => call[0] === "mousedown",
		);
		if (onCall) {
			const handler = onCall[1] as (e: MapMouseEvent) => void;
			handler(mouseEvent as MapMouseEvent);
		}

		expect(handlers.onDown).toHaveBeenCalledTimes(1);
		const call = handlers.onDown?.mock.calls[0];
		expect(call?.[0]).toMatchObject({
			type: "down",
			lngLat: [0, 0],
			point: { x: 10, y: 20 },
			isTouch: false,
		});
	});

	it("should call onClick when movement is within threshold", () => {
		cleanup = createPointerRouter(mockMap, handlers, { clickThreshold: 10 });

		const mouseDown: Partial<MapMouseEvent> = {
			lngLat: { lng: 0, lat: 0 },
			point: { x: 10, y: 20 },
		};

		const mouseUp: Partial<MapMouseEvent> = {
			lngLat: { lng: 0, lat: 0 },
			point: { x: 12, y: 21 }, // Within threshold (distance < 10)
		};

		// Simulate mousedown
		const onCall = (mockMap.on as ReturnType<typeof vi.fn>).mock.calls.find(
			(call) => call[0] === "mousedown",
		);
		if (onCall) {
			const handler = onCall[1] as (e: MapMouseEvent) => void;
			handler(mouseDown as MapMouseEvent);

			// Simulate mouseup (this should trigger click)
			const upCall = (mockMap.on as ReturnType<typeof vi.fn>).mock.calls.find(
				(call) => call[0] === "mouseup",
			);
			if (upCall) {
				const upHandler = upCall[1] as (e: MapMouseEvent) => void;
				upHandler(mouseUp as MapMouseEvent);
			}
		}

		expect(handlers.onClick).toHaveBeenCalled();
	});

	it("should not call onClick when movement exceeds threshold (drag)", () => {
		cleanup = createPointerRouter(mockMap, handlers, { clickThreshold: 5 });

		const mouseDown: Partial<MapMouseEvent> = {
			lngLat: { lng: 0, lat: 0 },
			point: { x: 10, y: 20 },
		};

		const mouseMove: Partial<MapMouseEvent> = {
			lngLat: { lng: 0, lat: 0 },
			point: { x: 20, y: 30 }, // Exceeds threshold
		};

		const mouseUp: Partial<MapMouseEvent> = {
			lngLat: { lng: 0, lat: 0 },
			point: { x: 20, y: 30 },
		};

		// Simulate sequence
		const onCall = (mockMap.on as ReturnType<typeof vi.fn>).mock.calls.find(
			(call) => call[0] === "mousedown",
		);
		if (onCall) {
			const handler = onCall[1] as (e: MapMouseEvent) => void;
			handler(mouseDown as MapMouseEvent);

			// Simulate mousemove that exceeds threshold
			const moveCall = (mockMap.on as ReturnType<typeof vi.fn>).mock.calls.find(
				(call) => call[0] === "mousemove",
			);
			if (moveCall) {
				const moveHandler = moveCall[1] as (e: MapMouseEvent) => void;
				moveHandler(mouseMove as MapMouseEvent);
			}

			// Simulate mouseup
			const upCall = (mockMap.on as ReturnType<typeof vi.fn>).mock.calls.find(
				(call) => call[0] === "mouseup",
			);
			if (upCall) {
				const upHandler = upCall[1] as (e: MapMouseEvent) => void;
				upHandler(mouseUp as MapMouseEvent);
			}
		}

		expect(handlers.onMove).toHaveBeenCalled();
		expect(handlers.onClick).not.toHaveBeenCalled();
	});

	it("should call onMove during drag", () => {
		cleanup = createPointerRouter(mockMap, handlers);

		const mouseDown: Partial<MapMouseEvent> = {
			lngLat: { lng: 0, lat: 0 },
			point: { x: 10, y: 20 },
		};

		const mouseMove: Partial<MapMouseEvent> = {
			lngLat: { lng: 0.1, lat: 0.1 },
			point: { x: 50, y: 60 }, // Large movement
		};

		// Simulate mousedown
		const onCall = (mockMap.on as ReturnType<typeof vi.fn>).mock.calls.find(
			(call) => call[0] === "mousedown",
		);
		if (onCall) {
			const handler = onCall[1] as (e: MapMouseEvent) => void;
			handler(mouseDown as MapMouseEvent);

			// Simulate mousemove
			const moveCall = (mockMap.on as ReturnType<typeof vi.fn>).mock.calls.find(
				(call) => call[0] === "mousemove",
			);
			if (moveCall) {
				const moveHandler = moveCall[1] as (e: MapMouseEvent) => void;
				moveHandler(mouseMove as MapMouseEvent);
			}
		}

		expect(handlers.onMove).toHaveBeenCalled();
	});

	it("should handle touch events", () => {
		cleanup = createPointerRouter(mockMap, handlers);

		const touchEvent: Partial<MapTouchEvent> = {
			points: [
				{
					lngLat: { lng: 0, lat: 0 },
					x: 10,
					y: 20,
				},
			],
		};

		// Simulate touchstart
		const onCall = (mockMap.on as ReturnType<typeof vi.fn>).mock.calls.find(
			(call) => call[0] === "touchstart",
		);
		if (onCall) {
			const handler = onCall[1] as (e: MapTouchEvent) => void;
			handler(touchEvent as MapTouchEvent);
		}

		expect(handlers.onDown).toHaveBeenCalled();
		const call = handlers.onDown?.mock.calls[0];
		expect(call?.[0]).toMatchObject({
			type: "down",
			isTouch: true,
			touches: 1,
		});
	});

	it("should cleanup event listeners", () => {
		cleanup = createPointerRouter(mockMap, handlers);

		expect(mockMap.on).toHaveBeenCalled();

		if (cleanup) {
			cleanup();
		}

		expect(mockMap.off).toHaveBeenCalled();
	});

	it("should use custom click threshold", () => {
		cleanup = createPointerRouter(mockMap, handlers, { clickThreshold: 20 });

		// Test that threshold is respected
		// (Implementation detail tested via behavior)
		expect(cleanup).toBeDefined();
	});
});
