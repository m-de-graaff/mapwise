import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../shadcn/sheet.js";
import { Button } from "../shadcn/button.js";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { PropertyTable } from "./PropertyTable.js";
import type { Feature } from "../hooks/useSelectedFeature.js";

interface FeatureDetailsSheetProps {
	feature: Feature | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function FeatureDetailsSheet({ feature, open, onOpenChange }: FeatureDetailsSheetProps) {
	const handleCopy = () => {
		if (!feature) {
			return;
		}
		navigator.clipboard.writeText(JSON.stringify(feature, null, 2));
		toast.success("Feature JSON copied to clipboard");
	};

	const layerName = feature?.layer?.id || "Unknown Layer";
	const featureId = feature?.id ? String(feature.id) : "No ID";

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 gap-0">
				<SheetHeader className="p-6 pb-2 border-b">
					<div className="flex items-center justify-between pr-8">
						<SheetTitle>Feature Details</SheetTitle>
						<Button variant="ghost" size="icon" onClick={handleCopy} title="Copy JSON">
							<Copy className="h-4 w-4" />
						</Button>
					</div>
					<SheetDescription>
						{layerName} &bull; {featureId}
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 min-h-0">
					<PropertyTable properties={feature?.properties} />
				</div>
			</SheetContent>
		</Sheet>
	);
}
