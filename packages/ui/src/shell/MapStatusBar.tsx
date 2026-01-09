import * as React from "react";
import { cn } from "../utils/cn";
import { useMap } from "@mapwise/core/react";

interface MapStatusBarProps {
	className?: string;
	// Optional overrides, otherwise uses map context
	zoom?: number;
	center?: { lat: number; lng: number };
	attribution?: React.ReactNode;
	message?: React.ReactNode;
}

export function MapStatusBar({
	className,
	zoom: propZoom,
	center: propCenter,
	attribution,
	message,
}: MapStatusBarProps) {
	const { controller } = useMap();
	const [viewState, setViewState] = React.useState<{
		zoom: number;
		center: { lat: number; lng: number };
	} | null>(null);

	React.useEffect(() => {
		if (!controller) {
			return;
		}

		const updateState = () => {
			const z = controller.map.getZoom();
			const c = controller.map.getCenter();
			setViewState({
				zoom: z,
				center: { lat: c.lat, lng: c.lng },
			});
		};

		// Initial
		updateState();

		// Subscribe to move events
		// Using 'move' covers both zoom and pan
		controller.map.on("move", updateState);

		return () => {
			controller.map.off("move", updateState);
		};
	}, [controller]);

	const zoom = propZoom ?? viewState?.zoom;
	const center = propCenter ?? viewState?.center;

	return (
		<div
			className={cn(
				"flex items-center justify-between h-7 px-2 text-xs text-muted-foreground bg-accent/30",
				className,
			)}
		>
			<div className="flex items-center gap-4">
				{zoom !== undefined && <span className="tabular-nums">Zoom: {zoom.toFixed(1)}</span>}
				{center && (
					<span className="tabular-nums">
						{center.lat.toFixed(4)}, {center.lng.toFixed(4)}
					</span>
				)}
				{message && (
					<span className="hidden sm:inline-block border-l border-border pl-4 ml-2">{message}</span>
				)}
			</div>

			<div className="flex items-center gap-2">{attribution}</div>
		</div>
	);
}
