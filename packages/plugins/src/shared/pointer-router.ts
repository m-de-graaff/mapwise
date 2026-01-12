/**
 * Pointer event routing with normalized events and drag/click detection.
 *
 * @module shared/pointer-router
 */

// @ts-nocheck
import type { Map as MapLibreMap, MapMouseEvent, MapTouchEvent } from "maplibre-gl";

// =============================================================================
// Types
// =============================================================================

/**
 * Normalized pointer event that works for both mouse and touch.
 */
export interface NormalizedPointerEvent {
	/** Event type: 'down', 'move', 'up', 'click' */
	type: "down" | "move" | "up" | "click";
	/** Geographic coordinates [lng, lat] */
	lngLat: [number, number];
	/** Screen coordinates */
	point: { x: number; y: number };
	/** Original MapLibre event */
	original: MapMouseEvent | MapTouchEvent;
	/** Whether this is a touch event */
	isTouch: boolean;
	/** Number of touches (for touch events) */
	touches?: number;
}

/**
 * Pointer event handlers.
 */
export interface PointerHandlers {
	/** Called on pointer down (mouse down or touch start) */
	onDown?: (e: NormalizedPointerEvent) => void;
	/** Called on pointer move (only during drag) */
	onMove?: (e: NormalizedPointerEvent) => void;
	/** Called on pointer up (mouse up or touch end) */
	onUp?: (e: NormalizedPointerEvent) => void;
	/** Called on click (not a drag, within threshold) */
	onClick?: (e: NormalizedPointerEvent) => void;
}

/**
 * Options for pointer router.
 */
export interface PointerRouterOptions {
	/**
	 * Maximum distance (in pixels) a pointer can move between down and up
	 * to be considered a click rather than a drag.
	 *
	 * @default 5
	 */
	clickThreshold?: number;

	/**
	 * Maximum time (in milliseconds) between down and up for a click.
	 *
	 * @default 500
	 */
	clickMaxDuration?: number;
}

// =============================================================================
// Pointer Router
// =============================================================================

/**
 * Create a pointer router that normalizes mouse and touch events
 * and distinguishes between clicks and drags.
 */
