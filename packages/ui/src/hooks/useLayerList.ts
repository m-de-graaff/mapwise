import { useState, useMemo } from "react";
import { useAllLayers } from "@mapwise/core/react";

export interface Layer {
	id: string;
	name: string;
	visible: boolean;
	opacity: number;
	type: "base" | "overlay";
	params?: Record<string, unknown> | undefined;
}

// Mock initial state as fallback
const INITIAL_LAYERS: Layer[] = [
	{ id: "base-osm", name: "OpenStreetMap", visible: true, opacity: 1, type: "base" },
	{ id: "overlay-buildings", name: "Buildings", visible: true, opacity: 0.8, type: "overlay" },
	{ id: "overlay-parks", name: "Parks", visible: false, opacity: 0.5, type: "overlay" },
];

export function useLayerList() {
	const coreLayers = useAllLayers();

	// Adapter: Convert core LayerState[] to UI Layer[]
	// In a real integration, we'd map properties 1:1.
	// Here we use coreLayers if present, otherwise fallback to local mock for the UI demo.
	const layers = useMemo<Layer[]>(() => {
		if (coreLayers.length > 0) {
			return coreLayers.map((l) => ({
				id: l.id,
				name: l.metadata?.title || l.id,
				visible: l.visible,
				opacity: l.opacity,
				type: l.category === "base" || l.category === "overlay" ? l.category : "overlay",
				params: l.metadata?.custom ? { ...l.metadata.custom } : undefined,
			}));
		}
		return INITIAL_LAYERS;
	}, [coreLayers]);

	// For the mock "setLayers" needed by useLayerActions in this transitional phase:
	// We'll just return a no-op or local state setter if we really wanted to keep the mock editable.
	// But since we are moving to Core, we should encourage using useLayerActions to dispatch to Core.
	// ... For now, keeping the local state shim for the Mock fallback to work:
	const [localLayers, setLocalLayers] = useState<Layer[]>(INITIAL_LAYERS);

	// If using core, 'layers' comes from core. If no core (yet), use local.
	const activeLayers = coreLayers.length > 0 ? layers : localLayers;

	const baseLayers = activeLayers.filter((l) => l.type === "base");
	const overlayLayers = activeLayers.filter((l) => l.type === "overlay");

	return {
		layers: activeLayers,
		baseLayers,
		overlayLayers,
		setLayers: setLocalLayers, // Expose local setter for the fallback mock interactions
	};
}
