import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "../shadcn/button.js";
import { Slider } from "../shadcn/slider.js";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover.js";

import type { PanelLayer } from "./LayerPanel.js";

interface LayerItemProps {
	layer: PanelLayer;
	onToggle: (id: string) => void;
	onOpacityChange: (id: string, val: number) => void;
	onRemove: (id: string) => void;
	onRename?: (id: string, name: string) => void; // Optional for now
}

export function LayerItem({ layer, onToggle, onOpacityChange, onRemove }: LayerItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: layer.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className="relative group touch-none">
			{/* Context Menu Wrapper */}
			<div className="flex items-center gap-2 p-2 bg-card border border-border rounded-md mb-2 shadow-sm hover:shadow-md transition-shadow">
				{/* Drag Handle */}
				<div
					{...attributes}
					{...listeners}
					className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
				>
					<GripVertical className="h-4 w-4" />
				</div>

				{/* Visibility Toggle */}
				<button
					type="button"
					onClick={() => onToggle(layer.id)}
					className="text-muted-foreground hover:text-foreground focus:outline-none"
					aria-label={layer.visible ? "Hide layer" : "Show layer"}
				>
					{layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 opacity-50" />}
				</button>

				{/* Name */}
				<span className="flex-1 text-sm font-medium truncate select-none">{layer.name}</span>

				{/* Opacity Control (Mini Popover) */}
				<Popover>
					<PopoverTrigger asChild>
						<Button variant="ghost" size="icon" className="h-6 w-6">
							<span className="text-xs font-mono">{Math.round(layer.opacity * 100)}%</span>
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-64 p-4">
						<div className="flex flex-col gap-2">
							<label htmlFor={`opacity-${layer.id}`} className="text-xs font-medium">
								Opacity
							</label>
							<Slider
								id={`opacity-${layer.id}`}
								defaultValue={[layer.opacity]}
								max={1}
								step={0.01}
								onValueChange={(vals) => onOpacityChange(layer.id, vals[0] ?? 1)}
							/>
						</div>
					</PopoverContent>
				</Popover>

				{/* Actions Menu */}
				<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(layer.id)}>
					<Trash2 className="h-4 w-4 text-destructive" />
				</Button>
			</div>
		</div>
	);
}
