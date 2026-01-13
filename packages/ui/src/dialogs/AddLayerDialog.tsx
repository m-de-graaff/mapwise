import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../shadcn/dialog.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/tabs.js";
import { WmsLayerForm } from "./WmsLayerForm.js";
import { WmtsLayerForm } from "./WmtsLayerForm.js";
import { XyzLayerForm } from "./XyzLayerForm.js";
import { GeoJsonLayerForm } from "./GeoJsonLayerForm.js";
import { PmtilesLayerForm } from "./PmtilesLayerForm.js";
import { toast } from "sonner";

export interface LayerConfig {
	type: string;
	name?: string;
	source?: Record<string, unknown>;
	keepOpen?: boolean;
	[key: string]: unknown;
}

interface AddLayerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onLayerAdd: (layerConfig: LayerConfig) => void;
}

export function AddLayerDialog({ open, onOpenChange, onLayerAdd }: AddLayerDialogProps) {
	const handleAdd = (config: LayerConfig) => {
		onLayerAdd(config);
		toast.success(`Layer "${config.name}" added successfully`);
		if (!config.keepOpen) {
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col">
				<DialogHeader>
					<DialogTitle>Add Layer</DialogTitle>
					<DialogDescription>Add a new layer to your map from various sources.</DialogDescription>
				</DialogHeader>

				<Tabs defaultValue="wms" className="flex-1 flex flex-col min-h-0">
					<TabsList className="grid w-full grid-cols-5">
						<TabsTrigger value="wms">WMS</TabsTrigger>
						<TabsTrigger value="wmts">WMTS</TabsTrigger>
						<TabsTrigger value="xyz">XYZ</TabsTrigger>
						<TabsTrigger value="geojson">GeoJSON</TabsTrigger>
						<TabsTrigger value="pmtiles">PMTiles</TabsTrigger>
					</TabsList>

					<div className="flex-1 overflow-y-auto mt-2 pr-1">
						<TabsContent value="wms" className="m-0 h-full">
							<WmsLayerForm onAdd={handleAdd} />
						</TabsContent>
						<TabsContent value="wmts" className="m-0 h-full">
							<WmtsLayerForm onAdd={handleAdd} />
						</TabsContent>
						<TabsContent value="xyz" className="m-0 h-full">
							<XyzLayerForm onAdd={handleAdd} />
						</TabsContent>
						<TabsContent value="geojson" className="m-0 h-full">
							<GeoJsonLayerForm onAdd={handleAdd} />
						</TabsContent>
						<TabsContent value="pmtiles" className="m-0 h-full">
							<PmtilesLayerForm onAdd={handleAdd} />
						</TabsContent>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
