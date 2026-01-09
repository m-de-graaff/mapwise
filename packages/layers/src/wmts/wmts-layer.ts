/**
 * WMTS raster layer factory function.
 *
 * @module wmts/wmts-layer
 */

import type { MapLibreLayerDefinition } from "@mapwise/core";
import type { RasterSourceSpecification } from "maplibre-gl";
import { validateSafeUrl } from "../shared/url";
import { validateBaseLayerConfig } from "../shared/validation";
import { fetchWmtsCapabilities } from "./capabilities";
import { selectFormat, selectResourceUrl, selectStyle, selectTileMatrixSet } from "./selection";
import type {
	WmtsCapabilitiesConfig,
	WmtsExplicitConfig,
	WmtsRasterLayerConfig,
	WmtsTileMatrix,
	WmtsCapabilityLayer,
} from "./types";
import { isWmtsExplicitConfig } from "./types";

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates WMTS raster layer configuration.
 */
export function validateWmtsConfig(config: unknown): void {
	const baseResult = validateBaseLayerConfig(config);
	if (!baseResult.valid) {
		throw new Error(`Invalid WMTS layer config: ${baseResult.errors[0]?.message}`);
	}

	const cfg = config as Partial<WmtsRasterLayerConfig>;

	// Check if it's explicit config by looking for tileUrlTemplate
	if ("tileUrlTemplate" in cfg) {
		validateWmtsExplicitConfig(cfg as Partial<WmtsExplicitConfig>);
	} else {
		validateWmtsCapabilitiesConfig(cfg as Partial<WmtsCapabilitiesConfig>);
	}
}

function validateWmtsExplicitConfig(explicit: Partial<WmtsExplicitConfig>): void {
	if (!explicit.tileUrlTemplate || typeof explicit.tileUrlTemplate !== "string") {
		throw new Error("WMTS explicit config requires 'tileUrlTemplate' property (string)");
	}

	if (!explicit.matrixSet || typeof explicit.matrixSet !== "string") {
		throw new Error("WMTS explicit config requires 'matrixSet' property (string)");
	}

	if (!(explicit.tileMatrix && Array.isArray(explicit.tileMatrix))) {
		throw new Error("WMTS explicit config requires 'tileMatrix' property (array)");
	}

	if (explicit.tileMatrix.length === 0) {
		throw new Error("WMTS explicit config 'tileMatrix' array cannot be empty");
	}

	// Validate tile matrix entries
	for (const matrix of explicit.tileMatrix) {
		validateTileMatrix(matrix);
	}
}

function validateTileMatrix(matrix: WmtsTileMatrix): void {
	if (typeof matrix.zoom !== "number" || matrix.zoom < 0) {
		throw new Error("WMTS tile matrix 'zoom' must be a non-negative number");
	}
	if (typeof matrix.matrixWidth !== "number" || matrix.matrixWidth <= 0) {
		throw new Error("WMTS tile matrix 'matrixWidth' must be a positive number");
	}
	if (typeof matrix.matrixHeight !== "number" || matrix.matrixHeight <= 0) {
		throw new Error("WMTS tile matrix 'matrixHeight' must be a positive number");
	}
}

function validateWmtsCapabilitiesConfig(caps: Partial<WmtsCapabilitiesConfig>): void {
	if (!caps.capabilitiesUrl || typeof caps.capabilitiesUrl !== "string") {
		throw new Error("WMTS capabilities config requires 'capabilitiesUrl' property (string)");
	}

	const urlError = validateSafeUrl(caps.capabilitiesUrl);
	if (urlError) {
		throw new Error(`WMTS capabilities config 'capabilitiesUrl' is invalid: ${urlError.message}`);
	}

	if (!caps.layerId || typeof caps.layerId !== "string") {
		throw new Error("WMTS capabilities config requires 'layerId' property (string)");
	}
}

// =============================================================================
// Source Creation
// =============================================================================

/**
 * Creates a MapLibre raster source specification for WMTS tiles (explicit config).
 */
function createWmtsSourceSpecExplicit(config: WmtsExplicitConfig): RasterSourceSpecification {
	const {
		tileUrlTemplate,
		tileMatrix,
		format = "image/png",
		style,
		dimensions = {},
		minzoom = 0,
		maxzoom = tileMatrix.length > 0 ? tileMatrix.length - 1 : 22,
	} = config;

	// Build tile URL function
	// MapLibre calls this with { x, y, z } for each tile
	const tiles = (tileCoord: { x: number; y: number; z: number }): string => {
		const { x, y, z } = tileCoord;

		// Find tile matrix for this zoom level
		const matrix = tileMatrix[z];
		if (!matrix) {
			// Fallback to last matrix if zoom is out of range
			const fallbackMatrix = tileMatrix[tileMatrix.length - 1];
			if (!fallbackMatrix) {
				throw new Error(`No tile matrix found for zoom level ${z}`);
			}
			return buildTileUrl(tileUrlTemplate, fallbackMatrix, x, y, format, style, dimensions);
		}

		return buildTileUrl(tileUrlTemplate, matrix, x, y, format, style, dimensions);
	};

	return {
		type: "raster",
		tiles: tiles as unknown as string[],
		tileSize: tileMatrix[0]?.tileWidth || 256,
		minzoom,
		maxzoom,
	};
}

