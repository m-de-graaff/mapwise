import { ScrollArea } from "../shadcn/scroll-area";
import { cn } from "../utils/cn";
import { LegendItem } from "../legend/LegendItem";
import type { Layer } from "../panels/LayerPanel";

interface LegendPanelProps {
	layers: Layer[];
	className?: string;
}

export function LegendPanel({ layers, className }: LegendPanelProps) {
	// Only show visible layers
	const visibleLayers = layers.filter((l) => l.visible);

	return (
		<div className={cn("flex flex-col h-full", className)}>
			<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider p-4 pb-2">
				Legend
			</h3>

			<ScrollArea className="flex-1 px-4">
				{visibleLayers.length === 0 ? (
					<div className="text-sm text-muted-foreground italic py-4 text-center">
						No visible layers
					</div>
				) : (
					<div className="space-y-2 pb-4">
						{visibleLayers.map((layer) => (
							<LegendItem key={layer.id} layer={layer} />
						))}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
