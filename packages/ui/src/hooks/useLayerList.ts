import { useMemo } from "react";
import { useAllLayers } from "@mapwise/core/react";

export interface Layer {
	id: string;
	name: string;
	visible: boolean;
	opacity: number;
	type: "base" | "overlay";
	params?: Record<string, unknown> | undefined;
}

// Mock initial state removed to allow empty state
export const INITIAL_LAYERS: Layer[] = [];

export function useLayerList() {
	const coreLayers = useAllLayers();

	// Adapter: Convert core LayerState[] to UI Layer[]
	const layers = useMemo<Layer[]>(() => {
		return coreLayers.map((l) => ({
			id: l.id,
			name: l.metadata?.title || l.id,
			visible: l.visible,
			opacity: l.opacity,
			type: l.category === "base" || l.category === "overlay" ? l.category : "overlay",
			params: l.metadata?.custom ? { ...l.metadata.custom } : undefined,
		}));
	}, [coreLayers]);

	const activeLayers = layers;

	const baseLayers = activeLayers.filter((l) => l.type === "base");
	const overlayLayers = activeLayers.filter((l) => l.type === "overlay");

	return {
		layers: activeLayers,
		baseLayers,
		overlayLayers,
		setLayers: () => {
			// No-op: modifications should go through Core
		},
	};
}
