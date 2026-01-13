import { MousePointer2, Hexagon, Component, MapPin } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "../shadcn/toggle-group.js";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../shadcn/tooltip.js";

export type DrawMode = "point" | "line_string" | "polygon" | "select" | null;

interface DrawModeSelectorProps {
	mode: DrawMode;
	onModeChange: (mode: DrawMode) => void;
}

export function DrawModeSelector({ mode, onModeChange }: DrawModeSelectorProps) {
	return (
		<div className="flex justify-center p-2 mb-4">
			<TooltipProvider>
				<ToggleGroup
					type="single"
					value={mode || ""}
					onValueChange={(val) => onModeChange(val ? (val as DrawMode) : null)}
				>
					<Tooltip>
						<TooltipTrigger asChild>
							<ToggleGroupItem value="select" aria-label="Select & Edit">
								<MousePointer2 className="h-4 w-4" />
							</ToggleGroupItem>
						</TooltipTrigger>
						<TooltipContent>Select & Edit</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<ToggleGroupItem value="point" aria-label="Draw Point">
								<MapPin className="h-4 w-4" />
							</ToggleGroupItem>
						</TooltipTrigger>
						<TooltipContent>Draw Point</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<ToggleGroupItem value="line_string" aria-label="Draw Line">
								<Component className="h-4 w-4" />
							</ToggleGroupItem>
						</TooltipTrigger>
						<TooltipContent>Draw Line</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<ToggleGroupItem value="polygon" aria-label="Draw Polygon">
								<Hexagon className="h-4 w-4" />
							</ToggleGroupItem>
						</TooltipTrigger>
						<TooltipContent>Draw Polygon</TooltipContent>
					</Tooltip>
				</ToggleGroup>
			</TooltipProvider>
		</div>
	);
}
