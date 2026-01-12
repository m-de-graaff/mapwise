import {
	MapShell,
	MapTopBar,
	MapViewport,
	MapToolbar,
	MapStatusBar,
	LayerPanel,
	LegendPanel,
	useLayerList,
	useLayerActions,
	type ToolId,
} from "@mapwise/ui";
import "@mapwise/ui/styles.css";
import { useState } from "react";
import { Link } from "react-router-dom";

export function KitchenSink() {
	const [activeTool, setActiveTool] = useState<ToolId>(null);
	const [activePanel, setActivePanel] = useState<"layers" | "legend" | null>("layers");

	// Mock layer data
	const { layers, setLayers } = useLayerList();
	useLayerActions(setLayers); // Hooks must be called, but we don't use the actions here directly yet

	return (
		<MapShell
			topBar={
				<MapTopBar
					title="Mapwise Kitchen Sink"
					left={
						<Link to="/" className="mr-4 text-sm hover:underline">
							Back
						</Link>
					}
				/>
			}
			statusBar={<MapStatusBar attribution="Mapwise Demo" />}
			panel={
				<div className="flex flex-col h-full bg-background w-80 border-r">
					<div className="flex border-b">
						<button
							className={`flex-1 py-2 text-sm font-medium ${activePanel === "layers" ? "border-b-2 border-primary" : ""}`}
							type="button"
							onClick={() => setActivePanel("layers")}
						>
							Layers
						</button>
						<button
							className={`flex-1 py-2 text-sm font-medium ${activePanel === "legend" ? "border-b-2 border-primary" : ""}`}
							type="button"
							onClick={() => setActivePanel("legend")}
						>
							Legend
						</button>
					</div>
					<div className="flex-1 overflow-hidden p-2">
						{activePanel === "layers" && <LayerPanel />}
						{activePanel === "legend" && <LegendPanel layers={layers} />}
					</div>
				</div>
			}
			sidebarOpen={!!activePanel}
			onSidebarOpenChange={(open) => !open && setActivePanel(null)}
		>
			<MapViewport />

			<div className="absolute top-4 left-4 z-10 transition-all duration-300">
				<MapToolbar
					activeTool={activeTool}
					onToolChange={setActiveTool}
					onClear={() => setActiveTool(null)}
				/>
			</div>
		</MapShell>
	);
}
