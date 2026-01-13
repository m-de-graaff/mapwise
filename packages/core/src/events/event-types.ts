/**
 * Event type definitions for the MapWise event bus.
 *
 * @module events/event-types
 */

import type { MapLifecycleState } from "../types/map.js";

// =============================================================================
// Map Lifecycle Events
// =============================================================================

export interface MapLifecycleChangeEvent {
	previousState: MapLifecycleState;
	currentState: MapLifecycleState;
}

export interface MapReadyEvent {
	timestamp: number;
}

export interface MapErrorEvent {
	code: string;
	message: string;
	recoverable: boolean;
	originalError: Error | undefined;
}

export interface MapResizeEvent {
	width: number;
	height: number;
}

// =============================================================================
// Style Events
// =============================================================================

/**
 * Emitted when a basemap change starts.
 */
export interface StyleChangeStartEvent {
	/** The previous style URL or 'json' for inline styles */
	previousStyle: string | null;
	/** The new style URL or 'json' for inline styles */
	newStyle: string;
}

/**
 * Emitted when a basemap change completes successfully.
 */
export interface StyleChangeCompleteEvent {
	/** The new active style URL or 'json' for inline styles */
	style: string;
	/** Number of layers that were reapplied */
	reappliedLayers: number;
	/** Number of sources that were reapplied */
	reappliedSources: number;
	/** Time taken for the style change in milliseconds */
	durationMs: number;
}

/**
 * Emitted when a basemap change fails.
 */
export interface StyleChangeErrorEvent {
	/** The style that failed to load */
	style: string;
	/** Error code */
	code: "LOAD_ERROR" | "TIMEOUT" | "INVALID_STYLE" | "SPRITE_ERROR" | "GLYPH_ERROR";
	/** Error message */
	message: string;
	/** Whether the previous style was restored */
	rolledBack: boolean;
}

// =============================================================================
// Layer Events
// =============================================================================

export interface LayerAddedEvent {
	layerId: string;
	sourceId: string | null;
}

export interface LayerRemovedEvent {
	layerId: string;
}

export interface LayerVisibilityEvent {
	layerId: string;
	visible: boolean;
}

/**
 * Emitted when a layer's state changes (opacity, order, metadata, etc.)
 */
export interface LayerUpdatedEvent {
	layerId: string;
	changes: {
		opacity?: number;
		visible?: boolean;
		order?: number;
		metadata?: Record<string, unknown>;
	};
}

/**
 * Emitted when layer ordering changes.
 */
export interface LayerOrderChangedEvent {
	layerId: string;
	previousOrder: number;
	newOrder: number;
}

// =============================================================================
// Source Events
// =============================================================================

export interface SourceAddedEvent {
	sourceId: string;
}

export interface SourceRemovedEvent {
	sourceId: string;
}

// =============================================================================
// Plugin Events
// =============================================================================

/**
 * Emitted when a plugin is registered.
 */
export interface PluginRegisteredEvent {
	pluginId: string;
	name: string;
	version: string;
}

/**
 * Emitted when a plugin is unregistered.
 */
export interface PluginUnregisteredEvent {
	pluginId: string;
}

/**
 * Emitted when a plugin encounters an error.
 */
export interface PluginErrorEvent {
	pluginId: string;
	hook: string;
	message: string;
	recoverable: boolean;
}

// =============================================================================
// Feature Interaction Events
// =============================================================================

/**
 * Emitted when a map feature is clicked.
 * Contains only data - no UI handlers or callbacks.
 */
export interface FeatureClickEvent {
	/** Layer ID where the feature was found */
	layerId: string;
	/** Source ID of the feature */
	sourceId: string;
	/** Source layer (for vector tiles) */
	sourceLayer?: string;
	/** Feature ID if available */
	featureId?: string | number;
	/** Feature properties */
	properties: Record<string, unknown>;
	/** Feature geometry */
	geometry: GeoJSON.Geometry;
	/** Click coordinates [lng, lat] */
	lngLat: [number, number];
	/** Screen coordinates */
	point: { x: number; y: number };
}

/**
 * Emitted when hovering over a feature.
 */
export interface FeatureHoverEvent {
	/** Layer ID where the feature was found */
	layerId: string;
	/** Source ID of the feature */
	sourceId: string;
	/** Source layer (for vector tiles) */
	sourceLayer?: string;
	/** Feature ID if available */
	featureId?: string | number;
	/** Feature properties */
	properties: Record<string, unknown>;
	/** Hover coordinates [lng, lat] */
	lngLat: [number, number];
	/** Screen coordinates */
	point: { x: number; y: number };
}

/**
 * Emitted when hover leaves a feature.
 */
export interface FeatureHoverEndEvent {
	layerId: string;
	featureId?: string | number;
}

// =============================================================================
// Core System Events
// =============================================================================

/**
 * Emitted for core system errors (not map-specific errors).
 * Use for internal diagnostics and debugging.
 */
export interface CoreErrorEvent {
	/** Error source/context */
	source: "event-bus" | "layer-registry" | "plugin-manager" | "style-manager" | "map-store";
	/** Error code for categorization */
	code: string;
	/** Human-readable message */
	message: string;
	/** Whether the system can continue operating */
	recoverable: boolean;
	/** Original error if available */
	originalError?: Error | undefined;
	/** Additional context */
	context?: Record<string, unknown> | undefined;
}

/**
 * Debug event for monitoring event bus activity.
 * Only emitted when debug mode is enabled.
 */
export interface EventBusDebugEvent {
	/** Event that was emitted */
	eventName: string;
	/** Number of handlers that received the event */
	handlerCount: number;
	/** Timestamp */
	timestamp: number;
	/** Payload summary (truncated for large payloads) */
	payloadSummary: string;
}

// =============================================================================
// Event Map
// =============================================================================

/**
 * Complete map of all event types to their payload shapes.
 * Used for type-safe event emission and subscription.
 */
export interface EventMap {
	// Map lifecycle
	"map:lifecycle": MapLifecycleChangeEvent;
	"map:ready": MapReadyEvent;
	"map:error": MapErrorEvent;
	"map:resize": MapResizeEvent;
	"map:destroyed": Record<string, never>;

	// Style events
	"style:changeStart": StyleChangeStartEvent;
	"style:changeComplete": StyleChangeCompleteEvent;
	"style:changeError": StyleChangeErrorEvent;

	// Layer events
	"layer:added": LayerAddedEvent;
	"layer:removed": LayerRemovedEvent;
	"layer:visibility": LayerVisibilityEvent;
	"layer:updated": LayerUpdatedEvent;
	"layer:orderChanged": LayerOrderChangedEvent;

	// Source events
	"source:added": SourceAddedEvent;
	"source:removed": SourceRemovedEvent;

	// Plugin events
	"plugin:registered": PluginRegisteredEvent;
	"plugin:unregistered": PluginUnregisteredEvent;
	"plugin:error": PluginErrorEvent;

	// Feature interaction events
	"feature:click": FeatureClickEvent;
	"feature:hover": FeatureHoverEvent;
	"feature:hoverEnd": FeatureHoverEndEvent;

	// Core system events
	"core:error": CoreErrorEvent;
	"core:debug": EventBusDebugEvent;
}

/**
 * All valid event names
 */
export type EventName = keyof EventMap;

/**
 * Get the payload type for a specific event
 */
export type EventPayload<E extends EventName> = EventMap[E];
