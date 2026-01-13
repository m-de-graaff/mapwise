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

import { LayerItem } from "./LayerItem.js";
import { cn } from "../utils/cn.js";

import { useId } from "react";

export interface PanelLayer {
	id: string;
	name: string;
	type: "wms" | "geojson" | "xyz";
	visible: boolean;
	opacity: number;
	url?: string;
	// biome-ignore lint/suspicious/noExplicitAny: Style object can be complex
	style?: any;
}

interface LayerPanelProps {
	className?: string;
	layers: PanelLayer[];
	onToggle: (id: string) => void;
	onOpacityChange: (id: string, val: number) => void;
	onRemove: (id: string) => void;
	onReorder: (newOrder: PanelLayer[]) => void;
}

export function LayerPanel({
	className,
	layers,
	onToggle,
	onOpacityChange,
	onRemove,
	onReorder,
}: LayerPanelProps) {
	const dndId = useId();

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
				onReorder(newOrder);
			}
		}
	}

	return (
		<div className={cn("flex flex-col gap-4 p-4", className)}>
			<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
				Layers
			</h3>

			<DndContext
				id={dndId}
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
					<div className="flex flex-col gap-1">
						{layers.length === 0 && (
							<div className="text-sm text-muted-foreground italic p-2 border border-dashed rounded text-center">
								No overlay layers
							</div>
						)}
						{layers.map((layer) => (
							<LayerItem
								key={layer.id}
								layer={layer}
								onToggle={onToggle}
								onOpacityChange={onOpacityChange}
								onRemove={onRemove}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	);
}
