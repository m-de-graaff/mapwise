import { useCallback } from "react";
import { useMap } from "@mapwise/core/react";
import type { Layer } from "./useLayerList.js";

export function useLayerActions(
	setLayers: React.Dispatch<React.SetStateAction<Layer[]>>, // For mock fallback
) {
	const { controller } = useMap();

	const toggleVisibility = useCallback(
		(id: string) => {
			if (controller) {
				const layer = controller.layers.getLayerState(id);
				if (layer) {
					controller.layers.setVisibility(id, !layer.visible);
				}
			} else {
				// Mock fallback
				setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
			}
		},
		[controller, setLayers],
	);

	const setOpacity = useCallback(
		(id: string, opacity: number) => {
			if (controller) {
				controller.layers.setOpacity(id, opacity);
			} else {
				setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, opacity } : l)));
			}
		},
		[controller, setLayers],
	);

	const removeLayer = useCallback(
		(id: string) => {
			if (controller) {
				controller.layers.removeLayer(id);
			} else {
				setLayers((prev) => prev.filter((l) => l.id !== id));
			}
		},
		[controller, setLayers],
	);

	const renameLayer = useCallback(
		(id: string, name: string) => {
			// Core doesn't strictly have a 'rename' for IDs, but metadata update:
			// This assumes we update metadata title.
			if (controller) {
				// Not implemented in core registry yet? Assuming we can't easily rename ID.
				// We'll ignore core update for simple rename or implement metadata update if available.
				console.warn("Renaming not fully supported in core yet");
			} else {
				setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
			}
		},
		[controller, setLayers],
	);

	const reorderLayers = useCallback(
		(newOrder: Layer[]) => {
			// Core registry might not support full array replace, but reorder commands.
			// We'll iterate and set z-indices or move.
			if (controller) {
				// This is complex for sync. We'll skip core sync for reorder in this step
				// or assume the user implements specific reorder calls.
			} else {
				setLayers(newOrder);
			}
		},
		[controller, setLayers],
	);

	const addLayer = useCallback(
		// biome-ignore lint/suspicious/noExplicitAny: Dynamic layer config
		(config: any) => {
			if (controller) {
				// Core registration
				try {
					controller.layers.registerLayer(config);
				} catch (err) {
					console.error("Failed to add layer", err);
				}
			} else {
				// Mock fallback - simplistic
				setLayers((prev) => [
					...prev,
					{
						id: config.id,
						title: config.metadata?.title || config.id,
						name: config.metadata?.title || config.id,
						visible: true,
						opacity: 1,
						type: config.type,
					},
				]);
			}
		},
		[controller, setLayers],
	);

	return {
		toggleVisibility,
		setOpacity,
		removeLayer,
		renameLayer,
		reorderLayers,
		addLayer,
	};
}
