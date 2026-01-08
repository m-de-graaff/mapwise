/**
 * React context for MapController.
 *
 * @module react/MapContext
 */

import { createContext } from "react";
import type { MapController } from "../map/create-map";

/**
 * Context value for the MapProvider.
 */
export interface MapContextValue {
	/**
	 * The MapController instance.
	 * May be null during initialization or if provider is not mounted.
	 */
	controller: MapController | null;

	/**
	 * Whether the map is currently ready for operations.
	 */
	isReady: boolean;
}

/**
 * React context for accessing the MapController.
 *
 * @example
 * ```tsx
 * import { MapContext } from '@mapwise/core/react';
 *
 * function MyComponent() {
 *   const ctx = useContext(MapContext);
 *   if (!ctx?.controller) return null;
 *   // Use ctx.controller...
 * }
 * ```
 */
export const MapContext = createContext<MapContextValue | null>(null);

MapContext.displayName = "MapwiseMapContext";
