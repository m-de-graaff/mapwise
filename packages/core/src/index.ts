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

export { createMap } from "./map/create-map.js";
export type { MapController, MapOptions } from "./map/create-map.js";

// =============================================================================
// Style Manager
// =============================================================================

export type { StyleManager } from "./map/style-manager.js";

// =============================================================================
// Layer Registry
// =============================================================================

export type { LayerRegistry } from "./registry/layer-registry.js";
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
} from "./registry/registry-types.js";
export {
	Position,
	isCustomLayerDefinition,
	isMapLibreLayerDefinition,
} from "./registry/registry-types.js";

// =============================================================================
// Plugin System
// =============================================================================

export type { PluginManager } from "./registry/plugin-registry.js";
export type {
	PluginDefinition,
	PluginContext,
	PluginState,
	PluginStateStore,
	PluginLifecycleHooks,
} from "./registry/plugin-types.js";

// =============================================================================
// Events
// =============================================================================

export { createEventBus } from "./events/event-bus.js";
export type { EventBus, EventBusOptions, EventHistoryEntry } from "./events/event-bus.js";
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
} from "./events/event-types.js";

// =============================================================================
// Persistence
// =============================================================================

export {
	SCHEMA_VERSION,
	MIN_SCHEMA_VERSION,
} from "./persistence/persistence-types.js";

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
} from "./persistence/persistence-types.js";

export { deepClone } from "./persistence/serialize.js";

export {
	validateState,
	isPersistedMapState,
	parsePersistedState,
	stringifyPersistedState,
} from "./persistence/hydrate.js";

// =============================================================================
// Errors & Diagnostics
// =============================================================================

export {
	// Error types
	type ErrorCategory,
	type ErrorSeverity,
	type MapwiseError,
	type CreateErrorOptions,
	// Error codes
	ConfigurationErrors,
	NetworkErrors,
	MapLibreErrors,
	PluginErrors,
	LayerErrors,
	StyleErrors,
	PersistenceErrors,
	ValidationErrors,
	InternalErrors,
	// Error utilities
	createError,
	isMapwiseError,
	extractErrorMessage,
	extractError,
	formatError,
	serializeError,
	// Logger
	type LogLevel,
	type LoggerOptions,
	type LogHandler,
	type LogEntry,
	type Logger,
	createLogger,
	defaultLogger,
	enableDebugMode,
	enableProductionMode,
	// Error reporter
	type ErrorReporterOptions,
	type ErrorHistoryEntry,
	type ErrorReporter,
	createErrorReporter,
	defaultErrorReporter,
	createSafeWrapper,
	createSafeAsyncWrapper,
	safePromise,
} from "./errors/index.js";

// =============================================================================
// Requests & Auth
// =============================================================================

export {
	type RequestManager,
	type AuthManager,
	type RequestParameters,
	type RequestTransform,
	type ResourceType,
	type TokenProvider,
	createRequestManager,
	createAuthManager,
} from "./request/index.js";

// =============================================================================
// Types
// =============================================================================

export type { MapLifecycleState, Viewport, LngLatBounds } from "./types/map.js";

export type {
	RegisteredSource,
	RegisteredLayer,
	RegisteredFeatureState,
	StyleInput,
	SetBasemapOptions,
	SetBasemapResult,
} from "./types/layer.js";

// =============================================================================
// Interaction
// =============================================================================

export {
	createInteractionModeStore,
	type InteractionModeStore,
	type InteractionModeStoreOptions,
} from "./interaction/interaction-mode.js";

export {
	createCursorManager,
	type CursorManager,
} from "./interaction/cursor-manager.js";

export {
	createKeyboardManager,
	type KeyboardManager,
	type KeyboardHandler,
	type KeyboardManagerOptions,
} from "./interaction/keyboard-manager.js";

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
} from "./react/index.js";
