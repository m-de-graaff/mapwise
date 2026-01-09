import { Copy } from "lucide-react";
import { Button } from "../shadcn/button";
import { toast } from "sonner";

interface MeasureResultProps {
	value: number; // in meters or square meters
	type: "distance" | "area";
	unit: "metric" | "imperial";
}

export function MeasureResult({ value, type, unit }: MeasureResultProps) {
	const formatDistance = () => {
		if (unit === "metric") {
			return value > 1000 ? `${(value / 1000).toFixed(2)} km` : `${value.toFixed(1)} m`;
		}
		const feet = value * 3.28084;
		return feet > 5280 ? `${(feet / 5280).toFixed(2)} mi` : `${feet.toFixed(1)} ft`;
	};

	const formatArea = () => {
		if (unit === "metric") {
			return value > 1000000 ? `${(value / 1000000).toFixed(2)} km²` : `${value.toFixed(1)} m²`;
		}
		const sqFeet = value * 10.7639;
		return sqFeet > 27878400 ? `${(sqFeet / 27878400).toFixed(2)} mi²` : `${sqFeet.toFixed(1)} ft²`;
	};

	const formatted = type === "distance" ? formatDistance() : formatArea();

	const handleCopy = () => {
		navigator.clipboard.writeText(formatted);
		toast.success("Measurement copied to clipboard");
	};

	return (
		<div className="flex items-center gap-2 bg-muted/30 p-2 rounded-md border border-border">
			<div className="flex-1 font-mono text-lg font-medium tracking-tight">{formatted}</div>
			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8 text-muted-foreground"
				onClick={handleCopy}
				title="Copy result"
			>
				<Copy className="h-4 w-4" />
			</Button>
		</div>
	);
}
