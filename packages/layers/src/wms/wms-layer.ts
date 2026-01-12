/**
 * WMS raster layer factory function.
 *
 * @module wms/wms-layer
 */

import type { MapLibreLayerDefinition } from "@mapwise/core";
import type { RasterSourceSpecification } from "maplibre-gl";
import { validateSafeUrl } from "../shared/url";
import { validateBaseLayerConfig } from "../shared/validation";
import { toPersistedConfig } from "./persistence";
import type { WmsGetMapParams, WmsRasterLayerConfig } from "./types";
import { buildWmsTileUrl } from "./url-builder";

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates WMS raster layer configuration.
 */
export function validateWmsConfig(config: unknown): void {
	const baseResult = validateBaseLayerConfig(config);
	if (!baseResult.valid) {
		throw new Error(`Invalid WMS layer config: ${baseResult.errors[0]?.message}`);
	}

	const cfg = config as Partial<WmsRasterLayerConfig>;
	validateBaseUrl(cfg);
	validateLayers(cfg);
	validateStyles(cfg);
	validateVersion(cfg);
	validateTileDimensions(cfg);
}

function validateBaseUrl(cfg: Partial<WmsRasterLayerConfig>): void {
	if (!cfg.baseUrl || typeof cfg.baseUrl !== "string") {
		throw new Error("WMS layer requires 'baseUrl' property (string)");
	}

	const urlError = validateSafeUrl(cfg.baseUrl);
	if (urlError) {
		throw new Error(`WMS layer 'baseUrl' is invalid: ${urlError.message}`);
	}
}

function validateLayers(cfg: Partial<WmsRasterLayerConfig>): void {
	if (!cfg.layers) {
		throw new Error("WMS layer requires 'layers' property (string or array of strings)");
	}

	if (typeof cfg.layers !== "string" && !Array.isArray(cfg.layers)) {
		throw new Error("WMS layer 'layers' must be a string or array of strings");
	}

	if (Array.isArray(cfg.layers) && cfg.layers.length === 0) {
		throw new Error("WMS layer 'layers' array cannot be empty");
	}
}

function validateStyles(cfg: Partial<WmsRasterLayerConfig>): void {
	if (cfg.styles !== undefined && Array.isArray(cfg.styles) && Array.isArray(cfg.layers)) {
		if (cfg.styles.length !== cfg.layers.length && cfg.styles.length > 0) {
			throw new Error("WMS layer 'styles' array length must match 'layers' array length");
		}
	}
}

function validateVersion(cfg: Partial<WmsRasterLayerConfig>): void {
	if (cfg.version !== undefined && cfg.version !== "1.1.1" && cfg.version !== "1.3.0") {
		throw new Error("WMS layer 'version' must be '1.1.1' or '1.3.0'");
	}
}

function validateTileDimensions(cfg: Partial<WmsRasterLayerConfig>): void {
	if (cfg.tileWidth !== undefined && (typeof cfg.tileWidth !== "number" || cfg.tileWidth <= 0)) {
		throw new Error("WMS layer 'tileWidth' must be a positive number");
	}

	if (cfg.tileHeight !== undefined && (typeof cfg.tileHeight !== "number" || cfg.tileHeight <= 0)) {
		throw new Error("WMS layer 'tileHeight' must be a positive number");
	}
}

// =============================================================================
// Source Creation
// =============================================================================

/**
 * Creates a MapLibre raster source specification for WMS tiles.
 *
 * WMS doesn't use standard tile coordinates - it uses bounding boxes.
 * MapLibre's raster source supports a `tiles` function that receives
 * tile coordinates and returns the URL for that tile.
 *
 * Note: MapLibre's TypeScript types don't fully reflect that `tiles` can be
 * a function, but it is supported at runtime.
 */
