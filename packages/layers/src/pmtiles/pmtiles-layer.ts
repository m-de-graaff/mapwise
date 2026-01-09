/**
 * PMTiles layer factory function.
 *
 * @module pmtiles/pmtiles-layer
 */

import type { MapLibreLayerDefinition } from "@mapwise/core";
import type {
	LayerSpecification,
	RasterSourceSpecification,
	VectorSourceSpecification,
} from "maplibre-gl";
import { validateSafeUrl } from "../shared/url";
import { validateBaseLayerConfig } from "../shared/validation";
import { PmtilesNotInstalledError, registerPmtilesProtocol, toPmtilesUrl } from "./pmtiles-adapter";
import {
	type PmtilesLayerConfig,
	type PmtilesVectorLayerConfig,
	isPmtilesVectorConfig,
} from "./types";

// Track if protocol has been registered
// This is reset per test run to ensure protocol registration is tested
let protocolRegistered = false;

/**
 * Reset protocol registration state (useful for testing).
 * @internal
 */
export function resetProtocolRegistration(): void {
	protocolRegistered = false;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates PMTiles layer configuration.
 */
export async function validatePmtilesConfig(config: unknown): Promise<void> {
	const baseResult = validateBaseLayerConfig(config);
	if (!baseResult.valid) {
		throw new Error(`Invalid PMTiles layer config: ${baseResult.errors[0]?.message}`);
	}

	const cfg = config as Partial<PmtilesLayerConfig>;

	// Validate URL
	if (!cfg.url || typeof cfg.url !== "string") {
		throw new Error("PMTiles layer requires 'url' property (string)");
	}

	const urlError = validateSafeUrl(cfg.url);
	if (urlError) {
		throw new Error(`PMTiles layer 'url' is invalid: ${urlError.message}`);
	}

	// Ensure PMTiles protocol is registered
	try {
		if (!protocolRegistered) {
			await registerPmtilesProtocol();
			protocolRegistered = true;
		}
	} catch (error) {
		if (error instanceof PmtilesNotInstalledError) {
			throw error;
		}
		throw new Error(
			`Failed to register PMTiles protocol: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	// Validate sourceLayer for vector configs
	if (isPmtilesVectorConfig(cfg as PmtilesLayerConfig)) {
		if (!cfg.sourceLayer || typeof cfg.sourceLayer !== "string") {
			throw new Error("PMTiles vector layer requires 'sourceLayer' property (string)");
		}
	}
}

// =============================================================================
// Source Creation
// =============================================================================

/**
 * Creates a MapLibre raster source specification for PMTiles.
 */
function createPmtilesRasterSourceSpec(config: {
	url: string;
	minzoom?: number;
	maxzoom?: number;
}): RasterSourceSpecification {
	const { url, minzoom = 0, maxzoom = 22 } = config;
	const pmtilesUrl = toPmtilesUrl(url);

	return {
		type: "raster",
		url: pmtilesUrl,
		tileSize: 256,
		minzoom,
		maxzoom,
	};
}

/**
 * Creates a MapLibre vector source specification for PMTiles.
 */
function createPmtilesVectorSourceSpec(config: {
	url: string;
	minzoom?: number;
	maxzoom?: number;
}): VectorSourceSpecification {
	const { url, minzoom = 0, maxzoom = 22 } = config;
	const pmtilesUrl = toPmtilesUrl(url);

	return {
		type: "vector",
		url: pmtilesUrl,
		minzoom,
		maxzoom,
	};
}

// =============================================================================
// Layer Creation
// =============================================================================

/**
 * Creates layer specifications for PMTiles raster layer.
 */
function createRasterLayerSpec(layerId: string, sourceId: string): LayerSpecification {
	return {
		id: `${layerId}-layer`,
		type: "raster",
		source: sourceId,
		paint: {
			"raster-opacity": 1,
		},
	};
}

/**
 * Creates layer specifications for PMTiles vector layer.
 * Uses simple fill preset by default.
 */
function createVectorLayerSpecs(
	layerId: string,
	sourceId: string,
	sourceLayer: string,
	style?: PmtilesVectorLayerConfig["style"],
): LayerSpecification[] {
	// Import vector tile layer creation logic
	// For now, use simple fill layer
	if (Array.isArray(style)) {
		// Advanced specs - ensure source and source-layer are set
		return style.map((spec) => {
			const layerSpec: LayerSpecification = { ...spec };
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
				if (!specWithSource["source-layer"]) {
					specWithSource["source-layer"] = sourceLayer;
				}
			}

			return layerSpec;
		});
	}

	// Handle preset styles
	const preset = style || "fill";
	const color = "#3388ff";
	const opacity = 1;

	switch (preset) {
		case "fill":
			return [
				{
					id: `${layerId}-fill`,
					type: "fill",
					source: sourceId,
					"source-layer": sourceLayer,
					paint: {
						"fill-color": color,
						"fill-opacity": opacity,
					},
				},
			];

		case "line":
			return [
				{
					id: `${layerId}-line`,
					type: "line",
					source: sourceId,
					"source-layer": sourceLayer,
					paint: {
						"line-color": color,
						"line-opacity": opacity,
						"line-width": 1,
					},
				},
			];

		case "circle":
			return [
				{
					id: `${layerId}-circle`,
					type: "circle",
					source: sourceId,
					"source-layer": sourceLayer,
					paint: {
						"circle-color": color,
						"circle-opacity": opacity,
						"circle-radius": 5,
					},
				},
			];

		case "symbol":
			return [
				{
					id: `${layerId}-symbol`,
					type: "symbol",
					source: sourceId,
					"source-layer": sourceLayer,
					layout: {
						"text-field": ["get", "name"],
						"text-size": 12,
					},
					paint: {
						"text-color": color,
						"text-opacity": opacity,
					},
				},
			];

		default:
			throw new Error(`Unknown style preset: ${preset}`);
	}
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a PMTiles layer definition.
 *
 * PMTiles is a single-file archive format for tiles. This function supports
 * both raster and vector PMTiles files.
 *
 * **Note**: PMTiles support requires the `@protomaps/pmtiles` package to be installed.
 * Install it with: `pnpm add @protomaps/pmtiles`
 *
 * @param config - PMTiles layer configuration
 * @returns Promise resolving to LayerDefinition that can be registered with @mapwise/core
 *
 * @throws PmtilesNotInstalledError if @protomaps/pmtiles is not installed
 *
 * @example
 * ```typescript
 * // Raster PMTiles layer
 * const layer = await createPmtilesLayer({
 *   id: 'pmtiles-raster',
 *   url: 'https://example.com/tiles.pmtiles',
 * });
 *
 * // Vector PMTiles layer with fill preset
 * const layer = await createPmtilesLayer({
 *   id: 'pmtiles-vector',
 *   url: 'https://example.com/tiles.pmtiles',
 *   sourceLayer: 'buildings',
 *   style: 'fill',
 * });
 *
 * // Vector PMTiles layer with advanced styling
 * const layer = await createPmtilesLayer({
 *   id: 'pmtiles-vector',
 *   url: 'https://example.com/tiles.pmtiles',
 *   sourceLayer: 'buildings',
 *   style: [
 *     {
 *       type: 'fill',
 *       paint: {
 *         'fill-color': '#3388ff',
 *         'fill-opacity': 0.6,
 *       },
 *     },
 *   ],
 * });
 * ```
 */
export async function createPmtilesLayer(
	config: PmtilesLayerConfig,
): Promise<MapLibreLayerDefinition> {
	// Validate config (this also ensures PMTiles protocol is registered)
	await validatePmtilesConfig(config);

	const { id, category, attribution, metadata, minzoom, maxzoom } = config;

	// Create source ID
	const sourceId = `${id}-source`;

	// Create source and layer specs
	const { sourceSpec, layerSpecs } = createSourceAndLayerSpecs(config, id, sourceId);

	// Apply options (opacity, zoom)
	applyLayerOptions(layerSpecs, config);

	// Build metadata
	const layerMetadata = buildPmtilesMetadata(
		metadata as Record<string, unknown> | undefined,
		config,
		attribution,
		minzoom,
		maxzoom,
	);

	return {
		id,
		type: isPmtilesVectorConfig(config) ? "pmtiles-vector" : "pmtiles-raster",
		category: category || "overlay",
		source: {
			id: sourceId,
			spec: sourceSpec,
		},
		layers: layerSpecs,
		metadata: layerMetadata,
	};
}

function createSourceAndLayerSpecs(
	config: PmtilesLayerConfig,
	id: string,
	sourceId: string,
): {
	sourceSpec: RasterSourceSpecification | VectorSourceSpecification;
	layerSpecs: LayerSpecification[];
} {
	const { url, minzoom, maxzoom } = config;
	const isVector = isPmtilesVectorConfig(config);

	if (isVector) {
		// Vector PMTiles
		const vectorConfig = config as PmtilesVectorLayerConfig;
		const sourceConfig: { url: string; minzoom?: number; maxzoom?: number } = { url };
		if (minzoom !== undefined) {
			sourceConfig.minzoom = minzoom;
		}
		if (maxzoom !== undefined) {
			sourceConfig.maxzoom = maxzoom;
		}
		return {
			sourceSpec: createPmtilesVectorSourceSpec(sourceConfig),
			layerSpecs: createVectorLayerSpecs(
				id,
				sourceId,
				vectorConfig.sourceLayer,
				vectorConfig.style,
			),
		};
	}

	// Raster PMTiles
	const sourceConfig: { url: string; minzoom?: number; maxzoom?: number } = { url };
	if (minzoom !== undefined) {
		sourceConfig.minzoom = minzoom;
	}
	if (maxzoom !== undefined) {
		sourceConfig.maxzoom = maxzoom;
	}
	return {
		sourceSpec: createPmtilesRasterSourceSpec(sourceConfig),
		layerSpecs: [createRasterLayerSpec(id, sourceId)],
	};
}

function applyLayerOptions(layerSpecs: LayerSpecification[], config: PmtilesLayerConfig): void {
	const { opacity, minzoom, maxzoom } = config;

	// Apply options to all layers
	for (const layerSpec of layerSpecs) {
		applyOpacity(layerSpec, opacity);

		// Apply zoom levels
		if (minzoom !== undefined) {
			layerSpec.minzoom = minzoom;
		}
		if (maxzoom !== undefined) {
			layerSpec.maxzoom = maxzoom;
		}
	}
}

function applyOpacity(layerSpec: LayerSpecification, opacity: number | undefined): void {
	if (opacity === undefined) {
		return;
	}

	switch (layerSpec.type) {
		case "raster":
			if (layerSpec.paint) {
				layerSpec.paint["raster-opacity"] = opacity;
			}
			break;
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

function buildPmtilesMetadata(
	metadata: Record<string, unknown> | undefined,
	config: PmtilesLayerConfig,
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
