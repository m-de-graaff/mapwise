import { Trash2, Ruler } from "lucide-react";
import { Button } from "../shadcn/button.js";
import { ToggleGroup, ToggleGroupItem } from "../shadcn/toggle-group.js";
import { MeasureResult } from "./MeasureResult.js";

interface MeasurePanelProps {
	result: number | null; // meters or sq meters
	mode: "distance" | "area"; // Assuming your measure tool supports mode switching elsewhere or infers it
	unit: "metric" | "imperial";
	onUnitChange: (unit: "metric" | "imperial") => void;
	onReset: () => void;
}

export function MeasurePanel({ result, mode, unit, onUnitChange, onReset }: MeasurePanelProps) {
	return (
		<div className="p-4 space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<Ruler className="h-4 w-4" />
					<span>Measure {mode === "distance" ? "Distance" : "Area"}</span>
				</div>

				<ToggleGroup
					type="single"
					value={unit}
					onValueChange={(val) => val && onUnitChange(val as "metric" | "imperial")}
					size="sm"
				>
					<ToggleGroupItem value="metric" aria-label="Metric System">
						M
					</ToggleGroupItem>
					<ToggleGroupItem value="imperial" aria-label="Imperial System">
						I
					</ToggleGroupItem>
				</ToggleGroup>
			</div>

			{result !== null ? (
				<MeasureResult value={result} type={mode} unit={unit} />
			) : (
				<div className="text-sm text-center py-6 text-muted-foreground bg-muted/10 rounded-md border border-dashed">
					Click on the map to start measuring
				</div>
			)}

			<Button
				variant="outline"
				size="sm"
				className="w-full text-destructive hover:text-destructive hover:bg-destructive/5"
				onClick={onReset}
				disabled={result === null}
			>
				<Trash2 className="h-3 w-3 mr-2" />
				Reset Measurement
			</Button>
		</div>
	);
}
