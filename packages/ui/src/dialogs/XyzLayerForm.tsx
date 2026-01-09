import { useState } from "react";
import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";

import type { LayerConfig } from "./AddLayerDialog";

interface XyzLayerFormProps {
	onAdd: (layerConfig: LayerConfig) => void;
}

export function XyzLayerForm({ onAdd }: XyzLayerFormProps) {
	const [url, setUrl] = useState("");
	const [name, setName] = useState("");
	const [attribution, setAttribution] = useState("");

	const handleAdd = () => {
		if (!(url && name)) {
			return;
		}
		onAdd({
			type: "xyz",
			source: {
				url,
				attribution,
			},
			name,
		});
	};

	return (
		<div className="space-y-4 py-4">
			<div className="grid gap-1.5">
				<Label htmlFor="xyz-url">Template URL</Label>
				<Input
					id="xyz-url"
					placeholder="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
				/>
				<p className="text-xs text-muted-foreground">
					Supports {"{z}"}, {"{x}"}, {"{y}"} placeholders.
				</p>
			</div>

			<div className="grid gap-1.5">
				<Label htmlFor="xyz-name">Layer Name</Label>
				<Input
					id="xyz-name"
					placeholder="My Custom Tile Layer"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</div>

			<div className="grid gap-1.5">
				<Label htmlFor="xyz-attr">Attribution (Optional)</Label>
				<Input
					id="xyz-attr"
					placeholder="© OpenStreetMap contributors"
					value={attribution}
					onChange={(e) => setAttribution(e.target.value)}
				/>
			</div>

			<div className="flex justify-end pt-2">
				<Button onClick={handleAdd} disabled={!(url && name)}>
					Add Layer
				</Button>
			</div>
		</div>
	);
}
