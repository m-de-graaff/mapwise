/**
 * Vector tile layer factory function.
 *
 * @module vectortile/vector-tile-layer
 */

import type { MapLibreLayerDefinition } from "@mapwise/core";
import type {
	CircleLayerSpecification,
	FillLayerSpecification,
	LayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
	VectorSourceSpecification,
} from "maplibre-gl";
import { validateBaseLayerConfig } from "../shared/validation";
import type { VectorTileLayerConfig, VectorTileSimpleStyle, VectorTileStylePreset } from "./types";

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates vector tile layer configuration.
 */
export function validateVectorTileConfig(config: unknown): void {
	const baseResult = validateBaseLayerConfig(config);
	if (!baseResult.valid) {
		throw new Error(`Invalid vector tile layer config: ${baseResult.errors[0]?.message}`);
	}

	const cfg = config as Partial<VectorTileLayerConfig>;

	// Validate tiles
	if (!cfg.tiles) {
		throw new Error("Vector tile layer requires 'tiles' property (string or array of strings)");
	}

	if (typeof cfg.tiles !== "string" && !Array.isArray(cfg.tiles)) {
		throw new Error("Vector tile layer 'tiles' must be a string or array of strings");
	}

	if (Array.isArray(cfg.tiles) && cfg.tiles.length === 0) {
		throw new Error("Vector tile layer 'tiles' array cannot be empty");
	}

	// Validate sourceLayer (optional, but should be string if provided)
	if (cfg.sourceLayer !== undefined && typeof cfg.sourceLayer !== "string") {
		throw new Error("Vector tile layer 'sourceLayer' must be a string if provided");
	}
}

// =============================================================================
// Style Preset Creation
// =============================================================================

/**
 * Creates layer specifications from a style preset.
 */
function createPresetLayers(
	layerId: string,
	sourceId: string,
	sourceLayer: string,
	preset: VectorTileStylePreset,
	options?: VectorTileSimpleStyle,
): Array<
	| FillLayerSpecification
	| LineLayerSpecification
	| CircleLayerSpecification
	| SymbolLayerSpecification
> {
	const color = options?.color || "#3388ff";
	const opacity = options?.opacity ?? 1;

	switch (preset) {
		case "fill": {
			const layer: FillLayerSpecification = {
				id: `${layerId}-fill`,
				type: "fill",
				source: sourceId,
				"source-layer": sourceLayer,
				paint: {
					"fill-color": color,
					"fill-opacity": opacity,
				},
			};

			if (options?.strokeColor || options?.strokeWidth !== undefined) {
				layer.paint = {
					...layer.paint,
					"fill-outline-color": options.strokeColor || color,
				};
			}

			return [layer];
		}

		case "line": {
			const layer: LineLayerSpecification = {
				id: `${layerId}-line`,
				type: "line",
				source: sourceId,
				"source-layer": sourceLayer,
				paint: {
					"line-color": color,
					"line-opacity": opacity,
					"line-width": options?.width ?? 1,
				},
			};

			return [layer];
		}

		case "circle": {
			const layer: CircleLayerSpecification = {
				id: `${layerId}-circle`,
				type: "circle",
				source: sourceId,
				"source-layer": sourceLayer,
				paint: {
					"circle-color": color,
					"circle-opacity": opacity,
					"circle-radius": options?.radius ?? 5,
				},
			};

			if (options?.strokeColor || options?.strokeWidth !== undefined) {
				layer.paint = {
					...layer.paint,
					"circle-stroke-color": options.strokeColor || color,
					"circle-stroke-width": options.strokeWidth ?? 1,
				};
			}

			return [layer];
		}

		case "symbol": {
			const layer: SymbolLayerSpecification = {
				id: `${layerId}-symbol`,
				type: "symbol",
				source: sourceId,
				"source-layer": sourceLayer,
				layout: {
					"text-field": ["get", "name"], // Default to 'name' property, can be customized with advanced specs
					"text-size": options?.fontSize ?? 12,
				},
				paint: {
					"text-color": color,
					"text-opacity": opacity,
				},
			};

			return [layer];
		}

		default:
			throw new Error(`Unknown style preset: ${preset}`);
	}
}

// =============================================================================
// Source Creation
// =============================================================================

/**
 * Creates a MapLibre vector source specification.
 */
function createVectorSourceSpec(config: VectorTileLayerConfig): VectorSourceSpecification {
	const { tiles, minzoom = 0, maxzoom = 22 } = config;

	const tileUrls = Array.isArray(tiles) ? tiles : [tiles];

	return {
		type: "vector",
		tiles: tileUrls,
		minzoom,
		maxzoom,
	};
}

// =============================================================================
// Layer Specifications Creation
// =============================================================================

/**
 * Creates layer specifications from style configuration.
 */
function createLayerSpecs(
	layerId: string,
	sourceId: string,
	sourceLayer: string,
	style: VectorTileLayerConfig["style"],
): Array<
	| FillLayerSpecification
	| LineLayerSpecification
	| CircleLayerSpecification
	| SymbolLayerSpecification
