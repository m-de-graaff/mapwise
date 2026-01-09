import { cn } from "../utils/cn";
import { MousePointer2, Ruler, PenTool } from "lucide-react";

export interface ToolStatusPanelProps {
	activeTool: "inspect" | "measure" | "draw" | null;
	className?: string;
}

export function ToolStatusPanel({ activeTool, className }: ToolStatusPanelProps) {
	if (!activeTool) {
		return null;
	}

	let message = "";
	let Icon = MousePointer2;

	switch (activeTool) {
		case "inspect": {
			message = "Click on a feature to view details";
			Icon = MousePointer2;
			break;
		}
		case "draw": {
			message = "Click to add points. Double-click to finish.";
			Icon = PenTool;
			break;
		}
		case "measure": {
			message = "Click to measure distance. Double-click to finish.";
			Icon = Ruler;
			break;
		}
	}

	return (
		<div
			className={cn(
				"bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-3 text-sm font-medium animate-in slide-in-from-bottom-5 fade-in duration-300",
				className,
			)}
		>
			<Icon className="h-4 w-4" />
			<span>{message}</span>
			<span className="text-primary-foreground/60 text-xs ml-2 pl-2 border-l border-primary-foreground/30">
				Esc to cancel
			</span>
		</div>
	);
}
