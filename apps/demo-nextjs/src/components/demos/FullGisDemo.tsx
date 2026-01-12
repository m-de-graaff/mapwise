"use client";

import {
	MapShell,
	MapTopBar,
	MapToolbar,
	LayerPanel,
	LegendPanel,
	type ToolId,
	type Layer,
	cn,
} from "@mapwise/ui";
import { useState, useEffect } from "react";
import { useMap } from "@mapwise/core/react";
import { useMapToolbar } from "@mapwise/ui";
import { createDrawPlugin, createMeasurePlugin } from "@mapwise/plugins";
import "@mapwise/ui/styles.css";

// Sample data
const DEMO_ROUTE_COORDS: [number, number][] = [
	[-122.48369693756104, 37.83381888486939],
	[-122.48348236083984, 37.83317489144141],
	[-122.48339653015138, 37.83270036637107],
	[-122.48356819152832, 37.832056363179625],
	[-122.48404026031496, 37.83114119107971],
	[-122.48404026031496, 37.83049717427869],
	[-122.48348236083984, 37.829920943955045],
	[-122.48356819152832, 37.82954808664175],
	[-122.48507022857666, 37.82944639795659],
	[-122.48610019683838, 37.82880236636284],
	[-122.48695850372314, 37.82931080836601],
];

// Local Core-Compatible Status Bar
function CoreMapStatusBar({ attribution }: { attribution?: string }) {
	const { controller, isReady } = useMap();
	const [zoom, setZoom] = useState(0);
	const [center, setCenter] = useState<[number, number]>([0, 0]);

	useEffect(() => {
		if (!(isReady && controller)) {
			return;
		}

		const map = controller.map;
		if (!map) {
			return;
		}

		const update = () => {
			setZoom(map.getZoom());
			const c = map.getCenter();
			setCenter([c.lng, c.lat]);
		};

		map.on("move", update);
		map.on("zoom", update);
		update();

		return () => {
			map.off("move", update);
			map.off("zoom", update);
		};
	}, [isReady, controller]);

	return (
		<div className="flex items-center justify-between px-4 py-1 text-xs text-muted-foreground bg-background/80 backdrop-blur border-t pointer-events-auto">
			<div>{attribution}</div>
			<div className="flex gap-4">
				<span>Zoom: {zoom.toFixed(2)}</span>
				<span>
					{center[0].toFixed(4)}, {center[1].toFixed(4)}
				</span>
			</div>
		</div>
	);
}

