import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { WmsLegend } from "./WmsLegend";
import { VectorLegend } from "./VectorLegend";
import type { Layer } from "../hooks/useLayerList"; // Assuming type reuse

interface LegendItemProps {
	layer: Layer;
}

export function LegendItem({ layer }: LegendItemProps) {
	const [isExpanded, setIsExpanded] = useState(true);

	// Helper to determine legend type
	// In a real app, layer would have a specific 'legend' property or we infer from source
	const isWms = layer.type === "overlay" && layer.params?.["LAYERS"]; // Very loose heuristic for this mock

	// Mock logic: if it has a 'style' property it's vector, else try WMS URL
	// We'll mock a WMS legend URL for demo if it's WMS
	const wmsLegendUrl = isWms
		? "https://www.google.com/images/branding/googlelogo/1x/googlelogo_light_color_272x92dp.png" // temp placeholder for demo
		: // ? `${layer.source?.url}?SERVICE=WMS&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=${layer.params.LAYERS}`
			undefined;

	return (
		<div className="border rounded-md bg-card overflow-hidden">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center w-full px-3 py-2 text-sm font-medium hover:bg-accent transition-colors gap-2"
			>
				{isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
				<span className="truncate">{layer.name}</span>
			</button>

			{isExpanded && (
				<div className="px-3 pb-3 pt-1 border-t border-border/50 bg-muted/10">
					{isWms && wmsLegendUrl ? (
						<WmsLegend url={wmsLegendUrl} />
					) : isWms ? null : (
						// Fallback to vector style
						<VectorLegend style={{ color: "#ef4444" }} type="polygon" />
					)}
				</div>
			)}
		</div>
	);
}
