/**
 * GeoJSON layer factory function.
 *
 * @module geojson/geojson-layer
 */

import type { MapLibreLayerDefinition } from "@mapwise/core";
import type { FeatureCollection, Geometry } from "geojson";
import type { LayerSpecification, SourceSpecification } from "maplibre-gl";
import { fetchText } from "../shared/network";
import { validateBaseLayerConfig } from "../shared/validation";
import type {
	ClusterConfig,
	GeoJsonData,
	GeoJsonLayerConfig,
	GeoJsonStyle,
	GeoJsonStyleInput,
} from "./types";

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates GeoJSON layer configuration.
 */
export function validateGeoJsonConfig(config: unknown): void {
	const baseResult = validateBaseLayerConfig(config);
	if (!baseResult.valid) {
		throw new Error(`Invalid GeoJSON layer config: ${baseResult.errors[0]?.message}`);
	}

	const cfg = config as Partial<GeoJsonLayerConfig>;

	// Validate data is provided
	if (!cfg.data) {
		throw new Error("GeoJSON layer requires 'data' property (object or URL string)");
	}

	// Validate data type
	if (typeof cfg.data !== "string" && typeof cfg.data !== "object") {
		throw new Error("GeoJSON 'data' must be a FeatureCollection object or URL string");
	}

	// Validate style if provided
	if (cfg.style !== undefined) {
		if (
			typeof cfg.style !== "object" ||
			cfg.style === null ||
			(!Array.isArray(cfg.style) && typeof (cfg.style as GeoJsonStyle).fillColor !== "undefined")
		) {
			// Simplified style - check it's a valid object
			if (Array.isArray(cfg.style)) {
				// Raw layer specs - validate array
				if (!Array.isArray(cfg.style)) {
					throw new Error(
						"GeoJSON 'style' must be a style object or array of layer specifications",
					);
				}
			}
		}
	}
}

// =============================================================================
// Style Conversion
// =============================================================================

/**
 * Converts simplified style to MapLibre layer specifications.
 */
function createLayerSpecs(
	layerId: string,
	sourceId: string,
	style: GeoJsonStyleInput,
	cluster?: ClusterConfig | boolean,
): LayerSpecification[] {
	// If raw layer specs provided, use them
	if (Array.isArray(style)) {
		return style.map((spec): LayerSpecification => {
			const baseSpec = { ...spec } as LayerSpecification & { type?: string; source?: string };
			const specType = baseSpec.type || "layer";
			// Set source if not present (most layer types require source)
			if (!("source" in baseSpec && baseSpec.source)) {
				baseSpec.source = sourceId;
			}
			baseSpec.id = baseSpec.id || `${layerId}-${specType}`;
			return baseSpec as LayerSpecification;
		});
	}

	// Use simplified style or defaults
	const simpleStyle = (style as GeoJsonStyle) || {};

	const isClustered = cluster === true || (typeof cluster === "object" && cluster.enabled);

	// Build layer specifications based on geometry types
	const layers: LayerSpecification[] = [];

	// Clustered point layers
	if (isClustered) {
		// clusterRadius and clusterMaxZoom are used in createSourceSpec

		// Clusters
		layers.push({
			id: `${layerId}-clusters`,
			type: "circle",
			source: sourceId,
			filter: ["has", "point_count"],
			paint: {
				"circle-color": simpleStyle.circleColor || "#51bbd6",
				"circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 40],
				"circle-opacity": simpleStyle.circleOpacity ?? 0.8,
				"circle-stroke-width": 2,
				"circle-stroke-color": "#fff",
			},
		});

		// Cluster count labels
		layers.push({
			id: `${layerId}-cluster-count`,
			type: "symbol",
			source: sourceId,
			filter: ["has", "point_count"],
			layout: {
				"text-field": "{point_count_abbreviated}",
				"text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
				"text-size": 12,
			},
		});

		// Unclustered points
		layers.push({
			id: `${layerId}-points`,
			type: "circle",
			source: sourceId,
			filter: ["!", ["has", "point_count"]],
			paint: {
				"circle-color": simpleStyle.circleColor || "#11b4da",
				"circle-radius": simpleStyle.circleRadius ?? 8,
				"circle-opacity": simpleStyle.circleOpacity ?? 1,
				"circle-stroke-width": simpleStyle.strokeWidth ?? 1,
				"circle-stroke-color": simpleStyle.strokeColor || "#fff",
			},
		});
	} else {
		// Point layer (non-clustered)
		layers.push({
			id: `${layerId}-points`,
			type: "circle",
			source: sourceId,
			paint: {
				"circle-color": simpleStyle.circleColor || "#11b4da",
				"circle-radius": simpleStyle.circleRadius ?? 8,
				"circle-opacity": simpleStyle.circleOpacity ?? 1,
				"circle-stroke-width": simpleStyle.strokeWidth ?? 1,
				"circle-stroke-color": simpleStyle.strokeColor || "#fff",
			},
		});
	}

	// Line layer
	layers.push({
		id: `${layerId}-lines`,
		type: "line",
		source: sourceId,
		filter: ["in", "$type", "LineString"],
		paint: {
			"line-color": simpleStyle.strokeColor || "#3887be",
			"line-width": simpleStyle.strokeWidth ?? 2,
			"line-opacity": simpleStyle.strokeOpacity ?? 1,
		},
	});

	// Polygon layer
	layers.push({
		id: `${layerId}-polygons`,
		type: "fill",
		source: sourceId,
		filter: ["in", "$type", "Polygon"],
		paint: {
			"fill-color": simpleStyle.fillColor || "#3887be",
			"fill-opacity": simpleStyle.fillOpacity ?? 0.5,
		},
	});

	// Polygon outline
	layers.push({
		id: `${layerId}-polygons-outline`,
		type: "line",
		source: sourceId,
		filter: ["in", "$type", "Polygon"],
		paint: {
			"line-color": simpleStyle.strokeColor || "#3887be",
			"line-width": simpleStyle.strokeWidth ?? 1,
			"line-opacity": simpleStyle.strokeOpacity ?? 1,
		},
	});

	return layers;
}

