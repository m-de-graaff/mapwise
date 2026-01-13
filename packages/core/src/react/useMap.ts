/**
 * Hook to access the MapController.
 *
 * @module react/useMap
 */

import { useContext } from "react";
import type { MapController } from "../map/create-map.js";
import { MapContext, type MapContextValue } from "./MapContext.js";

/**
 * Hook to access the MapController from context.
 *
 * Must be used within a MapProvider.
 *
 * @returns The MapContextValue containing the controller and ready state
 * @throws Error if used outside of MapProvider
 *
 * @example
 * ```tsx
 * function MapControls() {
 *   const { controller, isReady } = useMap();
 *
 *   if (!isReady || !controller) {
 *     return <div>Loading map...</div>;
 *   }
 *
 *   return (
 *     <button onClick={() => controller.invalidateSize()}>
 *       Refresh Map Size
 *     </button>
 *   );
 * }
 * ```
 */
export function useMap(): MapContextValue {
	const context = useContext(MapContext);

	if (context === null) {
		throw new Error(
			"[@mapwise/core] useMap must be used within a MapProvider. " +
				"Make sure your component is wrapped in <MapProvider>.",
		);
	}

	return context;
}

/**
 * Hook to get the MapController, throwing if not ready.
 *
 * This is a convenience hook for cases where you know the map is ready.
 * For conditional rendering, use useMap() and check isReady.
 *
 * @returns The MapController (guaranteed non-null)
 * @throws Error if used outside of MapProvider or if map is not ready
 *
 * @example
 * ```tsx
 * function LayerManager() {
 *   const controller = useMapController();
 *
 *   // Safe to use - will throw before reaching here if not ready
 *   const layers = controller.layers.getAllLayers();
 *
 *   return (
 *     <ul>
 *       {layers.map(layer => (
 *         <li key={layer.id}>{layer.id}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useMapController(): MapController {
	const { controller, isReady } = useMap();

	if (!(controller && isReady)) {
		throw new Error(
			"[@mapwise/core] useMapController called but map is not ready. " +
				"Use useMap() and check isReady, or wrap your component in a ready check.",
		);
	}

	return controller;
}
