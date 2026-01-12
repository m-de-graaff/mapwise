/**
 * Heatmap layer factory function.
 *
 * @module heatmap/heatmap-layer
 */

import type { MapLibreLayerDefinition } from "@mapwise/core";
import type { FeatureCollection, Feature, Point } from "geojson";
import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import type { BaseLayerConfig } from "../shared/types";
import { validateBaseLayerConfig } from "../shared/validation";

// =============================================================================
// Types
// =============================================================================

/**
 * Data format for heatmap points: [lon, lat, intensity]
 * Intensity is optional and defaults to 1.
 */
export type HeatmapPoint = [number, number, number?];

export type HeatmapInputData = FeatureCollection<Point> | HeatmapPoint[] | string; // URL

export interface HeatmapStyle {
	/** Radius of influence of one heatmap point in pixels (default: 30) */
	radius?: number;
	/** Weight of the heatmap points (default: 1) */
	weight?: number;
	/** Intensity of the heatmap (default: 1) */
	intensity?: number;
	/** Opacity of the heatmap layer (default: 1) */
	opacity?: number;
	/** Color gradient for the heatmap */
	color?: string | [number, string][];
}

export interface HeatmapLayerConfig extends BaseLayerConfig {
	data: HeatmapInputData;
	style?: HeatmapStyle;
}

// =============================================================================
// Validation
// =============================================================================

export function validateHeatmapConfig(config: unknown): void {
	const baseResult = validateBaseLayerConfig(config);
	if (!baseResult.valid) {
		throw new Error(`Invalid Heatmap layer config: ${baseResult.errors[0]?.message}`);
	}
}

// =============================================================================
// Source Creation
// =============================================================================

async function createHeatmapSource(data: HeatmapInputData): Promise<SourceSpecification> {
	// If URL, standard geojson source
	if (typeof data === "string") {
		return {
			type: "geojson",
			data,
		};
	}

	// If FeatureCollection, standard
	if (!Array.isArray(data) && data.type === "FeatureCollection") {
		return {
			type: "geojson",
			data,
		};
	}

	// If Array of points, convert to FeatureCollection
	if (Array.isArray(data)) {
		const features: Feature<Point>[] = data.map((point, i) => ({
			type: "Feature",
			id: i,
			properties: {
				intensity: point[2] ?? 1,
			},
			geometry: {
				type: "Point",
				coordinates: [point[0], point[1]],
			},
		}));

		return {
			type: "geojson",
			data: {
				type: "FeatureCollection",
				features,
			},
		};
	}

	throw new Error("Invalid heatmap data format");
}

// =============================================================================
// Layer Creation
// =============================================================================

function createHeatmapLayerSpec(
	id: string,
	sourceId: string,
	style: HeatmapStyle = {},
): LayerSpecification {
	return {
		id,
		type: "heatmap",
		source: sourceId,
		paint: {
			// Weight: use 'intensity' property if available, otherwise 1
			"heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 10, 1],
			// Intensity: Global multiplier
			"heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
			// Color
			"heatmap-color": [
				"interpolate",
				["linear"],
				["heatmap-density"],
				0,
				"rgba(33,102,172,0)",
				0.2,
				"rgb(103,169,207)",
				0.4,
				"rgb(209,229,240)",
				0.6,
				"rgb(253,219,199)",
				0.8,
				"rgb(239,138,98)",
				1,
				"rgb(178,24,43)",
			],
			// Radius
			"heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, style.radius ?? 20],
			// Opacity
			"heatmap-opacity": style.opacity ?? 1,
		},
	};
}

// =============================================================================
// Factory
// =============================================================================

export async function createHeatmapLayer(
	config: HeatmapLayerConfig,
): Promise<MapLibreLayerDefinition> {
	validateHeatmapConfig(config);

	const { id, data, style, category, metadata } = config;
	const sourceId = `${id}-source`;

	const sourceSpec = await createHeatmapSource(data);
	const layerSpec = createHeatmapLayerSpec(id, sourceId, style);

	return {
		id,
		type: "heatmap", // Our internal type
		category: category || "overlay",
		source: {
			id: sourceId,
			spec: sourceSpec,
		},
		layers: [layerSpec], // MapLibre layers
		metadata: {
			...(metadata || {}),
			...(config.title ? { title: config.title } : {}),
			...(config.attribution ? { attribution: config.attribution } : {}),
		},
	};
}
