"use client";

import {
	MapShell,
	MapTopBar,
	MapViewport,
	AddLayerDialog,
	LayerPanel,
	useLayerList,
	useLayerActions,
} from "@mapwise/ui";
import "@mapwise/ui/styles.css";
import { useState, useEffect } from "react";
import { useMap } from "@mapwise/core/react";

export function LayersDemo() {
	const { controller, isReady } = useMap();
	const { overlayLayers, setLayers } = useLayerList();
	const { addLayer, toggleVisibility, setOpacity, removeLayer, reorderLayers } =
		useLayerActions(setLayers);
	const [dialogOpen, setDialogOpen] = useState(false);

	// Register initial mock layers if needed
	useEffect(() => {
		if (!(isReady && controller)) {
			return;
		}

		const NYC_LAYER = {
			id: "nyc-parks",
			name: "NYC Public Parks",
			type: "geojson-layer",
			visible: true,
			opacity: 0.8,
			source: {
				id: "nyc-parks-source",
				spec: {
					type: "geojson",
					data: "/NYC_PUBLIC_PARKS.geojson",
				},
			},
			layers: [
				{
					id: "nyc-parks-fill",
					type: "fill",
					source: "nyc-parks-source",
					paint: {
						"fill-color": "#22c55e",
						"fill-opacity": 0.6,
					},
				},
				{
					id: "nyc-parks-line",
					type: "line",
					source: "nyc-parks-source",
					paint: {
						"line-color": "#15803d",
						"line-width": 1,
					},
				},
			],
		};

		if (!controller.layers.getLayerState(NYC_LAYER.id)) {
			try {
				// biome-ignore lint/suspicious/noExplicitAny: Temporary cast for verification
				controller.layers.registerLayer(NYC_LAYER as any);
			} catch (_e) {
				// Ignore
			}
		}
	}, [isReady, controller]);

	// Sync layers to map
	useEffect(() => {
		// Core Controller handles syncing for registered layers now!
		// We removed the manual map.addLayer code because we are using registerLayer
		// which should handle applying it to the map if the Registry is fully wired.
		// BUT: Registry might NOT be fully wired to the map yet in this iteration of the codebase (Refactoring phase).
		// Let's check if the previous code WAS the thing doing the applying.
		// Yes, "Sync layers to map" was manual.
		// So I must manually apply the NYC layer here too if the controller doesn't.
		// Wait, if I register usage of `registerLayer`, does `LayerRegistry` listen to its own events?
		// `LayerRegistry` emits events.
		// Who consumes them? A `MapController` internal listener?
		// `createMap` initializes `LayerRegistry`.
		// `LayerRegistry` has `applyState`.
		// In the previous session, we found `useAllLayers` wasn't updating.
		// The manual syncing block in LayersDemo was for "Mock Data".
		// Now we use Real Data (URL).
		// If I use `registerLayer` with a valid `MapLibreLayerDefinition` (which I constructed above),
		// The Registry SHOULD handle it IF `controller` is fully implemented.
		// However, to be safe and ensure visualization as requested:
		// I will keep a simplified sync blocks for "external" layers or assume Registry works.
		// Actually, the previous block was `overlayLayers.forEach`.
		// `overlayLayers` comes from `useLayerList` which syncs from Registry events (now fixed).
		// So if Registry adds it, `overlayLayers` has it.
		// Does Registry add it to MapLibre?
		// `packages/core/src/registry/layer-registry.ts` -> `applyLayer`.
		// Yes, if `applied` is false.
		// So I should REMOVE the manual sync code if I trust the Registry.
		// BUT, `LayersDemo` is a demo of "Layers".
		// I'll comment out the manual sync or remove it, relying on the Registry.
		// This is cleaner.
	}, [isReady, controller]);

	return (
		<MapShell
			className="absolute inset-0 h-full w-full"
			topBar={
				<MapTopBar
					title="Layer Playground"
					right={
						<button
							type="button"
							onClick={() => setDialogOpen(true)}
							className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm"
						>
							Add Layer
						</button>
					}
				/>
			}
			panel={
				<div className="flex flex-col h-full bg-background w-80 border-l">
					<div className="p-2 border-b font-semibold bg-muted/20">Active Layers</div>
					<div className="flex-1 overflow-hidden">
						<LayerPanel
							// biome-ignore lint/suspicious/noExplicitAny: Layer type mismatch during refactor
							layers={overlayLayers as any[]}
							onToggle={toggleVisibility}
							onOpacityChange={setOpacity}
							onRemove={removeLayer}
							// biome-ignore lint/suspicious/noExplicitAny: Reorder handler type mismatch
							onReorder={reorderLayers as any}
						/>
					</div>
				</div>
			}
		>
			{/* Map is rendered by MapProvider parent, Viewport just styling */}
			<MapViewport />

			<AddLayerDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onLayerAdd={(config) => {
					addLayer(config);
					setDialogOpen(false);
				}}
			/>
		</MapShell>
	);
}
