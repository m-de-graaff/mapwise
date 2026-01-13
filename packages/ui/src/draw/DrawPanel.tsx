import { ScrollArea } from "../shadcn/scroll-area.js";
import { Button } from "../shadcn/button.js";
import { Upload, Download } from "lucide-react";
import { DrawModeSelector, type DrawMode } from "./DrawModeSelector.js";
import { DrawFeatureItem } from "./DrawFeatureItem.js";
import { toast } from "sonner";

interface DrawFeature {
	id: string | number;
	type: "Feature";
	geometry: { type: string; coordinates: unknown };
	properties?: { name?: string; [key: string]: unknown };
}

interface DrawPanelProps {
	features: DrawFeature[]; // GeoJSON Feature[]
	mode: DrawMode;
	onModeChange: (mode: DrawMode) => void;
	onImport: (geojson: unknown) => void;
	onExport: () => void; // Should return or trigger download
	onRename: (id: string | number, name: string) => void;
	onDelete: (id: string | number) => void;
}

export function DrawPanel({
	features,
	mode,
	onModeChange,
	onImport,
	onExport,
	onRename,
	onDelete,
}: DrawPanelProps) {
	const handleImportClick = () => {
		// Mock import
		const mock = {
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					id: Date.now(),
					geometry: { type: "Point", coordinates: [0, 0] },
					properties: { name: "Imported Point" },
				},
			],
		};
		onImport(mock);
		toast.success("Features imported");
	};

	return (
		<div className="flex flex-col h-full bg-background">
			<div className="p-4 border-b">
				<h3 className="font-semibold mb-4">Drawing Tools</h3>
				<DrawModeSelector mode={mode} onModeChange={onModeChange} />
			</div>

			<div className="flex-1 min-h-0 flex flex-col">
				<div className="px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Features ({features.length})
				</div>
				<ScrollArea className="flex-1">
					<div className="p-2 space-y-2">
						{features.length === 0 ? (
							<div className="text-center py-8 text-sm text-muted-foreground">
								No active features. Start drawing!
							</div>
						) : (
							features.map((f) => (
								<DrawFeatureItem key={f.id} feature={f} onRename={onRename} onDelete={onDelete} />
							))
						)}
					</div>
				</ScrollArea>
			</div>

			<div className="p-4 border-t bg-muted/10 grid grid-cols-2 gap-2">
				<Button variant="outline" size="sm" onClick={handleImportClick} className="w-full">
					<Upload className="h-3 w-3 mr-2" />
					Import
				</Button>
				<Button variant="outline" size="sm" onClick={onExport} className="w-full">
					<Download className="h-3 w-3 mr-2" />
					Export
				</Button>
			</div>
		</div>
	);
}