function createWmsSourceSpec(config: WmsRasterLayerConfig): RasterSourceSpecification {
	const {
		baseUrl,
		layers,
		styles,
		format = "image/png",
		transparent = true,
		version = "1.3.0",
		crs = "EPSG:3857",
		extraParams = {},
		tileWidth = 512,
		tileHeight = 512,
		minzoom = 0,
		maxzoom = 22,
		tileUrlTransform,
	} = config;

	// Normalize layers and styles
	const layersArray = Array.isArray(layers) ? layers : [layers];
	const layersParam = layersArray.join(",");

	const stylesArray = Array.isArray(styles)
		? styles
		: styles
			? [styles]
			: layersArray.map(() => "");
	const stylesParam = stylesArray.join(",");

	// Build base parameters for URL template
	const baseParams: Record<string, string> = {
		SERVICE: "WMS",
		VERSION: version,
		REQUEST: "GetMap",
		LAYERS: layersParam,
		STYLES: stylesParam,
		FORMAT: format,
		WIDTH: String(tileWidth),
		HEIGHT: String(tileHeight),
		...extraParams,
	};

	// Add CRS/SRS based on version
	if (version === "1.3.0") {
		baseParams["CRS"] = crs;
	} else {
		baseParams["SRS"] = crs;
	}

	if (transparent && (format.includes("png") || format.includes("gif"))) {
		baseParams["TRANSPARENT"] = "TRUE";
	}

	// MapLibre supports {bbox-epsg-3857} template for raster sources
	// This is more robust than a custom tile function if we are in 3857
	const isWebMercator = crs === "EPSG:3857" || crs === "EPSG:900913";

	if (isWebMercator && !tileUrlTransform) {
		const dummyBbox: [number, number, number, number] = [0, 0, 0, 0];
		const baseUrlWithParams = buildTileUrl(
			baseUrl,
			layers,
			dummyBbox,
			tileWidth,
			tileHeight,
			version,
			format,
			transparent,
			extraParams,
			styles,
			crs,
		);

		// Replace the dummy bbox with the template
		// Note: The buildTileUrl puts BBOX=0,0,0,0 in the string
		// We replace it with BBOX={bbox-epsg-3857}
		const templateUrl = baseUrlWithParams.replace(/BBOX=[^&]*/, "BBOX={bbox-epsg-3857}");

		return {
			type: "raster",
			tiles: [templateUrl],
			tileSize: Math.max(tileWidth, tileHeight),
			minzoom,
			maxzoom,
		};
	}

	// Legacy/Custom projection fallback (Relies on internal MapLibre behavior or custom protocol)
	// Create tiles function that MapLibre will call with tile coordinates
	// This function converts tile coordinates to WMS GetMap bbox requests
	// MapLibre calls this with an object like { x: 0, y: 0, z: 0 }
	const tilesFunction = (tileCoord: { x: number; y: number; z: number }): string => {
		const { x, y, z } = tileCoord;
		const bbox = calculateTileBbox(x, y, z, crs, version);
		return buildTileUrl(
			baseUrl,
			layers,
			bbox,
			tileWidth,
			tileHeight,
			version,
			format,
			transparent,
			extraParams,
			styles,
			crs,
			tileUrlTransform,
		);
	};

	// MapLibre's TypeScript types say tiles is string[], but it actually supports
	// a function at runtime in some contexts. We use a type assertion here.
	return {
		type: "raster",
		tiles: tilesFunction as unknown as string[],
		tileSize: Math.max(tileWidth, tileHeight),
		minzoom,
		maxzoom,
	} as RasterSourceSpecification;
}

function calculateTileBbox(
	x: number,
	y: number,
	z: number,
	crs?: string,
	version?: string,
): [number, number, number, number] {
	const n = 2 ** z;
	let minX: number;
	let maxX: number;
	let minY: number;
	let maxY: number;

	if (crs === "EPSG:3857" || crs === "EPSG:900913") {
		({ minX, maxX, minY, maxY } = calculateWebMercatorBbox(x, y, n));
	} else if (crs === "EPSG:4326" || crs === "CRS:84") {
		({ minX, maxX, minY, maxY } = calculateGeographicBbox(x, y, n));
	} else {
		({ minX, maxX, minY, maxY } = calculateWebMercatorBbox(x, y, n));
	}

	return adjustBboxForWmsVersion(minX, maxX, minY, maxY, crs, version);
}

function calculateWebMercatorBbox(
	x: number,
	y: number,
	n: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
	const tileSize = 40075016.686; // Earth circumference in meters
	const res = tileSize / n;
	let minX = x * res - tileSize / 2;
	let maxX = (x + 1) * res - tileSize / 2;
	let minY = tileSize / 2 - (y + 1) * res;
	let maxY = tileSize / 2 - y * res;

	// Convert to lat/lon for bbox (WMS expects geographic coordinates)
	minX = (minX * 180) / 20037508.34;
	maxX = (maxX * 180) / 20037508.34;
	minY = (Math.PI / 2 - 2 * Math.atan(Math.exp((-minY * Math.PI) / 20037508.34))) * (180 / Math.PI);
	maxY = (Math.PI / 2 - 2 * Math.atan(Math.exp((-maxY * Math.PI) / 20037508.34))) * (180 / Math.PI);

	return { minX, maxX, minY, maxY };
}

