/**
 * Typed event bus for internal communication.
 *
 * A minimal pub/sub implementation that provides type-safe events
 * without external dependencies. Includes:
 * - Type-safe emission and subscription
 * - Once-only listeners
 * - Error isolation (handlers can't crash each other)
 * - Debug mode with event history
 * - Event filtering
 *
 * @module events/event-bus
 */

import type { EventMap, EventName } from "./event-types";

type EventHandler<T> = (payload: T) => void;

// =============================================================================
// Event History for Debugging
// =============================================================================

export interface EventHistoryEntry {
	event: EventName;
	payload: unknown;
	timestamp: number;
	handlerCount: number;
	errors: string[];
}

// =============================================================================
// Event Bus Options
// =============================================================================

export interface EventBusOptions {
	/**
	 * Enable debug mode for event logging and history.
	 * @default false
	 */
	debug?: boolean;

	/**
	 * Maximum number of events to keep in history (debug mode only).
	 * @default 100
	 */
	maxHistorySize?: number;

	/**
	 * Custom logger for debug output.
	 */
	logger?: {
		debug: (message: string, ...args: unknown[]) => void;
		warn: (message: string, ...args: unknown[]) => void;
		error: (message: string, ...args: unknown[]) => void;
	};
}

// =============================================================================
// Event Bus Interface
// =============================================================================

export interface EventBus {
	/**
	 * Subscribe to an event.
	 * @returns Unsubscribe function
	 */
	on<E extends EventName>(event: E, handler: EventHandler<EventMap[E]>): () => void;

	/**
	 * Subscribe to an event for a single emission.
	 * @returns Unsubscribe function
	 */
	once<E extends EventName>(event: E, handler: EventHandler<EventMap[E]>): () => void;

	/**
	 * Emit an event to all subscribers.
	 * Handlers are called synchronously in registration order.
	 * Handler exceptions are caught and don't propagate.
	 */
	emit<E extends EventName>(event: E, payload: EventMap[E]): void;

	/**
	 * Remove all handlers for a specific event, or all events if none specified.
	 */
	off<E extends EventName>(event?: E): void;

	/**
	 * Get the count of handlers for an event.
	 */
	listenerCount<E extends EventName>(event: E): number;

	/**
	 * Get all registered event names.
	 */
	eventNames(): EventName[];

	/**
	 * Check if any handlers are registered for an event.
	 */
	hasListeners<E extends EventName>(event: E): boolean;

	// ==========================================================================
	// Debug Methods
	// ==========================================================================

	/**
	 * Enable or disable debug mode.
	 */
	setDebug(enabled: boolean): void;

	/**
	 * Check if debug mode is enabled.
	 */
	isDebug(): boolean;

	/**
	 * Get event history (debug mode only).
	 * Returns empty array if debug mode is disabled.
	 */
	getHistory(): EventHistoryEntry[];

	/**
	 * Clear event history.
	 */
	clearHistory(): void;

