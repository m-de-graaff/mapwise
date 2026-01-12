import { useState, useMemo } from "react";
import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";
import { toast } from "sonner";
import { Loader2, Check, Search } from "lucide-react";
import { cn } from "../utils/cn";
import { useDebounce } from "use-debounce";
import type { ComponentType } from "react";
import { List as FixedSizeListImpl } from "react-window";

// Type coercion to resolve React 18/TypeScript compatibility issues
// biome-ignore lint/suspicious/noExplicitAny: Library type mismatch
const FixedSizeList = FixedSizeListImpl as unknown as ComponentType<any>;

import type { LayerConfig } from "./AddLayerDialog";
import {
	fetchWmtsCapabilities,
	createWmtsRasterLayer,
	type WmtsCapabilities,
} from "@mapwise/layers";

interface WmtsLayerFormProps {
	onAdd: (layerConfig: LayerConfig) => void;
}

interface LayerOption {
	identifier: string;
	title: string;
	abstract?: string;
}

export function WmtsLayerForm({ onAdd }: WmtsLayerFormProps) {
	const [url, setUrl] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [layers, setLayers] = useState<LayerOption[]>([]);
	const [wmtsCapabilities, setWmtsCapabilities] = useState<WmtsCapabilities | null>(null);
	const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearch] = useDebounce(searchQuery, 300);

	const handleFetch = async () => {
		if (!url) {
			return;
		}
		setIsLoading(true);
		setLayers([]);
		setWmtsCapabilities(null);
		setSelectedLayers(new Set());

		try {
			const capabilities = await fetchWmtsCapabilities(url);

			if (capabilities.layers && capabilities.layers.length > 0) {
				setLayers(
					capabilities.layers.map((l) => ({
						identifier: l.identifier,
						title: l.title || l.identifier,
						...(l.abstract ? { abstract: l.abstract } : {}),
					})),
				);
				setWmtsCapabilities(capabilities);
				toast.success(`Fetched ${capabilities.layers.length} layers`);
			} else {
				toast.warning("No layers found in capabilities");
			}
		} catch (err) {
			console.error("WMTS Fetch Error:", err);
			toast.error("Failed to fetch capabilities");
		} finally {
			setIsLoading(false);
		}
	};

	const toggleLayer = (identifier: string) => {
		const newSelected = new Set(selectedLayers);
		if (newSelected.has(identifier)) {
			newSelected.delete(identifier);
		} else {
			newSelected.add(identifier);
		}
		setSelectedLayers(newSelected);
	};

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Bulk add logic
	const handleAddSelected = async () => {
		if (selectedLayers.size === 0 || !wmtsCapabilities) {
			return;
		}

		setIsLoading(true);
		let successCount = 0;
		const errors: string[] = [];

		for (const identifier of Array.from(selectedLayers)) {
			try {
				const layer = layers.find((l) => l.identifier === identifier);
				if (!layer) {
					continue;
				}

				// Sanitize ID
				const sanitizedLayerName = identifier.replace(/[^a-zA-Z0-9-_]/g, "-");
				const layerId = `wmts-${sanitizedLayerName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

				// Create layer definition using factory
				// Pass pre-fetched capabilities to avoid frequent re-fetching
				const layerDef = await createWmtsRasterLayer({
					id: layerId,
					capabilitiesUrl: url,
					layerId: identifier,
					title: layer.title || identifier,
					prefetchedCapabilities: wmtsCapabilities,
				});

				onAdd({
					...layerDef,
					name: layer.title || identifier,
					keepOpen: true,
				} as unknown as LayerConfig);
				successCount++;
			} catch (err) {
				console.error(`Failed to create layer ${identifier}:`, err);
				errors.push(`Failed to add ${identifier}`);
			}
		}

		if (successCount > 0) {
			toast.success(`Added ${successCount} layers`);
		}
		if (errors.length > 0) {
			toast.error(`Added ${successCount} layers. Failed to add ${errors.length} layers.`);
		}

		setIsLoading(false);
		// Clear selection if no errors, otherwise keep selection to retry
		if (errors.length === 0) {
			setSelectedLayers(new Set());
		}
	};

	const filteredLayers = useMemo(() => {
		if (!debouncedSearch) {
			return layers;
		}
		const lower = debouncedSearch.toLowerCase();
		return layers.filter(
			(l) => l.title.toLowerCase().includes(lower) || l.identifier.toLowerCase().includes(lower),
		);
	}, [layers, debouncedSearch]);

	const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
		const layer = filteredLayers[index];
		if (!layer) {
			return null;
		}

		const isSelected = selectedLayers.has(layer.identifier);

		return (
			<div style={style}>
				<button
					type="button"
					onClick={() => toggleLayer(layer.identifier)}
					className={cn(
						"flex w-full items-center justify-between px-3 h-full text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left",
						isSelected && "bg-accent text-accent-foreground",
					)}
				>
					<span className="truncate pr-2">
						{layer.title}{" "}
						<span className="text-muted-foreground ml-2 text-xs">({layer.identifier})</span>
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
					<div className="bg-muted px-3 py-2 text-sm font-medium border-b flex justify-between items-center">
						<span>Available Layers ({filteredLayers.length})</span>
						{selectedLayers.size > 0 && (
							<span className="text-xs text-muted-foreground">{selectedLayers.size} selected</span>
						)}
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
				<div className="flex justify-end pt-2">
					<Button onClick={handleAddSelected} disabled={selectedLayers.size === 0 || isLoading}>
						{isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
						Add Selected ({selectedLayers.size})
					</Button>
				</div>
			)}
		</div>
	);
}
