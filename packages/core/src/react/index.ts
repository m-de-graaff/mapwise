/**
 * React adapters for @mapwise/core.
 *
 * These are thin wrappers over the headless API, providing React-specific
 * conveniences without adding business logic. The core is fully usable
 * without these adapters.
 *
 * @packageDocumentation
 * @module react
 */

// Context
export { MapContext } from "./MapContext.js";
export type { MapContextValue } from "./MapContext.js";

// Provider
export { MapProvider } from "./MapProvider.js";
export type { MapProviderProps } from "./MapProvider.js";

// Core hooks
export { useMap, useMapController } from "./useMap.js";
export { useMapReady, useAwaitMapReady } from "./useMapReady.js";

// Layer hooks
export { useLayerState, useAllLayers, useLayersByCategory } from "./useLayerState.js";

// Event hooks
export { useMapEvents, useMapEvent, useEmitEvent } from "./useMapEvents.js";
export type { EventHandlerMap } from "./useMapEvents.js";