/**
 * Builds a WMTS tile URL from template and parameters.
 */
function buildTileUrl(
	template: string,
	matrix: WmtsTileMatrix,
	x: number,
	y: number,
	format: string,
	style?: string,
	dimensions: Record<string, string> = {},
): string {
	let url = template;

	// Replace placeholders
	url = url.replace(/{TileMatrix}/g, matrix.zoom.toString());
	url = url.replace(/{TileCol}/g, x.toString());
	url = url.replace(/{TileRow}/g, y.toString());
	url = url.replace(/{TileMatrixSet}/g, matrix.zoom.toString()); // Fallback if used
	url = url.replace(/{Format}/g, format);

	if (style) {
		url = url.replace(/{Style}/g, style);
	}

	// Replace dimension placeholders
	for (const [key, value] of Object.entries(dimensions)) {
		url = url.replace(new RegExp(`{${key}}`, "g"), value);
	}

	return url;
}

/**
 * Creates a MapLibre raster source specification for WMTS tiles (capabilities config).
 */
async function createWmtsSourceSpecCapabilities(
	config: WmtsCapabilitiesConfig,
): Promise<RasterSourceSpecification> {
	const {
		capabilitiesUrl,
		layerId,
		matrixSet: preferredMatrixSet,
		style: preferredStyle,
		format: preferredFormat,
		dimensions = {},
		minzoom,
		maxzoom,
	} = config;

	// Fetch capabilities
	const capabilities = await fetchWmtsCapabilities(capabilitiesUrl);

	// Find layer
	const layer = capabilities.layers.find((l) => l.identifier === layerId);
	if (!layer) {
		throw new Error(
			`WMTS layer "${layerId}" not found in capabilities. Available layers: ${capabilities.layers.map((l) => l.identifier).join(", ")}`,
		);
	}

	// Select tile matrix set
	const selectedMatrixSetId = preferredMatrixSet || selectTileMatrixSet(layer, capabilities);
	if (!selectedMatrixSetId) {
		throw new Error(
			`No suitable tile matrix set found for layer "${layerId}". Available matrix sets: ${layer.tileMatrixSetLinks.join(", ")}`,
		);
	}

	const matrixSet = capabilities.tileMatrixSets.find(
		(set) => set.identifier === selectedMatrixSetId,
	);
	if (!matrixSet) {
		throw new Error(`Tile matrix set "${selectedMatrixSetId}" not found in capabilities`);
	}

	// Select format
	const selectedFormat = preferredFormat || selectFormat(layer);
	if (!selectedFormat) {
		throw new Error(`No format available for layer "${layerId}"`);
	}

	// Select style
	const selectedStyle = selectStyle(layer, preferredStyle);
	if (!selectedStyle) {
		throw new Error(`No style available for layer "${layerId}"`);
	}

	// Get resource URL template
	const tileUrlTemplate = resolveTileUrlTemplate(
		layer,
		capabilitiesUrl,
		layerId,
		selectedStyle,
		selectedMatrixSetId,
	);

	// Convert tile matrix definitions to our format
	const tileMatrices: WmtsTileMatrix[] = matrixSet.tileMatrix.map((matrix, index) => ({
		zoom: index,
		matrixWidth: matrix.matrixWidth,
		matrixHeight: matrix.matrixHeight,
		tileWidth: matrix.tileWidth,
		tileHeight: matrix.tileHeight,
		topLeftCorner: matrix.topLeftCorner,
		scaleDenominator: matrix.scaleDenominator,
	}));

	// Build dimensions object (merge with defaults from capabilities)
	const allDimensions: Record<string, string> = mergeDimensions(dimensions, layer.dimensions);

	// Create source spec using explicit config path
	const explicitConfig: WmtsExplicitConfig = {
		id: config.id,
		tileUrlTemplate,
		matrixSet: selectedMatrixSetId,
		tileMatrix: tileMatrices,
		format: selectedFormat,
		style: selectedStyle,
		dimensions: allDimensions,
		minzoom: minzoom ?? 0,
		maxzoom: maxzoom ?? (tileMatrices.length > 0 ? tileMatrices.length - 1 : 22),
	};

	return createWmtsSourceSpecExplicit(explicitConfig);
}