// =============================================================================
// Source Creation
// =============================================================================

/**
 * Creates a MapLibre source specification for GeoJSON data.
 */
async function createSourceSpec(
	data: GeoJsonData,
	generateId = false,
	cluster?: ClusterConfig | boolean,
): Promise<SourceSpecification> {
	// Fetch data if URL
	let geoJsonData: FeatureCollection | Geometry | string;
	if (typeof data === "string") {
		const response = await fetchText(data);
		try {
			geoJsonData = JSON.parse(response) as FeatureCollection | Geometry;
		} catch {
			throw new Error(`Failed to parse GeoJSON from URL: ${data}`);
		}
	} else {
		geoJsonData = data;
	}

	// Generate IDs if requested
	if (generateId && typeof geoJsonData === "object" && geoJsonData.type === "FeatureCollection") {
		geoJsonData = {
			...geoJsonData,
			features: geoJsonData.features.map((feature, index) => ({
				...feature,
				id: feature.id ?? `feature-${index}`,
			})),
		};
	}

	const isClustered = cluster === true || (typeof cluster === "object" && cluster.enabled);

	if (isClustered) {
		const clusterRadius = typeof cluster === "object" ? (cluster.radius ?? 50) : 50;
		const clusterMaxZoom = typeof cluster === "object" ? (cluster.maxZoom ?? 14) : 14;

		return {
			type: "geojson",
			data: geoJsonData,
			cluster: true,
			clusterRadius,
			clusterMaxZoom,
		};
	}

	return {
		type: "geojson",
		data: geoJsonData,
	};
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a GeoJSON layer definition.
 *
 * @param config - GeoJSON layer configuration
 * @returns LayerDefinition that can be registered with @mapwise/core
 *
 * @example
 * ```typescript
 * const layer = createGeoJsonLayer({
 *   id: 'my-features',
 *   data: {
 *     type: 'FeatureCollection',
 *     features: [...]
 *   },
 *   cluster: true,
 *   style: {
 *     circleColor: '#ff0000',
 *     circleRadius: 10
 *   }
 * });
 * ```
 */
export async function createGeoJsonLayer(
	config: GeoJsonLayerConfig,
): Promise<MapLibreLayerDefinition> {
	// Validate config
	validateGeoJsonConfig(config);

	const { id, data, generateId = false, cluster, style, category, metadata } = config;

	// Create source ID
	const sourceId = `${id}-source`;

	// Create source specification
	const sourceSpec = await createSourceSpec(data, generateId, cluster);

	// Create layer specifications
	const layerSpecs = createLayerSpecs(id, sourceId, style || {}, cluster);

	// Return MapLibre layer definition
	return {
		id,
		type: "geojson",
		category: category || "overlay",
		source: {
			id: sourceId,
			spec: sourceSpec,
		},
		layers: layerSpecs,
		metadata: {
			...(metadata || {}),
			...(config.title ? { title: config.title } : {}),
			...(config.attribution ? { attribution: config.attribution } : {}),
		},
	};
}
