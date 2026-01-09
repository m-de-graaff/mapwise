import { useState } from "react";
import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";
import { ScrollArea } from "../shadcn/scroll-area";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { cn } from "../utils/cn";

import type { LayerConfig } from "./AddLayerDialog";

interface WmtsLayerFormProps {
	onAdd: (layerConfig: LayerConfig) => void;
}

export function WmtsLayerForm({ onAdd }: WmtsLayerFormProps) {
	const [url, setUrl] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [layers, setLayers] = useState<
		{ identifier: string; title: string; [key: string]: unknown }[]
	>([]);
	const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

	const handleFetch = async () => {
		if (!url) {
			return;
		}
		setIsLoading(true);
		setLayers([]);

		try {
			await new Promise((resolve) => setTimeout(resolve, 800));
			// Mock result
			setLayers([
				{ identifier: "ign-scan25", title: "IGN Scan 25" },
				{ identifier: "ign-ortho", title: "IGN Orthophoto" },
			]);
			toast.success("Capabilities fetched");
		} catch {
			toast.error("Failed to fetch");
		} finally {
			setIsLoading(false);
		}
	};

	const handleAdd = () => {
		if (!selectedLayer) {
			return;
		}
		const layer = layers.find((l) => l.identifier === selectedLayer);
		onAdd({
			type: "wmts",
			source: {
				url,
				layer: selectedLayer,
			},
			name: layer?.title || selectedLayer,
		});
	};

	return (
		<div className="space-y-4 py-4">
			<div className="flex gap-2 items-end">
				<div className="grid w-full gap-1.5">
					<Label htmlFor="wmts-url">GetCapabilities URL</Label>
					<Input
						id="wmts-url"
						placeholder="https://example.com/wmts/..."
						value={url}
						onChange={(e) => setUrl(e.target.value)}
					/>
				</div>
				<Button onClick={handleFetch} disabled={isLoading || !url}>
					{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
				</Button>
			</div>

			{layers.length > 0 && (
				<div className="border rounded-md">
					<div className="bg-muted px-3 py-2 text-sm font-medium border-b">Available Layers</div>
					<ScrollArea className="h-[200px]">
						<div className="p-1">
							{layers.map((layer) => (
								<button
									type="button"
									key={layer.identifier}
									onClick={() => setSelectedLayer(layer.identifier)}
									className={cn(
										"flex w-full items-center justify-between px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
										selectedLayer === layer.identifier && "bg-accent text-accent-foreground",
									)}
								>
									<span>{layer.title}</span>
									{selectedLayer === layer.identifier && <Check className="h-4 w-4" />}
								</button>
							))}
						</div>
					</ScrollArea>
				</div>
			)}

			{layers.length > 0 && (
				<div className="flex justify-end pt-2">
					<Button onClick={handleAdd} disabled={!selectedLayer}>
						Add Layer
					</Button>
				</div>
			)}
		</div>
	);
}