function mergeDimensions(
	userDimensions: Record<string, string>,
	layerDimensions?: { identifier: string; default?: string }[],
): Record<string, string> {
	const allDimensions: Record<string, string> = { ...userDimensions };
	if (layerDimensions) {
		for (const dim of layerDimensions) {
			if (dim.default && !(dim.identifier in allDimensions)) {
				allDimensions[dim.identifier] = dim.default;
			}
		}
	}
	return allDimensions;
}

function resolveTileUrlTemplate(
	layer: WmtsCapabilityLayer,
	capabilitiesUrl: string,
	layerId: string,
	selectedStyle: string,
	selectedMatrixSetId: string,
): string {
	let tileUrlTemplate = selectResourceUrl(layer, "tile");
	if (!tileUrlTemplate) {
		// If no resource URL, construct from capabilities URL
		// This is a fallback - most WMTS services provide ResourceURL
		const baseUrl = capabilitiesUrl.split("?")[0];
		tileUrlTemplate = `${baseUrl}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER={Layer}&STYLE={Style}&TILEMATRIXSET={TileMatrixSet}&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&FORMAT={Format}`;
	}

	// Replace layer and style placeholders in template
	tileUrlTemplate = tileUrlTemplate.replace(/{Layer}/g, layerId);
	tileUrlTemplate = tileUrlTemplate.replace(/{Style}/g, selectedStyle);
	tileUrlTemplate = tileUrlTemplate.replace(/{TileMatrixSet}/g, selectedMatrixSetId);

	return tileUrlTemplate;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a WMTS raster layer definition.
 *
 * WMTS (Web Map Tile Service) is an OGC standard for serving pre-rendered map tiles.
 * This implementation supports both explicit configuration and capabilities-based discovery.
 *
 * @param config - WMTS raster layer configuration
 * @returns Promise resolving to LayerDefinition that can be registered with @mapwise/core
 *
 * @example
 * ```typescript
 * // Explicit configuration
 * const layer = await createWmtsRasterLayer({
 *   id: 'wmts-layer',
 *   tileUrlTemplate: 'https://example.com/wmts/{TileMatrix}/{TileCol}/{TileRow}.png',
 *   matrixSet: 'EPSG:3857',
 *   tileMatrix: [
 *     { zoom: 0, matrixWidth: 1, matrixHeight: 1, tileWidth: 256, tileHeight: 256, topLeftCorner: [-20037508.34, 20037508.34], scaleDenominator: 559082264.029 },
 *     // ... more matrices
 *   ],
 * });
 *
 * // Capabilities-based configuration
 * const layer = await createWmtsRasterLayer({
 *   id: 'wmts-layer',
 *   capabilitiesUrl: 'https://example.com/wmts',
 *   layerId: 'myLayer',
 *   // matrixSet, style, format will be auto-selected
 * });
 * ```
 */
export async function createWmtsRasterLayer(
	config: WmtsRasterLayerConfig,
): Promise<MapLibreLayerDefinition> {
	// Validate config
	validateWmtsConfig(config);

	const { id, category, attribution, metadata } = config;

	// Create source ID
	const sourceId = `${id}-source`;

	// Create source specification
	let sourceSpec: RasterSourceSpecification;
	if (isWmtsExplicitConfig(config)) {
		sourceSpec = createWmtsSourceSpecExplicit(config);
	} else {
		sourceSpec = await createWmtsSourceSpecCapabilities(config);
	}

	// Create layer specification (raster layer)
	const layerSpec: {
		id: string;
		type: "raster";
		source: string;
		paint: { "raster-opacity": number };
		minzoom?: number;
		maxzoom?: number;
	} = {
		id: `${id}-layer`,
		type: "raster",
		source: sourceId,
		paint: {
			"raster-opacity": config.opacity ?? 1,
		},
	};

	// Add zoom levels only if provided
	if (config.minzoom !== undefined) {
		layerSpec.minzoom = config.minzoom;
	}
	if (config.maxzoom !== undefined) {
		layerSpec.maxzoom = config.maxzoom;
	}

	// Build metadata
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
	if (config.minzoom !== undefined) {
		layerMetadata.minZoom = config.minzoom;
	}
	if (config.maxzoom !== undefined) {
		layerMetadata.maxZoom = config.maxzoom;
	}

	return {
		id,
		type: "wmts-raster",
		category: category || "overlay",
		source: {
			id: sourceId,
			spec: sourceSpec,
		},
		layers: [layerSpec],
		metadata: layerMetadata,
	};
}
