import { useState } from "react";
import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";
import { Textarea } from "../shadcn/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../shadcn/tabs";
import { toast } from "sonner";

import type { LayerConfig } from "./AddLayerDialog";

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
		if (mode === "raw") {
			try {
				JSON.parse(raw);
			} catch {
				toast.error("Invalid JSON");
				return;
			}
		}

		onAdd({
			type: "geojson",
			source: mode === "url" ? { url } : { data: JSON.parse(raw) },
			name,
		});
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
