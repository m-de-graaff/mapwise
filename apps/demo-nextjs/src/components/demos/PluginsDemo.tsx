"use client";

import {
	MapShell,
	MapTopBar,
	MapToolbar,
	MeasurePanel,
	FeatureDetailsSheet,
	type ToolId,
} from "@mapwise/ui";
import { useMapToolbar } from "@mapwise/ui";
import "@mapwise/ui/styles.css";
import { useState, useEffect } from "react";
import { useMap } from "@mapwise/core/react";
import { createDrawPlugin, createMeasurePlugin } from "@mapwise/plugins";

// Local Core-Compatible Status Bar (Duplicated for now)
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

export function PluginsDemo() {
	const [activeTool, setActiveTool] = useState<ToolId>(null);
	// biome-ignore lint/suspicious/noExplicitAny: Mock data mismatch
	const [inspectData, setInspectData] = useState<any>(null); // Mock inspect data
	const [measureUnit, setMeasureUnit] = useState<"metric" | "imperial">("metric");

	// Wire up map interactions
	const { controller } = useMap();
	// biome-ignore lint/suspicious/noExplicitAny: ToolTypeId cast
	useMapToolbar(activeTool as any);

	// Register plugins
	useEffect(() => {
		if (!controller) {
			return;
		}

		const registerPlugins = async () => {
			try {
				const plugins = controller.plugins;
				if (!plugins.has("@mapwise/draw")) {
					await plugins.register(createDrawPlugin({ enabled: false }));
				}
				if (!plugins.has("@mapwise/measure")) {
					await plugins.register(createMeasurePlugin({ enabled: false }));
				}
			} catch (err) {
				console.error("Failed to register plugins:", err);
			}
		};
		registerPlugins();
	}, [controller]);

	return (
		<MapShell
			className="absolute inset-0 h-full w-full"
			topBar={<MapTopBar title="Plugins Showcase" />}
			statusBar={<CoreMapStatusBar attribution="Interactions Demo" />}
		>
			{/* MapViewport removed as MapProvider(Core) handles the map container. 
                We just need to ensure the container size is correct. 
                MapShell content area is relative, MapProvider container might be outside if not careful. 
                But in page.tsx, MapProvider wraps PluginsDemo.
            */}

			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute top-4 left-4 z-10 pointer-events-auto">
					<MapToolbar
						activeTool={activeTool}
						onToolChange={setActiveTool}
						onClear={() => {
							setActiveTool(null);
							setInspectData(null);
						}}
					/>
				</div>

				{/* Measure UI appears when tool is active or has results */}
				{activeTool === "measure" && (
					<div className="absolute top-4 right-4 z-10 w-64 bg-card rounded shadow border pointer-events-auto">
						<MeasurePanel
							result={null}
							mode="distance"
							unit={measureUnit}
							onUnitChange={setMeasureUnit}
							onReset={() => {
								// Reset logic placeholder
							}}
						/>
					</div>
				)}

				<FeatureDetailsSheet
					open={!!inspectData}
					onOpenChange={(open) => !open && setInspectData(null)}
					feature={inspectData}
				/>
			</div>
		</MapShell>
	);
}
