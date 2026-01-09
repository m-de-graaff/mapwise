import { useState } from "react";
import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";

import type { LayerConfig } from "./AddLayerDialog";

interface PmtilesLayerFormProps {
	onAdd: (layerConfig: LayerConfig) => void;
}

export function PmtilesLayerForm({ onAdd }: PmtilesLayerFormProps) {
	const [url, setUrl] = useState("");
	const [name, setName] = useState("");

	const handleAdd = () => {
		if (!url) {
			return;
		}
		onAdd({
			type: "pmtiles",
			source: { url },
			name: name || "PMTiles Layer",
		});
	};

	return (
		<div className="space-y-4 py-4">
			<div className="grid gap-1.5">
				<Label htmlFor="pm-url">PMTiles URL</Label>
				<Input
					id="pm-url"
					placeholder="https://example.com/map.pmtiles"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
				/>
			</div>

			<div className="grid gap-1.5">
				<Label htmlFor="pm-name">Layer Name (Optional)</Label>
				<Input
					id="pm-name"
					placeholder="Custom PMTiles Layer"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</div>

			<div className="flex justify-end pt-2">
				<Button onClick={handleAdd} disabled={!url}>
					Add Layer
				</Button>
			</div>
		</div>
	);
}