function calculateGeographicBbox(
	x: number,
	y: number,
	n: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
	const minX = (x / n) * 360 - 180;
	const maxX = ((x + 1) / n) * 360 - 180;
	const latRad1 = Math.PI * (1 - (2 * y) / n);
	const minY = Math.atan(Math.sinh(latRad1)) * (180 / Math.PI);
	const latRad2 = Math.PI * (1 - (2 * (y + 1)) / n);
	const maxY = Math.atan(Math.sinh(latRad2)) * (180 / Math.PI);

	return { minX, maxX, minY, maxY };
}

function adjustBboxForWmsVersion(
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
	crs?: string,
	version?: string,
): [number, number, number, number] {
	// Handle axis order for EPSG:4326 in WMS 1.3.0
	// WMS 1.3.0 specifies EPSG:4326 should use lon,lat order (x,y)
	// WMS 1.1.1 uses lat,lon order
	if (version === "1.3.0" && (crs === "EPSG:4326" || crs === "CRS:84")) {
		// WMS 1.3.0 EPSG:4326: BBOX format is minlon,minlat,maxlon,maxlat
		return [minX, minY, maxX, maxY];
	}
	if (version === "1.1.1" && (crs === "EPSG:4326" || crs === "CRS:84")) {
		// WMS 1.1.1 EPSG:4326: BBOX format is minlat,minlon,maxlat,maxlon (lat,lon order)
		return [minY, minX, maxY, maxX];
	}
	// For other CRS or Web Mercator, use standard order
	return [minX, minY, maxX, maxY];
}

function buildTileUrl(
	baseUrl: string,
	layers: string | string[],
	bbox: [number, number, number, number],
	tileWidth: number,
	tileHeight: number,
	version: string,
	format: string,
	transparent: boolean,
	extraParams: Record<string, string>,
	styles?: string | string[],
	crs?: string,
	tileUrlTransform?: (url: string) => string | Promise<string>,
): string {
	const urlParams: WmsGetMapParams = {
		baseUrl,
		layers,
		bbox,
		width: tileWidth,
		height: tileHeight,
		version,
		format,
		transparent,
		extraParams,
	};

	if (styles) {
		urlParams.styles = styles;
	}
	if (version === "1.3.0") {
		urlParams.crs = crs;
	} else {
		urlParams.srs = crs;
	}

	const url = buildWmsTileUrl(urlParams);

	// Apply tile URL transform if provided (for auth, signing, etc.)
	// Note: Must be synchronous - MapLibre doesn't support async tile functions
	// For async auth, use a token cache that's refreshed separately
	if (tileUrlTransform) {
		const transformed = tileUrlTransform(url);
		// Handle both sync (string) and async (Promise<string>)
		if (typeof transformed === "string") {
			return transformed;
		}
		// If Promise, return original URL (limitation - async not fully supported)
		return url;
	}

	return url;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a WMS raster layer definition.
 *
 * WMS (Web Map Service) is an OGC standard for serving georeferenced map images
 * via HTTP. This implementation supports WMS 1.1.1 and 1.3.0.
 *
 * @param config - WMS raster layer configuration
 * @returns LayerDefinition that can be registered with @mapwise/core
 *
 * @example
 * ```typescript
 * // Basic WMS layer
 * const layer = createWmsRasterLayer({
 *   id: 'wms-layer',
 *   baseUrl: 'https://example.com/wms',
 *   layers: 'myLayer',
 * });
 *
 * // With capabilities discovery
 * const caps = await fetchWmsCapabilities('https://example.com/wms');
 * const layer = createWmsRasterLayer({
 *   id: 'wms-layer',
 *   baseUrl: 'https://example.com/wms',
 *   layers: caps.layer?.layers?.[0]?.name || 'defaultLayer',
 *   crs: caps.crs?.[0] || 'EPSG:3857',
 * });
 * ```
 */
export function createWmsRasterLayer(config: WmsRasterLayerConfig): MapLibreLayerDefinition {
	// Validate config
	validateWmsConfig(config);

	const { id, category, attribution, metadata } = config;

	// Create source ID
	const sourceId = `${id}-source`;

	// Create source specification
	const sourceSpec = createWmsSourceSpec(config);

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

	const layerDef: MapLibreLayerDefinition & {
		getPersistedConfig?: () => unknown;
	} = {
		id,
		type: "wms-raster",
		category: category || "overlay",
		source: {
			id: sourceId,
			spec: sourceSpec,
		},
		layers: [layerSpec],
		metadata: layerMetadata,
		getPersistedConfig: () => toPersistedConfig(config),
	};

	return layerDef;
}
