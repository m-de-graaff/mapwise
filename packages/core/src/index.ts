/**
 * @mapwise/core — Headless Map Engine
 *
 * Provides a stable, framework-safe mapping engine built on MapLibre GL JS.
 *
 * @packageDocumentation
 */

// =============================================================================
// Map Lifecycle
// =============================================================================

export { createMap } from "./map/create-map";
export type { MapController, MapOptions } from "./map/create-map";

// =============================================================================
// Style Manager
// =============================================================================

export type { StyleManager } from "./map/style-manager";

// =============================================================================
// Layer Registry
// =============================================================================

export type { LayerRegistry } from "./registry/layer-registry";
export type {
	LayerDefinition,
	MapLibreLayerDefinition,
	CustomLayerDefinition,
	LayerState,
	LayerCategory,
	LayerPosition,
	LayerMetadata,
	LayerHandlerContext,
	SourceDefinition,
	RegisterLayerOptions,
	LayerStateChangeEvent,
} from "./registry/registry-types";
export {
	Position,
	isCustomLayerDefinition,
	isMapLibreLayerDefinition,
} from "./registry/registry-types";

// =============================================================================
// Plugin System
// =============================================================================

export type { PluginManager } from "./registry/plugin-registry";
export type {
	PluginDefinition,
	PluginContext,
	PluginState,
	PluginStateStore,
	PluginLifecycleHooks,
} from "./registry/plugin-types";

// =============================================================================
// Events
// =============================================================================

export { createEventBus } from "./events/event-bus";
export type { EventBus, EventBusOptions, EventHistoryEntry } from "./events/event-bus";
export type {
	// Core types
	EventMap,
	EventName,
	EventPayload,
	// Map lifecycle events
	MapLifecycleChangeEvent,
	MapReadyEvent,
	MapErrorEvent,
	MapResizeEvent,
	// Style events
	StyleChangeStartEvent,
	StyleChangeCompleteEvent,
	StyleChangeErrorEvent,
	// Layer events
	LayerAddedEvent,
	LayerRemovedEvent,
	LayerVisibilityEvent,
	LayerUpdatedEvent,
	LayerOrderChangedEvent,
	// Source events
	SourceAddedEvent,
	SourceRemovedEvent,
	// Plugin events
	PluginRegisteredEvent,
	PluginUnregisteredEvent,
	PluginErrorEvent,
	// Feature interaction events
	FeatureClickEvent,
	FeatureHoverEvent,
	FeatureHoverEndEvent,
	// Core system events
	CoreErrorEvent,
	EventBusDebugEvent,
} from "./events/event-types";

// =============================================================================
// Persistence
// =============================================================================

export {
	SCHEMA_VERSION,
	MIN_SCHEMA_VERSION,
} from "./persistence/persistence-types";

export type {
	PersistedMapState,
	PersistedViewport,
	PersistedLayerState,
	PersistedPluginState,
	SerializeOptions,
	HydrateOptions,
	HydrateResult,
	MigrationInfo,
	ValidationResult,
	SerializableLayer,
	PersistablePluginState,
} from "./persistence/persistence-types";

export { deepClone } from "./persistence/serialize";

export {
	validateState,
	isPersistedMapState,
	parsePersistedState,
	stringifyPersistedState,
} from "./persistence/hydrate";

// =============================================================================
// Types
// =============================================================================

export type { MapLifecycleState, Viewport, LngLatBounds } from "./types/map";

export type {
	RegisteredSource,
	RegisteredLayer,
	RegisteredFeatureState,
	StyleInput,
	SetBasemapOptions,
	SetBasemapResult,
} from "./types/layer";

// =============================================================================
// React Adapters (Optional)
// =============================================================================
// React adapters are available via '@mapwise/core/react' or direct import:
//
// import { MapProvider, useMap } from '@mapwise/core/react';
//
// Or import individually:
// import { MapProvider } from '@mapwise/core/react/MapProvider';
//
// The core package is fully usable without React.
// React is an optional peer dependency.
// =============================================================================

export {
	// Context
	MapContext,
	type MapContextValue,
	// Provider
	MapProvider,
	type MapProviderProps,
	// Core hooks
	useMap,
	useMapController,
	useMapReady,
	useAwaitMapReady,
	// Layer hooks
	useLayerState,
	useAllLayers,
	useLayersByCategory,
	// Event hooks
	useMapEvents,
	useMapEvent,
	useEmitEvent,
	type EventHandlerMap,
} from "./react";
