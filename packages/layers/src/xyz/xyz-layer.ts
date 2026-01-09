/**
 * XYZ/TMS raster tile layer factory function.
 *
 * @module xyz/xyz-layer
 */

import type { MapLibreLayerDefinition } from "@mapwise/core";
import type { RasterSourceSpecification } from "maplibre-gl";
import { validateBaseLayerConfig } from "../shared/validation";
import { toPersistedConfig } from "./persistence";
import type { XyzRasterLayerConfig } from "./types";

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates XYZ raster layer configuration.
 */
export function validateXyzConfig(config: unknown): void {
	const baseResult = validateBaseLayerConfig(config);
	if (!baseResult.valid) {
		throw new Error(`Invalid XYZ layer config: ${baseResult.errors[0]?.message}`);
	}

	const cfg = config as Partial<XyzRasterLayerConfig>;

	// Validate tiles
	if (!cfg.tiles) {
		throw new Error("XYZ layer requires 'tiles' property (string or array of strings)");
	}

	if (typeof cfg.tiles !== "string" && !Array.isArray(cfg.tiles)) {
		throw new Error("XYZ layer 'tiles' must be a string or array of strings");
	}

	if (Array.isArray(cfg.tiles) && cfg.tiles.length === 0) {
		throw new Error("XYZ layer 'tiles' array cannot be empty");
	}

	// Validate tile size if provided
	if (cfg.tileSize !== undefined) {
		if (typeof cfg.tileSize !== "number" || cfg.tileSize <= 0) {
			throw new Error("XYZ layer 'tileSize' must be a positive number");
		}
	}

	// Validate zoom levels if provided (handled by base validation, but check consistency)
	if (cfg.minzoom !== undefined && cfg.maxzoom !== undefined && cfg.minzoom > cfg.maxzoom) {
		throw new Error("XYZ layer 'minzoom' must be less than or equal to 'maxzoom'");
	}
}

// =============================================================================
// URL Template Processing
// =============================================================================

/**
 * Processes tile URL template(s) to handle subdomains.
 *
 * If subdomains are provided and URL contains {s} placeholder,
 * returns array with subdomain substitutions. Otherwise returns
 * the tiles array as-is (normalized to array).
 */
function processTileUrls(tiles: string | string[], subdomains?: string[]): string[] {
	const urls = Array.isArray(tiles) ? tiles : [tiles];

	// If no subdomains or no {s} placeholder, return as-is
	if (!subdomains || subdomains.length === 0) {
		return urls;
	}

	// Check if any URL contains {s} placeholder
	const hasSubdomainPlaceholder = urls.some((url) => url.includes("{s}"));

	if (!hasSubdomainPlaceholder) {
		return urls;
	}

	// Expand URLs with subdomain substitutions
	const expanded: string[] = [];
	for (const url of urls) {
		if (url.includes("{s}")) {
			for (const subdomain of subdomains) {
				expanded.push(url.replace(/{s}/g, subdomain));
			}
		} else {
			expanded.push(url);
		}
	}

	return expanded;
}

// =============================================================================
// Source Creation
// =============================================================================

/**
 * Creates a MapLibre raster source specification for XYZ tiles.
 */
function createRasterSourceSpec(config: XyzRasterLayerConfig): RasterSourceSpecification {
	const {
		tiles,
		tileSize = 256,
		minzoom = 0,
		maxzoom = 22,
		subdomains,
		tms = false,
		tileUrlTransform,
	} = config;

	// Process tile URLs (handle subdomains)
	const tileUrls = processTileUrls(tiles, subdomains);

	// If we have a transform, we need to use a function to apply it per-tile
	// This is necessary because XYZ tiles use templates that are resolved at runtime
	if (tileUrlTransform) {
		// Create a tiles function that applies the transform
		// MapLibre calls this with {x, y, z} for each tile
		const tilesFunction = (tileCoord: { x: number; y: number; z: number }): string => {
			// Select URL from array (round-robin style - MapLibre handles this)
			// For simplicity, use first URL and let MapLibre handle multiple
			const template = tileUrls[0] || "";

			// Apply TMS Y-flip if enabled
			let y = tileCoord.y;
			if (tms) {
				const n = 2 ** tileCoord.z;
				y = n - 1 - y;
			}

			// Substitute placeholders
			let url = template
				.replace(/{z}/g, String(tileCoord.z))
				.replace(/{x}/g, String(tileCoord.x))
				.replace(/{y}/g, String(y));

			// Apply subdomain substitution if needed
			if (subdomains && subdomains.length > 0 && url.includes("{s}")) {
				// Use a simple hash of coordinates to select subdomain consistently
				const index = (tileCoord.x + tileCoord.y + tileCoord.z) % subdomains.length;
				url = url.replace(/{s}/g, subdomains[index] || subdomains[0] || "");
			}

			// Apply tile URL transform (for auth, signing, etc.)
			// Note: Must be synchronous - MapLibre doesn't support async tile functions
			const transformed = tileUrlTransform(url);
			if (typeof transformed === "string") {
				return transformed;
			}
			// If Promise, return original URL (limitation - async not fully supported)
			return url;
		};

		const spec: RasterSourceSpecification = {
			type: "raster",
			tiles: tilesFunction as unknown as string[],
			tileSize,
			minzoom,
			maxzoom,
		};

		if (tms) {
			spec.scheme = "tms";
		}

		return spec;
	}

	// No transform - use standard array of URLs
	const spec: RasterSourceSpecification = {
		type: "raster",
		tiles: tileUrls,
		tileSize,
		minzoom,
		maxzoom,
	};

	// Add TMS y-flip if enabled
	if (tms) {
		spec.scheme = "tms";
	}

	return spec;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates an XYZ/TMS raster tile layer definition.
 *
 * XYZ layers are the most common type of raster tile layer, compatible with
 * most tile providers including OpenStreetMap, Mapbox, Google Maps, and others.
 *
 * @param config - XYZ raster layer configuration
 * @returns LayerDefinition that can be registered with @mapwise/core
 *
 * @example
 * ```typescript
 * // Basic OpenStreetMap layer
 * const layer = createXyzRasterLayer({
 *   id: 'osm-tiles',
 *   tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
 *   attribution: '© OpenStreetMap contributors',
 * });
 *
 * // Mapbox-style layer with subdomains
 * const layer = createXyzRasterLayer({
 *   id: 'mapbox-streets',
 *   tiles: 'https://{s}.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png',
 *   subdomains: ['a', 'b', 'c', 'd'],
 *   tileSize: 512,
 *   maxzoom: 18,
 *   attribution: '© Mapbox',
 * });
 *
 * // TMS layer with y-flip
 * const layer = createXyzRasterLayer({
 *   id: 'tms-layer',
 *   tiles: 'https://example.com/tms/{z}/{x}/{y}.png',
 *   tms: true,
 * });
 * ```
 */
export function createXyzRasterLayer(config: XyzRasterLayerConfig): MapLibreLayerDefinition {
	// Validate config
	validateXyzConfig(config);

	const { id, category, attribution, metadata } = config;

	// Create source ID
	const sourceId = `${id}-source`;

	// Create source specification
	const sourceSpec = createRasterSourceSpec(config);

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
		type: "xyz-raster",
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
