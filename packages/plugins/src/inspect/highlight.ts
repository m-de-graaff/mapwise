import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";

/**
 * Helper to manage feature highlighting using feature-state.
 */
export class FeatureHighlighter {
	private highlightedFeature: {
		source: string;
		sourceLayer?: string;
		id: string | number;
	} | null = null;

	constructor(private map: MapLibreMap) {}

	/**
	 * Highlight a feature.
	 *
	 * @param feature - Feature to highlight. Must have an id.
	 */
	highlight(feature: MapGeoJSONFeature): void {
		// Clear existing highlight first
		this.clear();

		if (feature.id === undefined) {
			console.warn("Cannot highlight feature without an ID");
			return;
		}

		this.highlightedFeature = {
			source: feature.source,
			...(feature.sourceLayer !== undefined && { sourceLayer: feature.sourceLayer }),
			id: feature.id,
		};

		this.map.setFeatureState(
			{
				source: feature.source,
				sourceLayer: feature.sourceLayer,
				id: feature.id,
			},
			{ highlight: true },
		);
	}

	/**
	 * Clear the current highlight.
	 */
	clear(): void {
		if (this.highlightedFeature) {
			this.map.setFeatureState(
				{
					source: this.highlightedFeature.source,
					sourceLayer: this.highlightedFeature.sourceLayer,
					id: this.highlightedFeature.id,
				},
				{ highlight: false },
			);
			this.highlightedFeature = null;
		}
	}
}
