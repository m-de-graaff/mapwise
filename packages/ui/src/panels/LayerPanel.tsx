import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { useLayerList } from "../hooks/useLayerList";
import { useLayerActions } from "../hooks/useLayerActions";
import { LayerItem } from "./LayerItem";
import { cn } from "../utils/cn";

interface LayerPanelProps {
	className?: string;
}

export function LayerPanel({ className }: LayerPanelProps) {
	const { layers, overlayLayers, setLayers } = useLayerList();
	const { toggleVisibility, setOpacity, removeLayer, reorderLayers } = useLayerActions(setLayers);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = layers.findIndex((l) => l.id === active.id);
			const newIndex = layers.findIndex((l) => l.id === over.id);

			if (oldIndex !== -1 && newIndex !== -1) {
				const newOrder = arrayMove(layers, oldIndex, newIndex);
				reorderLayers(newOrder);
			}
		}
	}

	return (
		<div className={cn("flex flex-col gap-4 p-4", className)}>
			<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
				Layers
			</h3>

			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext
					items={overlayLayers.map((l) => l.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-1">
						{overlayLayers.length === 0 && (
							<div className="text-sm text-muted-foreground italic p-2 border border-dashed rounded text-center">
								No overlay layers
							</div>
						)}
						{overlayLayers.map((layer) => (
							<LayerItem
								key={layer.id}
								layer={layer}
								onToggle={toggleVisibility}
								onOpacityChange={setOpacity}
								onRemove={removeLayer}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	);
}
