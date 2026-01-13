import { useState, useMemo } from "react";
import { Button } from "../shadcn/button.js";
import { Input } from "../shadcn/input.js";
import { Label } from "../shadcn/label.js";
import { toast } from "sonner";
import { Loader2, Check, Search } from "lucide-react";
import { cn } from "../utils/cn.js";
import { useDebounce } from "use-debounce";
import type { ComponentType } from "react";
import { List as FixedSizeListImpl } from "react-window";

// Type coercion to resolve React 18/TypeScript compatibility issues
// See: https://github.com/bvaughn/react-window/issues/654
import {
	fetchWmsCapabilities,
	createWmsRasterLayer,
	type WmsCapabilityLayer,
} from "@mapwise/layers";

// Type coercion to resolve React 18/TypeScript compatibility issues
// See: https://github.com/bvaughn/react-window/issues/654
// biome-ignore lint/suspicious/noExplicitAny: Library type mismatch
const FixedSizeList = FixedSizeListImpl as unknown as ComponentType<any>;

import type { LayerConfig } from "./AddLayerDialog.js";

interface WmsLayerFormProps {
	onAdd: (layerConfig: LayerConfig) => void;
}

interface LayerOption {
	name: string;
	title: string;
}

function flattenLayers(layers: WmsCapabilityLayer[]): LayerOption[] {
	const result: LayerOption[] = [];

	function traverse(layerList: WmsCapabilityLayer[]) {
		for (const layer of layerList) {
			if (layer.name) {
				result.push({
					name: layer.name,
					title: layer.title || layer.name,
				});
			}
			if (layer.layers) {
				traverse(layer.layers);
			}
		}
	}

	traverse(layers);
	return result;
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
			const capabilities = await fetchWmsCapabilities(url);

			if (capabilities.layer) {
				const flatLayers = flattenLayers(
					Array.isArray(capabilities.layer) ? capabilities.layer : [capabilities.layer],
				);
				setLayers(flatLayers);
				toast.success(`Fetched ${flatLayers.length} layers`);
			} else {
				console.warn("No layer found in response");
				toast.warning("No layers found in capabilities");
			}
		} catch (_err) {
			console.error("WMS Fetch Error:", _err);
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

		// Sanitize ID: replace invalid chars with hyphens
		const sanitizedLayerName = selectedLayer.replace(/[^a-zA-Z0-9-_]/g, "-");

		// Use factory to create proper layer definition
		const layerDef = createWmsRasterLayer({
			id: `wms-${sanitizedLayerName}-${Date.now()}`,
			baseUrl: url,
			layers: selectedLayer,
			title: layer?.title || selectedLayer,
		});

		onAdd({
			...layerDef,
			name: layer?.title || selectedLayer, // Helper for UI success message
		} as unknown as LayerConfig);
	};

	const handleAddAll = () => {
		if (filteredLayers.length === 0) {
			return;
		}

		for (const layer of filteredLayers) {
			// Sanitize ID
			const sanitizedLayerName = layer.name.replace(/[^a-zA-Z0-9-_]/g, "-");

			const layerDef = createWmsRasterLayer({
				id: `wms-${sanitizedLayerName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				baseUrl: url,
				layers: layer.name,
				title: layer.title || layer.name,
			});

			onAdd({
				...layerDef,
				name: layer.title || layer.name,
				keepOpen: true,
			} as unknown as LayerConfig);
		}
		toast.success(`Added ${filteredLayers.length} layers`);
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
								defaultHeight={200}
								rowCount={filteredLayers.length}
								rowHeight={36}
								width="100%"
								rowComponent={Row}
								rowProps={{}}
							/>
						)}
					</div>
				</div>
			)}

			{layers.length > 0 && (
				<div className="flex justify-between pt-2">
					<Button variant="outline" onClick={handleAddAll} disabled={filteredLayers.length === 0}>
						Add All ({filteredLayers.length})
					</Button>
					<Button onClick={handleAdd} disabled={!selectedLayer}>
						Add Layer
					</Button>
				</div>
			)}
		</div>
	);
}
