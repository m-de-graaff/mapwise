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
export { MapContext } from "./MapContext";
export type { MapContextValue } from "./MapContext";

// Provider
export { MapProvider } from "./MapProvider";
export type { MapProviderProps } from "./MapProvider";

// Core hooks
export { useMap, useMapController } from "./useMap";
export { useMapReady, useAwaitMapReady } from "./useMapReady";

// Layer hooks
export { useLayerState, useAllLayers, useLayersByCategory } from "./useLayerState";

// Event hooks
export { useMapEvents, useMapEvent, useEmitEvent } from "./useMapEvents";
export type { EventHandlerMap } from "./useMapEvents";
