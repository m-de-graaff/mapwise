import { MousePointer2, Ruler, PenTool, Trash2 } from "lucide-react";
import { ToolButton } from "./ToolButton";
import { cn } from "../utils/cn";

export type ToolId = "inspect" | "measure" | "draw" | null;

export interface MapToolbarProps {
	activeTool: ToolId;
	onToolChange: (tool: ToolId) => void;
	onClear: () => void;
	className?: string;
	orientation?: "vertical" | "horizontal";
}

export function MapToolbar({
	activeTool,
	onToolChange,
	onClear,
	className,
	orientation = "vertical",
}: MapToolbarProps) {
	const isVertical = orientation === "vertical";

	return (
		<div
			className={cn(
				"flex gap-2 p-2 bg-background/50 backdrop-blur-sm rounded-lg border shadow-sm",
				isVertical ? "flex-col" : "flex-row",
				className,
			)}
		>
			<ToolButton
				icon={MousePointer2}
				label="Inspect Features"
				active={activeTool === "inspect"}
				onClick={() => onToolChange("inspect")} // Toggle logic could be handled here or parent
				shortcut="I"
			/>

			<ToolButton
				icon={PenTool}
				label="Draw Shapes"
				active={activeTool === "draw"}
				onClick={() => onToolChange("draw")}
				shortcut="D"
			/>

			<ToolButton
				icon={Ruler}
				label="Measure Distance"
				active={activeTool === "measure"}
				onClick={() => onToolChange("measure")}
				shortcut="M"
			/>

			<div className={cn("bg-border", isVertical ? "h-px w-full my-1" : "w-px h-full mx-1")} />

			<ToolButton
				icon={Trash2}
				label="Clear All"
				onClick={onClear}
				className="text-destructive hover:bg-destructive/10 hover:text-destructive"
				shortcut="Del"
			/>
		</div>
	);
}
