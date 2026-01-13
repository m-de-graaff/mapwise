/**
 * ArcGIS REST raster layer factory function.
 *
 * @module arcgis/arcgis-raster-layer
 */

import type { MapLibreLayerDefinition } from "@mapwise/core";
import type { RasterSourceSpecification } from "maplibre-gl";
import { validateSafeUrl } from "../shared/url.js";
import { validateBaseLayerConfig } from "../shared/validation.js";
import { toPersistedConfig } from "./persistence.js";
import type { ArcGisRestRasterLayerConfig } from "./types.js";
import { buildArcGisExportUrl } from "./url-builder.js";

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates ArcGIS REST raster layer configuration.
 */
export function validateArcGisConfig(config: unknown): void {
	const baseResult = validateBaseLayerConfig(config);
	if (!baseResult.valid) {
		throw new Error(`Invalid ArcGIS layer config: ${baseResult.errors[0]?.message}`);
	}

	const cfg = config as Partial<ArcGisRestRasterLayerConfig>;
	validateServiceUrl(cfg);
	validateLayerId(cfg);
	validateTileDimensions(cfg);
	validateOptionalFields(cfg);
}

function validateServiceUrl(cfg: Partial<ArcGisRestRasterLayerConfig>): void {
	if (!cfg.serviceUrl || typeof cfg.serviceUrl !== "string") {
		throw new Error("ArcGIS layer requires 'serviceUrl' property (string)");
	}

	const urlError = validateSafeUrl(cfg.serviceUrl);
	if (urlError) {
		throw new Error(`ArcGIS layer 'serviceUrl' is invalid: ${urlError.message}`);
	}
}

function validateLayerId(cfg: Partial<ArcGisRestRasterLayerConfig>): void {
	if (cfg.layerId !== undefined && (typeof cfg.layerId !== "number" || cfg.layerId < 0)) {
		throw new Error("ArcGIS layer 'layerId' must be a non-negative number");
	}
}

function validateTileDimensions(cfg: Partial<ArcGisRestRasterLayerConfig>): void {
	if (cfg.tileWidth !== undefined && (typeof cfg.tileWidth !== "number" || cfg.tileWidth <= 0)) {
		throw new Error("ArcGIS layer 'tileWidth' must be a positive number");
	}

	if (cfg.tileHeight !== undefined && (typeof cfg.tileHeight !== "number" || cfg.tileHeight <= 0)) {
		throw new Error("ArcGIS layer 'tileHeight' must be a positive number");
	}
}

function validateOptionalFields(cfg: Partial<ArcGisRestRasterLayerConfig>): void {
	if (cfg.format !== undefined && typeof cfg.format !== "string") {
		throw new Error("ArcGIS layer 'format' must be a string");
	}

	if (cfg.extraParams !== undefined && typeof cfg.extraParams !== "object") {
		throw new Error("ArcGIS layer 'extraParams' must be an object");
	}
}

// =============================================================================
// Source Creation
// =============================================================================

/**
 * Creates a MapLibre raster source specification for ArcGIS REST Export tiles.
 *
 * ArcGIS REST Export endpoint uses bounding boxes rather than standard tile coordinates.
 * MapLibre's raster source supports a `tiles` function that receives tile coordinates
 * and returns the URL for that tile.
 *
 * Note: MapLibre's TypeScript types don't fully reflect that `tiles` can be
 * a function, but it is supported at runtime.
 */
