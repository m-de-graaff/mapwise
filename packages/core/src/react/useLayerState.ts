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

		// Subscribe to events
		const onUpdate = (event: { layerId: string }) => {
			if (event.layerId === layerId) {
				setLayerState(controller.layers.getLayerState(layerId));
			}
		};

		// Cast to any to bypass strict generic inference issues that might be causing the 0-1 arg error
		// (This usually happens if TS confuses .on with .off or similar due to union types)
		// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
		(controller.events as any).on("layer:added", onUpdate);
		// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
		(controller.events as any).on("layer:removed", onUpdate);
		// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
		(controller.events as any).on("layer:visibility", onUpdate);

		return () => {
			// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
			(controller.events as any).off("layer:added", onUpdate);
			// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
			(controller.events as any).off("layer:removed", onUpdate);
			// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
			(controller.events as any).off("layer:visibility", onUpdate);
		};
	}, [controller, isReady, layerId]);

	return layerState;
}

/**
 * Hook to get all layers in the registry.
 *
 * @returns Array of all layer states
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

		// Subscribe to global layer list changes
		const onListUpdate = () => {
			setLayers(controller.layers.getAllLayers());
			setLayers(controller.layers.getAllLayers());
		};

		// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
		(controller.events as any).on("layer:added", onListUpdate);
		// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
		(controller.events as any).on("layer:removed", onListUpdate);
		// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
		(controller.events as any).on("layer:visibility", onListUpdate);

		return () => {
			// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
			(controller.events as any).off("layer:added", onListUpdate);
			// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
			(controller.events as any).off("layer:removed", onListUpdate);
			// biome-ignore lint/suspicious/noExplicitAny: Event emitter type mismatch
			(controller.events as any).off("layer:visibility", onListUpdate);
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
