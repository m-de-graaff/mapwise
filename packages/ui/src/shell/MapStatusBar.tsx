import * as React from "react";
import { cn } from "../utils/cn";
import { useMap } from "../map/Map";

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
	const { map, isLoaded } = useMap();
	const [viewState, setViewState] = React.useState<{
		zoom: number;
		center: { lat: number; lng: number };
	} | null>(null);

	React.useEffect(() => {
		if (!(map && isLoaded)) {
			return;
		}

		const updateState = () => {
			const z = map.getZoom();
			const c = map.getCenter();
			setViewState({
				zoom: z,
				center: { lat: c.lat, lng: c.lng },
			});
		};

		// Initial
		updateState();

		// Subscribe to move events
		map.on("move", updateState);

		return () => {
			map.off("move", updateState);
		};
	}, [map, isLoaded]);

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