> {
	if (!style) {
		// Default to fill if no style specified
		return createPresetLayers(layerId, sourceId, sourceLayer, "fill");
	}

	// If it's an array, assume it's advanced MapLibre layer specs
	if (Array.isArray(style)) {
		// Ensure each layer has source and source-layer set
		return style.map((spec) => {
			const layerSpec: LayerSpecification = { ...spec };

			// Only set source if layer supports it (not background/sky layers)
			const layerType = (layerSpec as { type?: string }).type;
			if (
				layerType &&
				layerType !== "background" &&
				layerType !== "sky" &&
				layerType !== "heatmap"
			) {
				const specWithSource = layerSpec as { source?: string; "source-layer"?: string };
				if (!specWithSource.source) {
					specWithSource.source = sourceId;
				}
				// Set source-layer if not specified
				if (!specWithSource["source-layer"]) {
					specWithSource["source-layer"] = sourceLayer;
				}
			}

			return layerSpec as
				| FillLayerSpecification
				| LineLayerSpecification
				| CircleLayerSpecification
				| SymbolLayerSpecification;
		});
	}

	// Handle preset string
	if (typeof style === "string") {
		return createPresetLayers(layerId, sourceId, sourceLayer, style);
	}

	// Handle preset object with options
	if (typeof style === "object" && "preset" in style) {
		return createPresetLayers(layerId, sourceId, sourceLayer, style.preset, style.options);
	}

	// Fallback
	return createPresetLayers(layerId, sourceId, sourceLayer, "fill");
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a vector tile layer definition.
 *
 * Vector tiles (MVT - Mapbox Vector Tiles) are an efficient format for delivering
 * map data. They are pre-rendered on the client using MapLibre GL JS.
 *
 * @param config - Vector tile layer configuration
 * @returns LayerDefinition that can be registered with @mapwise/core
 *
 * @example
 * ```typescript
 * // Basic fill layer
 * const layer = createVectorTileLayer({
 *   id: 'vector-layer',
 *   tiles: 'https://example.com/tiles/{z}/{x}/{y}.pbf',
 *   sourceLayer: 'buildings',
 *   style: 'fill',
 * });
 *
 * // With simple style options
 * const layer = createVectorTileLayer({
 *   id: 'vector-layer',
 *   tiles: ['https://tile1.example.com/{z}/{x}/{y}.pbf'],
 *   sourceLayer: 'roads',
 *   style: {
 *     preset: 'line',
 *     color: '#ff0000',
 *     width: 2,
 *   },
 * });
 *
 * // With advanced MapLibre specs
 * const layer = createVectorTileLayer({
 *   id: 'vector-layer',
 *   tiles: 'https://example.com/tiles/{z}/{x}/{y}.pbf',
 *   sourceLayer: 'buildings',
 *   style: [
 *     {
 *       id: 'building-fill',
 *       type: 'fill',
 *       paint: {
 *         'fill-color': '#888888',
 *         'fill-opacity': 0.6,
 *       },
 *     },
 *   ],
 * });
 * ```
 */
export function createVectorTileLayer(config: VectorTileLayerConfig): MapLibreLayerDefinition {
	// Validate config
	validateVectorTileConfig(config);

	const { id, category, attribution, metadata, sourceLayer, minzoom, maxzoom } = config;

	if (!(sourceLayer || (config.style && Array.isArray(config.style)))) {
		throw new Error(
			"Vector tile layer requires 'sourceLayer' property unless using advanced layer specs with 'source-layer' specified",
		);
	}

	// Create source ID
	const sourceId = `${id}-source`;

	// Create source specification
	const sourceSpec = createVectorSourceSpec(config);

	// Create layer specifications
	const defaultSourceLayer = sourceLayer || "";
	const layerSpecs = createLayerSpecs(id, sourceId, defaultSourceLayer, config.style);

	// Apply options (opacity, zoom)
	applyVectorLayerOptions(layerSpecs, config);

	// Build metadata
	const layerMetadata = buildVectorLayerMetadata(
		metadata as Record<string, unknown> | undefined,
		config,
		attribution,
		minzoom,
		maxzoom,
	);

	return {
		id,
		type: "vector-tile",
		category: category || "overlay",
		source: {
			id: sourceId,
			spec: sourceSpec,
		},
		layers: layerSpecs,
		metadata: layerMetadata,
	};
}

function applyVectorLayerOptions(
	layerSpecs: LayerSpecification[],
	config: VectorTileLayerConfig,
): void {
	const { opacity, minzoom, maxzoom } = config;

	// Apply options to all layers
	for (const layerSpec of layerSpecs) {
		applyVectorOpacity(layerSpec, opacity);

		// Apply zoom levels
		if (minzoom !== undefined) {
			layerSpec.minzoom = minzoom;
		}
		if (maxzoom !== undefined) {
			layerSpec.maxzoom = maxzoom;
		}
	}
}

function applyVectorOpacity(layerSpec: LayerSpecification, opacity: number | undefined): void {
	if (opacity === undefined) {
		return;
	}

	switch (layerSpec.type) {
		case "fill":
			if (layerSpec.paint) {
				layerSpec.paint["fill-opacity"] = opacity;
			}
			break;
		case "line":
			if (layerSpec.paint) {
				layerSpec.paint["line-opacity"] = opacity;
			}
			break;
		case "circle":
			if (layerSpec.paint) {
				layerSpec.paint["circle-opacity"] = opacity;
			}
			break;
		case "symbol":
			if (layerSpec.paint) {
				layerSpec.paint["text-opacity"] = opacity;
			}
			break;
	}
}

function buildVectorLayerMetadata(
	metadata: Record<string, unknown> | undefined,
	config: VectorTileLayerConfig,
	attribution: string | undefined,
	minzoom: number | undefined,
	maxzoom: number | undefined,
): Record<string, unknown> {
	const layerMetadata: {
		title?: string;
		attribution?: string;
		minZoom?: number;
		maxZoom?: number;
		[key: string]: unknown;
	} = {
		...(metadata || {}),
	};

	if (config.title) {
		layerMetadata.title = config.title;
	}
	if (attribution) {
		layerMetadata.attribution = attribution;
	}
	if (minzoom !== undefined) {
		layerMetadata.minZoom = minzoom;
	}
	if (maxzoom !== undefined) {
		layerMetadata.maxZoom = maxzoom;
	}

	return layerMetadata;
}
