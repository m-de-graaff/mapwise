import { useState } from "react";
import { Button } from "../shadcn/button";
import { Input } from "../shadcn/input";
import { Pencil, Trash2, Check, X, MapPin, Hexagon, Component } from "lucide-react";
import { cn } from "../utils/cn";

interface DrawFeatureItemProps {
	feature: {
		id: string | number;
		type: string;
		geometry: { type: string };
		properties?: { name?: string };
	};
	onRename: (id: string | number, newName: string) => void;
	onDelete: (id: string | number) => void;
	isSelected?: boolean;
	onSelect?: () => void;
}

export function DrawFeatureItem({
	feature,
	onRename,
	onDelete,
	isSelected,
	onSelect,
}: DrawFeatureItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [name, setName] = useState(feature.properties?.name || `Feature ${feature.id}`);

	const handleRename = () => {
		onRename(feature.id, name);
		setIsEditing(false);
	};

	const getIcon = () => {
		switch (feature.geometry.type) {
			case "Point":
				return MapPin;
			case "LineString":
				return Component;
			case "Polygon":
				return Hexagon;
			default:
				return MapPin;
		}
	};

	const Icon = getIcon();

	return (
		<div
			className={cn(
				"flex items-center justify-between rounded-md border border-transparent hover:bg-accent group transition-colors",
				isSelected ? "bg-accent border-primary/20" : "bg-card border-border",
			)}
		>
			{isEditing ? (
				<div className="flex items-center gap-1 flex-1 p-2">
					<Icon className="h-4 w-4 text-muted-foreground shrink-0 mr-2" />
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="h-7 text-xs"
						autoFocus
						onKeyDown={(e) => e.key === "Enter" && handleRename()}
					/>
					<Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRename}>
						<Check className="h-3 w-3 text-green-500" />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className="h-7 w-7"
						onClick={() => setIsEditing(false)}
					>
						<X className="h-3 w-3" />
					</Button>
				</div>
			) : (
				<>
					<button
						type="button"
						className="flex items-center gap-3 flex-1 min-w-0 p-2 text-left"
						onClick={onSelect}
					>
						<Icon className="h-4 w-4 text-muted-foreground shrink-0" />
						<span className="text-sm font-medium truncate flex-1 cursor-pointer">
							{feature.properties?.name || `Feature ${feature.id}`}
						</span>
					</button>

					<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7"
							onClick={(e) => {
								e.stopPropagation();
								setIsEditing(true);
							}}
						>
							<Pencil className="h-3 w-3" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							className="h-7 w-7 hover:text-destructive"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(feature.id);
							}}
						>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
