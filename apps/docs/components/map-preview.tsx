"use client";

import {
	MapShell,
	Map as MapComponent,
	MapToolbar,
	ToolButton,
	LayerPanel,
	MapTopBar,
	type PanelLayer,
	type ToolId,
	Button,
} from "@mapwise/ui";
import { Layers, X } from "lucide-react";
import { useState } from "react";

export default function MapPreview() {
	const [activePanel, setActivePanel] = useState<string | null>("layers");
	const [activeTool, setActiveTool] = useState<ToolId>(null);
	const [layers, setLayers] = useState<PanelLayer[]>([
		{
			id: "base",
			name: "Basemap (Dark)",
			type: "xyz",
			visible: true,
			opacity: 1,
		},
		{
			id: "poi",
			name: "Points of Interest",
			type: "geojson",
			visible: true,
			opacity: 0.8,
		},
	]);

	const handleLayerToggle = (id: string) => {
		setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
	};

	const handleOpacityChange = (id: string, opacity: number) => {
		setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, opacity } : l)));
	};

	return (
		<div className="w-full h-full relative isolate overflow-hidden bg-card">
			<MapShell
				panel={
					activePanel === "layers" ? (
						<div className="flex flex-col h-full bg-card">
							<div className="flex items-center justify-between p-4 border-b border-border">
								<span className="font-semibold text-sm">Layers</span>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={() => setActivePanel(null)}
								>
									<X className="w-4 h-4" />
								</Button>
							</div>
							<LayerPanel
								layers={layers}
								onToggle={handleLayerToggle}
								onOpacityChange={handleOpacityChange}
								onRemove={() => {
									// Placeholder
								}}
								onReorder={setLayers}
								className="flex-1"
							/>
						</div>
					) : null
				}
			>
				<MapTopBar title="Mapwise Demo" />
				<MapComponent center={[-74.006, 40.7128]} zoom={12} className="w-full h-full" />
				<div className="absolute top-20 left-4 z-10 flex flex-col gap-2">
					<MapToolbar
						activeTool={activeTool}
						onToolChange={setActiveTool}
						onClear={() => setActiveTool(null)}
					/>
					<div className="flex flex-col gap-2 p-2 bg-background/50 backdrop-blur-sm rounded-lg border shadow-sm">
						<ToolButton
							icon={Layers}
							label="Layers"
							active={activePanel === "layers"}
							onClick={() => setActivePanel(activePanel === "layers" ? null : "layers")}
						/>
					</div>
				</div>
			</MapShell>
		</div>
	);
}
