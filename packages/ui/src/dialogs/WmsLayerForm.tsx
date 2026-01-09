import { useState, useMemo } from "react";
import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";
import { toast } from "sonner";
import { Loader2, Check, Search } from "lucide-react";
import { cn } from "../utils/cn";
import { useDebounce } from "use-debounce";
// @ts-ignore
import { FixedSizeList } from "react-window";

import type { LayerConfig } from "./AddLayerDialog";

interface WmsLayerFormProps {
	onAdd: (layerConfig: LayerConfig) => void;
}

interface LayerOption {
	name: string;
	title: string;
}

export function WmsLayerForm({ onAdd }: WmsLayerFormProps) {
	const [url, setUrl] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [layers, setLayers] = useState<LayerOption[]>([]);
	const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearch] = useDebounce(searchQuery, 300);

	const handleFetch = async () => {
		if (!url) {
			return;
		}
		setIsLoading(true);
		setLayers([]);
		setSelectedLayer(null);

		try {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Simulating a parsed result with many layers to test virtualization
			const mockLayers = Array.from({ length: 1000 }, (_, i) => ({
				name: `layer-${i}`,
				title: `Layer Title ${i} (Data Source)`,
			}));

			// Add some specific named ones
			mockLayers.unshift(
				{ name: "background", title: "Background Map" },
				{ name: "topography", title: "Topography" },
			);

			setLayers(mockLayers);
			toast.success("Capabilities fetched successfully");
		} catch (_err) {
			toast.error("Failed to fetch capabilities");
		} finally {
			setIsLoading(false);
		}
	};

	const handleAdd = () => {
		if (!selectedLayer) {
			return;
		}
		const layer = layers.find((l) => l.name === selectedLayer);
		onAdd({
			type: "wms",
			source: {
				url,
				params: { LAYERS: selectedLayer },
			},
			name: layer?.title || selectedLayer,
		});
	};

	const filteredLayers = useMemo(() => {
		if (!debouncedSearch) {
			return layers;
		}
		const lower = debouncedSearch.toLowerCase();
		return layers.filter(
			(l) => l.title.toLowerCase().includes(lower) || l.name.toLowerCase().includes(lower),
		);
	}, [layers, debouncedSearch]);

	const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
		const layer = filteredLayers[index];
		if (!layer) {
			return null;
		}

		const isSelected = selectedLayer === layer.name;

		return (
			<div style={style}>
				<button
					type="button"
					onClick={() => setSelectedLayer(layer.name)}
					className={cn(
						"flex w-full items-center justify-between px-3 h-full text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
						isSelected && "bg-accent text-accent-foreground",
					)}
				>
					<span className="truncate pr-2">
						{layer.title} <span className="text-muted-foreground ml-2 text-xs">({layer.name})</span>
					</span>
					{isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
				</button>
			</div>
		);
	};

	return (
		<div className="space-y-4 py-4">
			<div className="flex gap-2 items-end">
				<div className="grid w-full gap-1.5">
					<Label htmlFor="wms-url">GetCapabilities URL</Label>
					<Input
						id="wms-url"
						placeholder="https://example.com/wms?service=WMS..."
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
					<div className="bg-muted px-3 py-2 text-sm font-medium border-b flex justify-between items-center">
						<span>Available Layers ({filteredLayers.length})</span>
					</div>

					<div className="p-2 border-b">
						<div className="relative">
							<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search layers..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8"
							/>
						</div>
					</div>

					<div className="h-[200px]">
						{filteredLayers.length === 0 ? (
							<div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">
								No layers found
							</div>
						) : (
							<FixedSizeList
								height={200}
								itemCount={filteredLayers.length}
								itemSize={36}
								width="100%"
							>
								{Row}
							</FixedSizeList>
						)}
					</div>
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
