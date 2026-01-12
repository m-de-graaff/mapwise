import { useState } from "react";
import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";

import { createPmtilesLayer, getPmtilesInfo, type PmtilesVectorLayer } from "@mapwise/layers";
import type { LayerConfig } from "./AddLayerDialog";

interface PmtilesLayerFormProps {
	onAdd: (layerConfig: LayerConfig) => void;
}

export function PmtilesLayerForm({ onAdd }: PmtilesLayerFormProps) {
	const [url, setUrl] = useState("");
	const [name, setName] = useState("");

	// Inspection state
	const [inspecting, setInspecting] = useState(false);
	const [inspectError, setInspectError] = useState<string>("");
	const [isVector, setIsVector] = useState(false);
	const [sourceLayer, setSourceLayer] = useState("");
	const [detectedLayers, setDetectedLayers] = useState<PmtilesVectorLayer[]>([]);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Inspection logic is complex
	const handleInspect = async () => {
		if (!url) {
			return;
		}
		setInspecting(true);
		setInspectError("");
		try {
			const { header, metadata } = await getPmtilesInfo(url);

			// TileType 1 is MVT (Vector)
			if (header.tileType === 1) {
				setIsVector(true);
				if (metadata.vector_layers && metadata.vector_layers.length > 0) {
					setDetectedLayers(metadata.vector_layers);
					// Auto-select first layer if not already set
					if (!sourceLayer) {
						setSourceLayer(metadata.vector_layers[0].id);
					}
				} else {
					setDetectedLayers([]);
				}
			} else {
				setIsVector(false);
				setDetectedLayers([]);
				setSourceLayer("");
			}

			// Pre-fill name if available and not set
			if (!name && metadata.name) {
				setName(metadata.name);
			}
			// biome-ignore lint/suspicious/noExplicitAny: Error type mismatch
		} catch (err: any) {
			console.error("Failed to inspect PMTiles", err);
			setInspectError(`Failed to inspect PMTiles: ${err.message || "Unknown error"}`);
		} finally {
			setInspecting(false);
		}
	};

	const handleAdd = async () => {
		if (!url) {
			return;
		}

		// Sanitize name for ID
		const layerName = name || "PMTiles Layer";
		const sanitizedName = layerName.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
		const id = `pmtiles-${sanitizedName}-${Date.now()}`;

		try {
			// Construct config based on detected type
			// biome-ignore lint/suspicious/noExplicitAny: Dynamic config construction
			const config: any = {
				id,
				url,
				title: layerName,
				opacity: 1,
			};

			if (isVector && sourceLayer) {
				config.sourceLayer = sourceLayer;
			}

			const layerDef = await createPmtilesLayer(config);

			onAdd({
				...layerDef,
				name: layerName,
				keepOpen: true,
			} as unknown as LayerConfig);
		} catch (err) {
			console.error("Failed to create PMTile layer", err);
			setInspectError(
				`Failed to create layer: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	return (
		<div className="space-y-4 py-4">
			<div className="grid gap-1.5">
				<Label htmlFor="pm-url">PMTiles URL</Label>
				<div className="flex gap-2">
					<Input
						id="pm-url"
						placeholder="https://example.com/map.pmtiles"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
					/>
					<Button
						type="button"
						variant="outline"
						onClick={handleInspect}
						disabled={!url || inspecting}
					>
						{inspecting ? "..." : "Inspect"}
					</Button>
				</div>
				{inspectError && <p className="text-destructive text-sm">{inspectError}</p>}
			</div>

			{isVector && (
				<div className="grid gap-1.5">
					<Label htmlFor="pm-source-layer">Source Layer (Vector)</Label>
					<Input
						id="pm-source-layer"
						placeholder="e.g. protomaps"
						value={sourceLayer}
						onChange={(e) => setSourceLayer(e.target.value)}
					/>
					{detectedLayers.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{detectedLayers.map((l) => (
								<button
									key={l.id}
									type="button"
									className="text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded"
									onClick={() => setSourceLayer(l.id)}
									title={l.description}
								>
									{l.id}
								</button>
							))}
						</div>
					)}
				</div>
			)}

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
				<Button onClick={handleAdd} disabled={!url || (isVector && !sourceLayer)}>
					Add Layer
				</Button>
			</div>
		</div>
	);
}
