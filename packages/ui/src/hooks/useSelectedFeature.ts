import { useState, useCallback } from "react";

// Using a simplified Feature type for now, can be replaced with GeoJSON Feature later
export interface Feature {
	id?: string | number;
	properties?: Record<string, unknown>;
	geometry?: unknown;
	layer?: {
		id: string;
		source?: string;
	};
	[key: string]: unknown;
}

export function useSelectedFeature() {
	const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	const selectFeature = useCallback((feature: Feature | null) => {
		setSelectedFeature(feature);
		if (feature) {
			setIsOpen(true);
		} else {
			setIsOpen(false);
		}
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedFeature(null);
		setIsOpen(false);
	}, []);

	return {
		selectedFeature,
		isOpen,
		setIsOpen,
		selectFeature,
		clearSelection,
	};
}
