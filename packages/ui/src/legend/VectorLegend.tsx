import { cn } from "../utils/cn";

interface VectorStyle {
	color?: string;
	fillColor?: string;
	strokeColor?: string;
	width?: number;
	opacity?: number;
}

interface VectorLegendProps {
	style?: VectorStyle;
	type?: "point" | "line" | "polygon";
}

export function VectorLegend({ style, type = "polygon" }: VectorLegendProps) {
	const fillColor = style?.fillColor || style?.color || "#3b82f6";
	const strokeColor = style?.strokeColor || style?.color || "#2563eb";
	const strokeWidth = style?.width || 1;
	const opacity = style?.opacity ?? 1;

	// Simple swatches
	return (
		<div className="flex items-center gap-2 p-1">
			<div
				className={cn(
					"h-4 w-4 rounded-sm border",
					type === "line" && "h-1 w-6 border-none rounded-none",
				)}
				style={{
					backgroundColor: type === "line" ? strokeColor : fillColor,
					borderColor: strokeColor,
					borderWidth: type === "line" ? 0 : strokeWidth,
					opacity,
				}}
			/>
			<span className="text-xs text-muted-foreground capitalize">{type} Style</span>
		</div>
	);
}