function createArcGisSourceSpec(config: ArcGisRestRasterLayerConfig): RasterSourceSpecification {
	const {
		serviceUrl,
		layerId = 0,
		format = "png32",
		transparent = true,
		crs = "EPSG:3857",
		extraParams = {},
		tileWidth = 256,
		tileHeight = 256,
		minzoom = 0,
		maxzoom = 22,
		tileUrlTransform,
	} = config;

	// Create tiles function that MapLibre will call with tile coordinates
	// This function converts tile coordinates to ArcGIS Export bbox requests
	// MapLibre calls this with an object like { x: 0, y: 0, z: 0 }
	// Note: MapLibre doesn't support async tile functions, so tileUrlTransform
	// must return synchronously. For async auth, use a token cache refreshed separately.
	const tilesFunction = (tileCoord: { x: number; y: number; z: number }): string => {
		const { x, y, z } = tileCoord;

		// Calculate bounding box for tile
		// Convert tile coordinates to geographic bounds
		// For EPSG:3857 (Web Mercator) - standard web tile projection
		const n = 2 ** z;

		// Convert tile coordinates to Web Mercator meters
		// Then convert to lat/lon if needed for EPSG:4326
		let minX: number;
		let maxX: number;
		let minY: number;
		let maxY: number;

		if (crs === "EPSG:3857" || crs === "EPSG:900913") {
			// Web Mercator - direct tile coordinate conversion
			const tileSize = 40075016.686; // Earth circumference in meters
			const res = tileSize / n;
			minX = x * res - tileSize / 2;
			maxX = (x + 1) * res - tileSize / 2;
			minY = tileSize / 2 - (y + 1) * res;
			maxY = tileSize / 2 - y * res;
		} else if (crs === "EPSG:4326" || crs === "CRS:84") {
			// Geographic coordinates - simpler conversion
			minX = (x / n) * 360 - 180;
			maxX = ((x + 1) / n) * 360 - 180;
			const latRad1 = Math.PI * (1 - (2 * y) / n);
			minY = Math.atan(Math.sinh(latRad1)) * (180 / Math.PI);
			const latRad2 = Math.PI * (1 - (2 * (y + 1)) / n);
			maxY = Math.atan(Math.sinh(latRad2)) * (180 / Math.PI);
		} else {
			// Default to Web Mercator conversion
			const tileSize = 40075016.686;
			const res = tileSize / n;
			minX = x * res - tileSize / 2;
			maxX = (x + 1) * res - tileSize / 2;
			minY = tileSize / 2 - (y + 1) * res;
			maxY = tileSize / 2 - y * res;
		}

		const bbox: [number, number, number, number] = [minX, minY, maxX, maxY];

		// Build Export URL
		const url = buildArcGisExportUrl({
			serviceUrl,
			layerId,
			bbox,
			width: tileWidth,
			height: tileHeight,
			format,
			transparent,
			crs,
			extraParams,
		});

		// Apply tile URL transform if provided (for auth, signing, etc.)
		// Note: Must be synchronous - MapLibre doesn't support async tile functions
		// For async auth, use a token cache that's refreshed separately
		if (tileUrlTransform) {
			const transformed = tileUrlTransform(url);
			// Handle both sync (string) and async (Promise<string>)
			// For async, we can't wait here, so return original URL as fallback
			// In practice, users should ensure tileUrlTransform is sync for tiles
			if (typeof transformed === "string") {
				return transformed;
			}
			// If Promise, return original URL (limitation - async not fully supported)
			return url;
		}

		return url;
	};

	// MapLibre's TypeScript types say tiles is string[], but it actually supports
	// a function at runtime. We use a type assertion here.
	return {
		type: "raster",
		tiles: tilesFunction as unknown as string[],
		tileSize: Math.max(tileWidth, tileHeight),
		minzoom,
		maxzoom,
	} as RasterSourceSpecification;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates an ArcGIS REST raster layer definition.
 *
 * ArcGIS REST services provide raster map images via the Export endpoint.
 * This adapter builds tile URLs using the ArcGIS REST API Export service,
 * which accepts bounding box, size, and format parameters.
 *
 * @param config - ArcGIS REST raster layer configuration
 * @returns LayerDefinition that can be registered with @mapwise/core
 *
 * @example
 * ```typescript
 * // Basic ArcGIS REST raster layer
 * const layer = createArcGisRestRasterLayer({
 *   id: 'arcgis-layer',
 *   serviceUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
 *   layerId: 0,
 * });
 *
 * // With authentication token
 * const layer = createArcGisRestRasterLayer({
 *   id: 'arcgis-layer',
 *   serviceUrl: 'https://example.com/arcgis/rest/services/MyLayer/MapServer',
 *   layerId: 0,
 *   tileUrlTransform: (url) => {
 *     const parsed = new URL(url);
 *     parsed.searchParams.set('token', authToken);
 *     return parsed.toString();
 *   },
 * });
 * ```
 */
export function createArcGisRestRasterLayer(
	config: ArcGisRestRasterLayerConfig,
): MapLibreLayerDefinition {
	// Validate config
	validateArcGisConfig(config);

	const { id, category, attribution, metadata } = config;

	// Create source ID
	const sourceId = `${id}-source`;

	// Create source specification
	const sourceSpec = createArcGisSourceSpec(config);

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
		type: "arcgis-raster",
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