export function FullGisDemo() {
	const [activePanel, setActivePanel] = useState<"layers" | "legend" | null>("layers");
	const [activeTool, setActiveTool] = useState<ToolId>(null);
	const [layers, setLayers] = useState<Layer[]>([]);

	// Wire up map interactions
	const { controller, isReady } = useMap();
	useMapToolbar(activeTool);

	// Register plugins and initial layers
	useEffect(() => {
		if (!controller) {
			return;
		}

		const registerContent = async () => {
			try {
				const plugins = controller.plugins;
				if (!plugins.has("@mapwise/draw")) {
					await plugins.register(createDrawPlugin({ enabled: false }));
				}
				if (!plugins.has("@mapwise/measure")) {
					await plugins.register(createMeasurePlugin({ enabled: false }));
				}

				// Register NYC Layer
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
					// biome-ignore lint/suspicious/noExplicitAny: Temporary cast for verification
					controller.layers.registerLayer(NYC_LAYER as any);
				}
			} catch (err) {
				console.error("Failed to register content:", err);
			}
		};

		registerContent();
	}, [controller]); // Added isReady dependency implicitly via usage, but keeping controller as main trigger

	// Update Route Layer
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Demo component logic centralized
	useEffect(() => {
		if (!(isReady && controller)) {
			return;
		}

		const routeLayerId = "route-1";
		const routeLayer = layers.find((l) => l.id === routeLayerId);

		if (routeLayer?.visible) {
			const geojson = {
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: DEMO_ROUTE_COORDS,
				},
				properties: {},
			};

			// Using map directly for simplicity in demo until Registry is fully typed
			const sourceId = "route-1-source";
			const map = controller.map;
			if (!map) {
				return;
			}

			if (!map.getSource(sourceId)) {
				map.addSource(sourceId, {
					type: "geojson",
					// biome-ignore lint/suspicious/noExplicitAny: GeoJSON type mismatch
					data: geojson as any,
				});
			}

			if (map.getLayer(routeLayerId)) {
				// Update style
				map.setPaintProperty(
					routeLayerId,
					"line-color",
					// biome-ignore lint/suspicious/noExplicitAny: Demo hack
					(routeLayer as any).style?.color || "#3b82f6",
				);
				// biome-ignore lint/suspicious/noExplicitAny: Demo hack
				map.setPaintProperty(routeLayerId, "line-width", (routeLayer as any).style?.width || 4);
				map.setPaintProperty(routeLayerId, "line-opacity", routeLayer.opacity);
				if (map.getLayoutProperty(routeLayerId, "visibility") !== "visible") {
					map.setLayoutProperty(routeLayerId, "visibility", "visible");
				}
			} else {
				map.addLayer({
					id: routeLayerId,
					type: "line",
					source: sourceId,
					paint: {
						// biome-ignore lint/suspicious/noExplicitAny: Demo hack
						"line-color": (routeLayer as any).style?.color || "#3b82f6",
						// biome-ignore lint/suspicious/noExplicitAny: Demo hack
						"line-width": (routeLayer as any).style?.width || 4,
						"line-opacity": routeLayer.opacity,
					},
				});
			}
		} else {
			const map = controller.map;
			if (map?.getLayer(routeLayerId)) {
				map.setLayoutProperty(routeLayerId, "visibility", "none");
			}
		}
	}, [layers, isReady, controller]);

	const closePanel = () => setActivePanel(null);

	const handleToggleLayer = (id: string) => {
		setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
	};

	const handleOpacityChange = (id: string, opacity: number) => {
		setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, opacity } : l)));
	};

	const handleRemoveLayer = (id: string) => {
		setLayers((prev) => prev.filter((l) => l.id !== id));
	};

	const handleReorderLayers = (newLayers: Layer[]) => {
		setLayers(newLayers);
	};

	const renderPanel = () => {
		if (activePanel === "layers") {
			return (
				<div className="flex flex-col h-full bg-background border-r">
					<div className="p-3 border-b flex justify-between items-center bg-muted/20">
						<span className="font-semibold text-sm">Layers</span>
						<button
							type="button"
							onClick={closePanel}
							className="text-muted-foreground hover:text-foreground"
						>
							✕
						</button>
					</div>
					<div className="flex-1 overflow-hidden">
						<LayerPanel
							// biome-ignore lint/suspicious/noExplicitAny: Layer mismatch between demo/lib
							layers={layers as any}
							onToggle={handleToggleLayer}
							onOpacityChange={handleOpacityChange}
							onRemove={handleRemoveLayer}
							// biome-ignore lint/suspicious/noExplicitAny: Demo hack
							onReorder={handleReorderLayers as any}
						/>
					</div>
				</div>
			);
		}
		if (activePanel === "legend") {
			return (
				<div className="flex flex-col h-full bg-background border-r">
					<div className="p-3 border-b flex justify-between items-center bg-muted/20">
						<span className="font-semibold text-sm">Legend</span>
						<button
							type="button"
							onClick={closePanel}
							className="text-muted-foreground hover:text-foreground"
						>
							✕
						</button>
					</div>
					<div className="flex-1 overflow-hidden">
						{/* biome-ignore lint/suspicious/noExplicitAny: Demo hack */}
						<LegendPanel layers={layers as any} />
					</div>
				</div>
			);
		}
		return null;
	};

	return (
		<MapShell
			className="absolute inset-0 h-full w-full"
			topBar={<MapTopBar title="GIS Workspace" />}
			statusBar={<CoreMapStatusBar attribution="© Mapwise Demo" />}
			panel={activePanel ? renderPanel() : undefined}
		>
			<div className="relative w-full h-full">
				<div className="absolute top-4 left-4 z-10 pointer-events-auto">
					<MapToolbar
						// biome-ignore lint/suspicious/noExplicitAny: ToolTypeId mismatch
						activeTool={activeTool as any} // Cast for now until prop type is updated globally
						onToolChange={setActiveTool}
						onClear={() => {
							setActiveTool(null);
							// biome-ignore lint/suspicious/noExplicitAny: Event payload type mismatch
							controller?.events.emit("plugin:@mapwise/draw:clearAll" as any, undefined);
							// biome-ignore lint/suspicious/noExplicitAny: Event payload type mismatch
							controller?.events.emit("plugin:@mapwise/measure:clear" as any, undefined);
						}}
					/>
				</div>

				<div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
					<button
						type="button"
						onClick={() => setActivePanel(activePanel === "layers" ? null : "layers")}
						className={cn(
							"px-3 py-2 rounded-md shadow-sm text-sm font-medium border transition-colors",
							activePanel === "layers"
								? "bg-primary text-primary-foreground border-primary"
								: "bg-card text-card-foreground border-border hover:bg-accent",
						)}
					>
						Layers
					</button>
					<button
						type="button"
						onClick={() => setActivePanel(activePanel === "legend" ? null : "legend")}
						className={cn(
							"px-3 py-2 rounded-md shadow-sm text-sm font-medium border transition-colors",
							activePanel === "legend"
								? "bg-primary text-primary-foreground border-primary"
								: "bg-card text-card-foreground border-border hover:bg-accent",
						)}
					>
						Legend
					</button>
				</div>
			</div>
		</MapShell>
	);
}
