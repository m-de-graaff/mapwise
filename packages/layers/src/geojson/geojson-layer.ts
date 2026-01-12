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
	validateData(cfg);
	validateStyle(cfg);
}

function validateData(cfg: Partial<GeoJsonLayerConfig>): void {
	if (!cfg.data) {
		throw new Error("GeoJSON layer requires 'data' property (object or URL string)");
	}

	if (typeof cfg.data !== "string" && typeof cfg.data !== "object") {
		throw new Error("GeoJSON 'data' must be a FeatureCollection object or URL string");
	}
}

function validateStyle(cfg: Partial<GeoJsonLayerConfig>): void {
	if (cfg.style === undefined) {
		return;
	}

	// Style must be an object (either simplified style or array of layer specs)
	if (typeof cfg.style !== "object" || cfg.style === null) {
		throw new Error("GeoJSON 'style' must be a style object or array of layer specifications");
	}

	// If it's an array, it's valid (raw layer specs)
	// If it's an object, it's a simplified style (no further validation needed)
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
		return normalizeRawLayerSpecs(style, layerId, sourceId);
	}

	// Use simplified style or defaults
	const simpleStyle = (style as GeoJsonStyle) || {};
	const isClustered = cluster === true || (typeof cluster === "object" && cluster.enabled);

	// Build layer specifications based on geometry types
	const layers: LayerSpecification[] = [];

	// Point layers (clustered or not)
	layers.push(...createPointLayers(layerId, sourceId, simpleStyle, isClustered));

	// Line and polygon layers
	layers.push(...createLineAndPolygonLayers(layerId, sourceId, simpleStyle));

	return layers;
}

function normalizeRawLayerSpecs(
	specs: LayerSpecification[],
	layerId: string,
	sourceId: string,
): LayerSpecification[] {
	return specs.map((spec): LayerSpecification => {
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

function createPointLayers(
	layerId: string,
	sourceId: string,
	simpleStyle: GeoJsonStyle,
	isClustered: boolean,
): LayerSpecification[] {
	if (isClustered) {
		return [
			createClusterLayer(layerId, sourceId, simpleStyle),
			createClusterCountLayer(layerId, sourceId),
			createUnclusteredPointLayer(layerId, sourceId, simpleStyle),
		];
	}

	// If iconImage or textField is present, create a symbol layer
	if (simpleStyle.iconImage || simpleStyle.textField) {
		return [createSymbolLayer(layerId, sourceId, simpleStyle)];
	}

	return [createPointLayer(layerId, sourceId, simpleStyle)];
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Factory complexity is inherent
function createSymbolLayer(
	layerId: string,
	sourceId: string,
	simpleStyle: GeoJsonStyle,
): LayerSpecification {
	// biome-ignore lint/suspicious/noExplicitAny: MapLibre layout is loose
	const layout: any = {};
	// biome-ignore lint/suspicious/noExplicitAny: MapLibre paint is loose
	const paint: any = {};

	if (simpleStyle.iconImage) {
		layout["icon-image"] = simpleStyle.iconImage;
		if (simpleStyle.iconSize !== undefined) {
			layout["icon-size"] = simpleStyle.iconSize;
		}
		if (simpleStyle.iconRotate !== undefined) {
			layout["icon-rotate"] = simpleStyle.iconRotate;
		}
		if (simpleStyle.iconAllowOverlap !== undefined) {
			layout["icon-allow-overlap"] = simpleStyle.iconAllowOverlap;
		}
		if (simpleStyle.iconIgnorePlacement !== undefined) {
			layout["icon-ignore-placement"] = simpleStyle.iconIgnorePlacement;
		}
	}

	if (simpleStyle.textField) {
		layout["text-field"] = simpleStyle.textField;
		layout["text-font"] = ["DIN Offc Pro Medium", "Arial Unicode MS Bold"];
		if (simpleStyle.textSize !== undefined) {
			layout["text-size"] = simpleStyle.textSize;
		}
		if (simpleStyle.textAnchor !== undefined) {
			layout["text-anchor"] = simpleStyle.textAnchor;
		}
		if (simpleStyle.textOffset !== undefined) {
			layout["text-offset"] = simpleStyle.textOffset;
		}

		paint["text-color"] = simpleStyle.textColor || "#000000";
		paint["text-halo-color"] = simpleStyle.textHaloColor || "#ffffff";
		paint["text-halo-width"] = simpleStyle.textHaloWidth || 0;
	}

	return {
		id: `${layerId}-symbols`,
		type: "symbol",
		source: sourceId,
		layout,
		paint,
	};
}

function createClusterLayer(
	layerId: string,
	sourceId: string,
	simpleStyle: GeoJsonStyle,
): LayerSpecification {
	return {
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
	};
}

function createClusterCountLayer(layerId: string, sourceId: string): LayerSpecification {
	return {
		id: `${layerId}-cluster-count`,
		type: "symbol",
		source: sourceId,
		filter: ["has", "point_count"],
		layout: {
			"text-field": "{point_count_abbreviated}",
			"text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
			"text-size": 12,
		},
	};
}

function createUnclusteredPointLayer(
	layerId: string,
	sourceId: string,
	simpleStyle: GeoJsonStyle,
): LayerSpecification {
	return {
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
	};
}

function createPointLayer(
	layerId: string,
	sourceId: string,
	simpleStyle: GeoJsonStyle,
): LayerSpecification {
	return {
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
	};
}

function createLineAndPolygonLayers(
	layerId: string,
	sourceId: string,
	simpleStyle: GeoJsonStyle,
): LayerSpecification[] {
	return [
		createLineLayer(layerId, sourceId, simpleStyle),
		createPolygonLayer(layerId, sourceId, simpleStyle),
		createPolygonOutlineLayer(layerId, sourceId, simpleStyle),
	];
}

function createLineLayer(
	layerId: string,
	sourceId: string,
	simpleStyle: GeoJsonStyle,
): LayerSpecification {
	return {
		id: `${layerId}-lines`,
		type: "line",
		source: sourceId,
		filter: ["in", "$type", "LineString"],
		paint: {
			"line-color": simpleStyle.strokeColor || "#3887be",
			"line-width": simpleStyle.strokeWidth ?? 2,
			"line-opacity": simpleStyle.strokeOpacity ?? 1,
		},
	};
}

function createPolygonLayer(
	layerId: string,
	sourceId: string,
	simpleStyle: GeoJsonStyle,
): LayerSpecification {
	return {
		id: `${layerId}-polygons`,
		type: "fill",
		source: sourceId,
		filter: ["in", "$type", "Polygon"],
		paint: {
			"fill-color": simpleStyle.fillColor || "#3887be",
			"fill-opacity": simpleStyle.fillOpacity ?? 0.5,
		},
	};
}

function createPolygonOutlineLayer(
	layerId: string,
	sourceId: string,
	simpleStyle: GeoJsonStyle,
): LayerSpecification {
	return {
		id: `${layerId}-polygons-outline`,
		type: "line",
		source: sourceId,
		filter: ["in", "$type", "Polygon"],
		paint: {
			"line-color": simpleStyle.strokeColor || "#3887be",
			"line-width": simpleStyle.strokeWidth ?? 1,
			"line-opacity": simpleStyle.strokeOpacity ?? 1,
		},
	};
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
