import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface BasemapDef {
	id: string;
	name: string;
	type: "style" | "image";
	thumbnail?: string;
	styleUrl?: string; // For style-based
	url?: string; // For raster/tile-based
}

const STORAGE_KEY = "mapwise.basemap";

export function useBasemap(availableBasemaps: BasemapDef[], defaultId: string) {
	const [activeBasemapId, setActiveBasemapId] = useState<string>(() => {
		// Init from storage if available (client-side only check ideally,
		// but for a hook we can try window check or rely on useEffect to sync)
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored && availableBasemaps.find((b) => b.id === stored)) {
				return stored;
			}
		}
		return defaultId;
	});

	const [isLoading, setIsLoading] = useState(false);

	// Sync to storage
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY, activeBasemapId);
		}
	}, [activeBasemapId]);

	const setBasemap = useCallback(
		async (id: string) => {
			if (id === activeBasemapId) {
				return;
			}

			const target = availableBasemaps.find((b) => b.id === id);
			if (!target) {
				toast.error(`Basemap definition not found for id: ${id}`);
				return;
			}

			setIsLoading(true);

			try {
				// Mock loading delay to simulate style fetch/switch
				await new Promise((resolve) => setTimeout(resolve, 300));

				setActiveBasemapId(id);
				toast.success(`Switched basemap to ${target.name}`);
			} catch (err) {
				toast.error("Failed to switch basemap");
				console.error(err);
			} finally {
				setIsLoading(false);
			}
		},
		[activeBasemapId, availableBasemaps],
	);

	return {
		activeBasemapId,
		setBasemap,
		isLoading,
		activeBasemap: availableBasemaps.find((b) => b.id === activeBasemapId),
	};
}
