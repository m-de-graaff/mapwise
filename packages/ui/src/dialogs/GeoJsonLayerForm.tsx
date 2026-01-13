import { useState } from "react";
import { Button } from "../shadcn/button.js";
import { Input } from "../shadcn/input.js";
import { Label } from "../shadcn/label.js";
import { Textarea } from "../shadcn/textarea.js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../shadcn/tabs.js";
import { toast } from "sonner";

import type { LayerConfig } from "./AddLayerDialog.js";

interface GeoJsonLayerFormProps {
	onAdd: (layerConfig: LayerConfig) => void;
}

export function GeoJsonLayerForm({ onAdd }: GeoJsonLayerFormProps) {
	const [mode, setMode] = useState("url");
	const [url, setUrl] = useState("");
	const [raw, setRaw] = useState("");
	const [name, setName] = useState("New GeoJSON Layer");

	const handleAdd = () => {
		if (mode === "url" && !url) {
			return;
		}

		// biome-ignore lint/suspicious/noExplicitAny: Dynamic source data
		let sourceData: any;
		if (mode === "raw") {
			try {
				sourceData = JSON.parse(raw);
			} catch {
				toast.error("Invalid JSON");
				return;
			}
		}

		// Generate a unique ID
		const id = `layer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		const sourceId = `${id}-source`;

		// Create a complete MapLibreLayerDefinition
		const layerDef = {
			id,
			type: "geojson-layer", // Opaque type for registry
			metadata: {
				title: name,
			},
			source: {
				id: sourceId,
				spec: {
					type: "geojson",
					data: mode === "url" ? url : sourceData,
				},
			},
			layers: [
				// Polygon Fill
				{
					id: `${id}-fill`,
					type: "fill",
					source: sourceId,
					paint: {
						"fill-color": "#3b82f6",
						"fill-opacity": 0.5,
					},
					filter: ["==", "$type", "Polygon"],
				},
				// Polygon Outline
				{
					id: `${id}-line`,
					type: "line",
					source: sourceId,
					paint: {
						"line-color": "#2563eb",
						"line-width": 2,
					},
					filter: ["==", "$type", "Polygon"],
				},
				// LineString
				{
					id: `${id}-path`,
					type: "line",
					source: sourceId,
					paint: {
						"line-color": "#2563eb",
						"line-width": 3,
					},
					filter: ["==", "$type", "LineString"],
				},
				// Point
				{
					id: `${id}-point`,
					type: "circle",
					source: sourceId,
					paint: {
						"circle-color": "#3b82f6",
						"circle-radius": 6,
						"circle-stroke-width": 2,
						"circle-stroke-color": "#ffffff",
					},
					filter: ["==", "$type", "Point"],
				},
			],
		};

		// biome-ignore lint/suspicious/noExplicitAny: Layer config cast
		onAdd(layerDef as any); // Cast to any or LayerConfig if needed
	};

	return (
		<div className="space-y-4 py-4">
			<Tabs value={mode} onValueChange={setMode}>
				<TabsList className="w-full">
					<TabsTrigger value="url" className="flex-1">
						URL
					</TabsTrigger>
					<TabsTrigger value="raw" className="flex-1">
						Paste JSON
					</TabsTrigger>
					{/* Upload could be another tab */}
				</TabsList>

				<TabsContent value="url" className="space-y-4">
					<div className="grid gap-1.5">
						<Label htmlFor="gj-url">GeoJSON URL</Label>
						<Input
							id="gj-url"
							placeholder="https://example.com/data.geojson"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
						/>
					</div>
				</TabsContent>

				<TabsContent value="raw" className="space-y-4">
					<div className="grid gap-1.5">
						<Label htmlFor="gj-raw">Raw JSON</Label>
						<Textarea
							id="gj-raw"
							placeholder='{"type": "FeatureCollection", ...}'
							className="h-[150px] font-mono text-xs"
							value={raw}
							onChange={(e) => setRaw(e.target.value)}
						/>
					</div>
				</TabsContent>
			</Tabs>

			<div className="grid gap-1.5">
				<Label htmlFor="gj-name">Layer Name</Label>
				<Input id="gj-name" value={name} onChange={(e) => setName(e.target.value)} />
			</div>

			<div className="flex justify-end pt-2">
				<Button onClick={handleAdd}>Add Layer</Button>
			</div>
		</div>
	);
}
