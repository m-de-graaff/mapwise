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

		// Store unsubscribe functions
		const unsubs: Array<() => void> = [];

		for (const eventName of Object.keys(handlersRef.current)) {
			const typedName = eventName as EventName;

			const listener = (payload: EventMap[EventName]) => {
				const currentHandler = handlersRef.current[typedName];
				if (currentHandler) {
					(currentHandler as (p: EventMap[EventName]) => void)(payload);
				}
			};

			const unsub = controller.events.on(typedName, listener);
			unsubs.push(unsub);
		}

		return () => {
			for (const unsub of unsubs) {
				unsub();
			}
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
export function useMapEvent<E extends EventName>(event: E, handler: EventHandler<E>): void {
	const { controller, isReady } = useMap();

	// Store handler in ref for stability
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		if (!(controller && isReady)) {
			return;
		}

		const listener = (payload: EventMap[E]) => {
			handlerRef.current?.(payload);
		};

		// EventBus.on returns an unsubscribe function
		const unsub = controller.events.on(event, listener);

		return () => {
			unsub();
		};
	}, [controller, isReady, event]);
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
 *   const emitClick = useEmitEvent('feature:click');
 *   // ...
 *   emitClick({ ... });
 * }
 * ```
 */
export function useEmitEvent<E extends EventName>(event: E): (payload: EventMap[E]) => void {
	const { controller } = useMap();

	return useCallback(
		(payload: EventMap[E]) => {
			if (controller) {
				controller.events.emit(event, payload);
			} else {
				console.warn("[@mapwise/core] useEmitEvent: No MapController available to emit event");
			}
		},
		[controller, event],
	);
}
