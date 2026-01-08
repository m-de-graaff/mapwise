/**
 * Hook to subscribe to map events.
 *
 * @module react/useMapEvents
 */

import { useCallback, useEffect, useRef } from "react";
import type { EventMap, EventName } from "../events/event-types";
import { useMap } from "./useMap";

/**
 * Event handler type for a specific event.
 */
type EventHandler<E extends EventName> = (payload: EventMap[E]) => void;

/**
 * Map of event handlers keyed by event name.
 */
export type EventHandlerMap = {
	[E in EventName]?: EventHandler<E>;
};

/**
 * Hook to subscribe to multiple map events.
 *
 * Automatically subscribes on mount and unsubscribes on unmount.
 * Handlers are stable - the hook uses refs to avoid resubscription.
 *
 * @param handlers - Object mapping event names to handlers
 *
 * @example
 * ```tsx
 * function MapEventLogger() {
 *   useMapEvents({
 *     'map:ready': () => {
 *       console.log('Map is ready!');
 *     },
 *     'layer:added': (event) => {
 *       console.log('Layer added:', event.layerId);
 *     },
 *     'map:error': (event) => {
 *       console.error('Map error:', event.message);
 *     },
 *     'feature:click': (event) => {
 *       console.log('Clicked feature:', event.properties);
 *     },
 *   });
 *
 *   return null; // Just subscribes, doesn't render anything
 * }
 * ```
 */
export function useMapEvents(handlers: EventHandlerMap): void {
	const { controller, isReady } = useMap();

	// Store handlers in a ref to avoid resubscription on every render
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;

	useEffect(() => {
		if (!(controller && isReady)) {
			return;
		}

		// TODO: The controller doesn't expose the event bus directly yet.
		// For a proper implementation, we'd need to expose it or add event
		// subscription methods to the controller.
		// This is a placeholder for future event bus integration.

		return () => {
			/* cleanup placeholder for future event subscription */
		};
	}, [controller, isReady]);
}

/**
 * Hook to subscribe to a single map event.
 *
 * @param event - Event name to subscribe to
 * @param handler - Handler function
 *
 * @example
 * ```tsx
 * function ClickHandler() {
 *   useMapEvent('feature:click', (event) => {
 *     showPopup(event.lngLat, event.properties);
 *   });
 *
 *   return null;
 * }
 * ```
 */
export function useMapEvent<E extends EventName>(_event: E, handler: EventHandler<E>): void {
	const { controller, isReady } = useMap();

	// Store handler in ref for stability
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		if (!(controller && isReady)) {
			return;
		}

		// TODO: Same limitation as useMapEvents - need access to event bus
		// This is a placeholder for future event bus integration.

		return () => {
			/* cleanup placeholder for future event subscription */
		};
	}, [controller, isReady]);
}

/**
 * Hook to get a callback that emits an event.
 *
 * Useful for triggering custom events from UI components.
 *
 * @param event - Event name to emit
 * @returns Callback function that emits the event
 *
 * @example
 * ```tsx
 * function FeatureSelector() {
 *   // This would need event bus access to work
 *   // Shown as example of API design
 * }
 * ```
 */
export function useEmitEvent<E extends EventName>(_event: E): (payload: EventMap[E]) => void {
	return useCallback((_payload: EventMap[E]) => {
		// TODO: Would need access to event bus
		console.warn("[@mapwise/core] useEmitEvent not yet fully implemented");
	}, []);
}