	/**
	 * Get events matching a filter (debug mode only).
	 */
	filterHistory(filter: {
		event?: EventName | EventName[];
		since?: number;
		hasErrors?: boolean;
	}): EventHistoryEntry[];
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new event bus instance.
 *
 * Each MapController should have its own event bus to prevent cross-talk
 * between multiple map instances.
 *
 * @example
 * ```typescript
 * const bus = createEventBus({ debug: true });
 *
 * // Subscribe to events
 * const unsubscribe = bus.on('map:ready', (event) => {
 *   console.log('Map ready at', event.timestamp);
 * });
 *
 * // Subscribe once
 * bus.once('layer:added', (event) => {
 *   console.log('First layer added:', event.layerId);
 * });
 *
 * // Emit events
 * bus.emit('map:ready', { timestamp: Date.now() });
 *
 * // Cleanup
 * unsubscribe();
 * bus.off(); // Remove all handlers
 * ```
 */
export function createEventBus(options: EventBusOptions = {}): EventBus {
	const {
		debug: initialDebug = false,
		maxHistorySize = 100,
		logger = {
			debug: (msg, ...args) => console.debug("[@mapwise/event-bus]", msg, ...args),
			warn: (msg, ...args) => console.warn("[@mapwise/event-bus]", msg, ...args),
			error: (msg, ...args) => console.error("[@mapwise/event-bus]", msg, ...args),
		},
	} = options;

	// Handler storage
	const handlers = new Map<EventName, Set<EventHandler<unknown>>>();

	// Debug state
	let debugMode = initialDebug;
	const history: EventHistoryEntry[] = [];

	// ==========================================================================
	// Internal Helpers
	// ==========================================================================

	function getHandlerSet<E extends EventName>(event: E): Set<EventHandler<EventMap[E]>> {
		let set = handlers.get(event);
		if (!set) {
			set = new Set();
			handlers.set(event, set);
		}
		return set as Set<EventHandler<EventMap[E]>>;
	}

	function trimHistory(): void {
		while (history.length > maxHistorySize) {
			history.shift();
		}
	}

	function notifyDebugHandlers(entry: EventHistoryEntry): void {
		if (entry.event === "core:debug") {
			return;
		}

		const debugHandlers = handlers.get("core:debug");
		if (!debugHandlers) {
			return;
		}

		const debugPayload = {
			eventName: entry.event,
			handlerCount: entry.handlerCount,
			timestamp: entry.timestamp,
			payloadSummary: summarizePayload(entry.payload),
		};

		for (const handler of [...debugHandlers]) {
			try {
				(handler as EventHandler<typeof debugPayload>)(debugPayload);
			} catch {
				// Ignore debug handler errors
			}
		}
	}

	function addToHistory(entry: EventHistoryEntry): void {
		if (!debugMode) {
			return;
		}

		history.push(entry);
		trimHistory();
		notifyDebugHandlers(entry);
	}

	function summarizePayload(payload: unknown): string {
		try {
			const str = JSON.stringify(payload);
			if (str.length > 200) {
				return `${str.slice(0, 200)}...`;
			}
			return str;
		} catch {
			return "[non-serializable]";
		}
	}

	// ==========================================================================
	// Public API
	// ==========================================================================

	function on<E extends EventName>(event: E, handler: EventHandler<EventMap[E]>): () => void {
		const set = getHandlerSet(event);
		set.add(handler);

		if (debugMode) {
			logger.debug(`Subscribed to "${event}" (${set.size} handlers)`);
		}

		// Return unsubscribe function
		return () => {
			set.delete(handler);
			if (set.size === 0) {
				handlers.delete(event);
			}
			if (debugMode) {
				logger.debug(`Unsubscribed from "${event}" (${set.size} handlers remaining)`);
			}
		};
	}

	function once<E extends EventName>(event: E, handler: EventHandler<EventMap[E]>): () => void {
		const wrappedHandler: EventHandler<EventMap[E]> = (payload) => {
			unsubscribe();
			handler(payload);
		};

		const unsubscribe = on(event, wrappedHandler);
		return unsubscribe;
	}

	function isErrorEvent(event: EventName): boolean {
		return event === "map:error" || event === "core:error" || event === "plugin:error";
	}

	function handleEmitError<E extends EventName>(
		event: E,
		error: unknown,
		errors: string[],
		handlerIndex: number,
	): void {
		const errorMsg = error instanceof Error ? error.message : String(error);
		errors.push(errorMsg);

		// Never throw in event handlers - emit error event instead
		// But avoid infinite loop if this IS an error event
		if (isErrorEvent(event)) {
			logger.error(`Error in error handler for "${event}":`, error);
			return;
		}

		// Emit to map:error for backward compatibility
		emit("map:error", {
			code: "EVENT_HANDLER_ERROR",
			message: `Error in handler for "${event}": ${errorMsg}`,
			recoverable: true,
			originalError: error instanceof Error ? error : undefined,
		});

		// Also emit to core:error for system-level tracking
		const coreErrorPayload: EventMap["core:error"] = {
			source: "event-bus",
			code: "HANDLER_ERROR",
			message: `Handler error for "${event}": ${errorMsg}`,
			recoverable: true,
			context: { event, handlerIndex },
		};
		if (error instanceof Error) {
			coreErrorPayload.originalError = error;
		}
		emit("core:error", coreErrorPayload);
	}

	function emit<E extends EventName>(event: E, payload: EventMap[E]): void {
		const set = handlers.get(event);
		const handlerCount = set?.size ?? 0;
		const errors: string[] = [];
		const timestamp = Date.now();

		if (debugMode && event !== "core:debug") {
			logger.debug(`Emit "${event}" to ${handlerCount} handlers`, payload);
		}

		if (!set || set.size === 0) {
			addToHistory({ event, payload, timestamp, handlerCount: 0, errors: [] });
			return;
		}

		// Copy the set to avoid issues if handlers modify subscriptions
		const handlerList = [...set];
		for (let i = 0; i < handlerList.length; i++) {
			const handler = handlerList[i];
			try {
				(handler as EventHandler<EventMap[E]>)(payload);
			} catch (error) {
				handleEmitError(event, error, errors, i);
			}
		}

		addToHistory({ event, payload, timestamp, handlerCount, errors });
	}

	function off<E extends EventName>(event?: E): void {
		if (event) {
			handlers.delete(event);
			if (debugMode) {
				logger.debug(`Removed all handlers for "${event}"`);
			}
		} else {
			handlers.clear();
			if (debugMode) {
				logger.debug("Removed all event handlers");
			}
		}
	}

	function listenerCount<E extends EventName>(event: E): number {
		return handlers.get(event)?.size ?? 0;
	}

	function eventNames(): EventName[] {
		return [...handlers.keys()];
	}

	function hasListeners<E extends EventName>(event: E): boolean {
		return (handlers.get(event)?.size ?? 0) > 0;
	}

	// ==========================================================================
	// Debug API
	// ==========================================================================

	function setDebug(enabled: boolean): void {
		debugMode = enabled;
		if (!enabled) {
			history.length = 0; // Clear history when disabling
		}
		logger.debug(`Debug mode ${enabled ? "enabled" : "disabled"}`);
	}

	function isDebug(): boolean {
		return debugMode;
	}

	function getHistory(): EventHistoryEntry[] {
		return [...history];
	}

	function clearHistory(): void {
		history.length = 0;
	}

	function filterHistory(filter: {
		event?: EventName | EventName[];
		since?: number;
		hasErrors?: boolean;
	}): EventHistoryEntry[] {
		let result = [...history];

		if (filter.event) {
			const events = Array.isArray(filter.event) ? filter.event : [filter.event];
			result = result.filter((entry) => events.includes(entry.event));
		}

		if (filter.since !== undefined) {
			const since = filter.since;
			result = result.filter((entry) => entry.timestamp >= since);
		}

		if (filter.hasErrors !== undefined) {
			result = result.filter((entry) =>
				filter.hasErrors ? entry.errors.length > 0 : entry.errors.length === 0,
			);
		}

		return result;
	}

	// ==========================================================================
	// Return Interface
	// ==========================================================================

	return {
		on,
		once,
		emit,
		off,
		listenerCount,
		eventNames,
		hasListeners,
		setDebug,
		isDebug,
		getHistory,
		clearHistory,
		filterHistory,
	};
}

// Types are already exported via interface/type declarations above
