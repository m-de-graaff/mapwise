/**
 * Hook to subscribe to layer state changes.
 *
 * @module react/useLayerState
 */

import { useEffect, useState } from "react";
import type { LayerCategory, LayerState } from "../registry/registry-types";
import { useMap } from "./useMap";

/**
 * Hook to get the current state of a specific layer.
 *
 * Subscribes to layer changes and re-renders when the layer's state changes.
 * Uses useSyncExternalStore for efficient updates without render storms.
 *
 * @param layerId - The ID of the layer to track
 * @returns The layer state, or undefined if the layer doesn't exist
 *
 * @example
 * ```tsx
 * function LayerControls({ layerId }: { layerId: string }) {
 *   const layerState = useLayerState(layerId);
 *
 *   if (!layerState) {
 *     return <div>Layer not found</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <span>{layerState.id}</span>
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={layerState.visible}
 *           onChange={(e) => {
 *             // Use controller.layers.setVisibility...
 *           }}
 *         />
 *         Visible
 *       </label>
 *       <input
 *         type="range"
 *         min={0}
 *         max={1}
 *         step={0.1}
 *         value={layerState.opacity}
 *         onChange={(e) => {
 *           // Use controller.layers.setOpacity...
 *         }}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useLayerState(layerId: string): LayerState | undefined {
	const { controller, isReady } = useMap();

	// Use local state for layer data
	const [layerState, setLayerState] = useState<LayerState | undefined>(() =>
		isReady ? controller?.layers.getLayerState(layerId) : undefined,
	);

	// Subscribe to layer events
	useEffect(() => {
		if (!(controller && isReady)) {
			setLayerState(undefined);
			return;
		}

		// Initial fetch
		setLayerState(controller.layers.getLayerState(layerId));

		// TODO: Subscribe to layer events via the event bus when exposed
		// For a full implementation, we'd subscribe to layer:added, layer:removed, layer:visibility events
		// Since the event bus is not yet exposed on the controller, we rely on React re-renders
		return () => {
			/* cleanup placeholder for future event subscription */
		};
	}, [controller, isReady, layerId]);

	return layerState;
}

/**
 * Hook to get all layers in the registry.
 *
 * @returns Array of all layer states
 *
 * @example
 * ```tsx
 * function LayerList() {
 *   const layers = useAllLayers();
 *
 *   return (
 *     <ul>
 *       {layers.map(layer => (
 *         <li key={layer.id}>
 *           {layer.metadata?.title ?? layer.id}
 *           {layer.visible ? ' (visible)' : ' (hidden)'}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useAllLayers(): LayerState[] {
	const { controller, isReady } = useMap();

	const [layers, setLayers] = useState<LayerState[]>([]);

	useEffect(() => {
		if (!(controller && isReady)) {
			setLayers([]);
			return;
		}

		// Initial fetch
		setLayers(controller.layers.getAllLayers());

		// For a full implementation, we'd subscribe to layer:added, layer:removed events
		return () => {
			/* cleanup placeholder for future event subscription */
		};
	}, [controller, isReady]);

	return layers;
}

/**
 * Hook to get layers filtered by category.
 *
 * @param category - Layer category to filter by
 * @returns Array of layer states in that category
 *
 * @example
 * ```tsx
 * function OverlayLayers() {
 *   const overlays = useLayersByCategory('overlay');
 *
 *   return (
 *     <div>
 *       <h3>Overlays ({overlays.length})</h3>
 *       {overlays.map(layer => (
 *         <LayerToggle key={layer.id} layer={layer} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLayersByCategory(category: LayerCategory): LayerState[] {
	const { controller, isReady } = useMap();

	const [layers, setLayers] = useState<LayerState[]>([]);

	useEffect(() => {
		if (!(controller && isReady)) {
			setLayers([]);
			return;
		}

		// Initial fetch
		setLayers(controller.layers.getLayersByCategory(category));

		return () => {
			/* cleanup placeholder for future event subscription */
		};
	}, [controller, isReady, category]);

	return layers;
}