export function createPointerRouter(
	map: MapLibreMap,
	handlers: PointerHandlers,
	options: PointerRouterOptions = {},
): () => void {
	const { clickThreshold = 5, clickMaxDuration = 500 } = options;

	let isDragging = false;
	let downEvent: NormalizedPointerEvent | null = null;
	let downTime: number | null = null;
	let moveHandler: ((e: MapMouseEvent | MapTouchEvent) => void) | null = null;
	let upHandler: ((e: MapMouseEvent | MapTouchEvent) => void) | null = null;
	let activeMouseLeaveHandler: (() => void) | null = null;
	let activeCanvas: HTMLCanvasElement | null = null;

	const normalizeMouseEvent = (
		type: "down" | "move" | "up" | "click",
		e: MapMouseEvent,
	): NormalizedPointerEvent => ({
		type,
		lngLat: [e.lngLat.lng, e.lngLat.lat],
		point: { x: e.point.x, y: e.point.y },
		original: e,
		isTouch: false,
	});

	const normalizeTouchEvent = (
		type: "down" | "move" | "up" | "click",
		e: MapTouchEvent,
	): NormalizedPointerEvent => {
		// For touch events, use the first touch point
		const touch = e.points[0];
		if (!touch) {
			// Fallback if no touch points (shouldn't happen, but handle gracefully)
			const center = map.getCenter();
			return {
				type,
				lngLat: [center.lng, center.lat],
				point: { x: 0, y: 0 },
				original: e,
				isTouch: true,
				touches: 0,
			};
		}
		return {
			type,
			lngLat: [touch.lngLat.lng, touch.lngLat.lat],
			point: { x: touch.x, y: touch.y },
			original: e,
			isTouch: true,
			touches: e.points.length,
		};
	};

	const handleDown = (e: MapMouseEvent | MapTouchEvent): void => {
		// Filter out non-left clicks (e.g. right click)
		if (
			"originalEvent" in e &&
			e.originalEvent instanceof MouseEvent &&
			e.originalEvent.button !== 0
		) {
			return;
		}

		const normalized =
			"points" in e ? normalizeTouchEvent("down", e) : normalizeMouseEvent("down", e);
		isDragging = false;
		downEvent = normalized;
		downTime = Date.now();

		if (handlers.onDown) {
			handlers.onDown(normalized);
		}

		// Set up move and up handlers
		moveHandler = (moveE: MapMouseEvent | MapTouchEvent) => {
			const moveNormalized =
				"points" in moveE ? normalizeTouchEvent("move", moveE) : normalizeMouseEvent("move", moveE);

			// Calculate distance from down point
			if (downEvent) {
				const dx = moveNormalized.point.x - downEvent.point.x;
				const dy = moveNormalized.point.y - downEvent.point.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				// If moved beyond threshold, it's a drag
				if (distance > clickThreshold) {
					isDragging = true;
				}
			}

			// Call move handler if dragging
			if (isDragging && handlers.onMove) {
				handlers.onMove(moveNormalized);
			}
		};

		upHandler = (upE: MapMouseEvent | MapTouchEvent) => {
			const upNormalized =
				"points" in upE ? normalizeTouchEvent("up", upE) : normalizeMouseEvent("up", upE);

			handlePointerUp(upNormalized);
			cleanupHandlers();
		};

		function handlePointerUp(upNormalized: NormalizedPointerEvent): void {
			const wasClick = determineIfClick();

			if (handlers.onUp) {
				handlers.onUp(upNormalized);
			}

			if (wasClick && downEvent && handlers.onClick) {
				handleClick();
			}
		}

		function determineIfClick(): boolean {
			const duration = downTime ? Date.now() - downTime : 0;
			return !isDragging && duration <= clickMaxDuration;
		}

		function handleClick(): void {
			if (!downEvent) {
				return;
			}
			// Create click event from down event (preserves original coordinates)
			const clickEvent: NormalizedPointerEvent = {
				...downEvent,
				type: "click",
			};
			handlers.onClick?.(clickEvent);
		}

		function cleanupHandlers(): void {
			isDragging = false;
			downEvent = null;
			downTime = null;
			moveHandler = null;
			upHandler = null;
			cleanupMouseLeaveHandler();
		}

		function cleanupMouseLeaveHandler(): void {
			if (activeMouseLeaveHandler && activeCanvas) {
				activeCanvas.removeEventListener("mouseleave", activeMouseLeaveHandler);
				activeMouseLeaveHandler = null;
				activeCanvas = null;
			}
		}

		// Attach move and up handlers
		if ("points" in e) {
			map.on("touchmove", moveHandler);
			map.on("touchend", upHandler);
			map.on("touchcancel", upHandler);
		} else {
			map.on("mousemove", moveHandler);
			map.on("mouseup", upHandler);
			// Also handle mouse leave from canvas
			activeCanvas = map.getCanvas();
			activeMouseLeaveHandler = () => {
				if (upHandler && downEvent) {
					// Create synthetic up event using current map center as fallback
					const center = map.getCenter();
					const syntheticUp = normalizeMouseEvent("up", {
						...e,
						lngLat: center,
						point: { x: 0, y: 0 },
					} as MapMouseEvent);
					upHandler(syntheticUp as MapMouseEvent);
				}
			};
			activeCanvas.addEventListener("mouseleave", activeMouseLeaveHandler, { once: true });
		}
	};

	// Attach down handlers
	const mouseDownHandler = (e: MapMouseEvent) => handleDown(e);
	const touchStartHandler = (e: MapTouchEvent) => handleDown(e);
	const dragStartHandler = () => {
		isDragging = true;
	};

	map.on("mousedown", mouseDownHandler);
	map.on("touchstart", touchStartHandler);
	map.on("dragstart", dragStartHandler);

	// Return cleanup function
	return () => {
		map.off("mousedown", mouseDownHandler);
		map.off("touchstart", touchStartHandler);
		map.off("dragstart", dragStartHandler);
		if (moveHandler) {
			map.off("mousemove", moveHandler);
			map.off("touchmove", moveHandler);
		}
		if (upHandler) {
			map.off("mouseup", upHandler);
			map.off("touchend", upHandler);
			map.off("touchcancel", upHandler);
		}
		if (activeMouseLeaveHandler && activeCanvas) {
			activeCanvas.removeEventListener("mouseleave", activeMouseLeaveHandler);
			activeMouseLeaveHandler = null;
			activeCanvas = null;
		}
	};
}
