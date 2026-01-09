/**
 * Types for terrain and hillshade layer configuration.
 *
 * @module terrain/types
 */

import type { BaseLayerConfig } from "../shared/types";

// =============================================================================
// Terrain Layer Configuration
// =============================================================================

/**
 * Configuration for a terrain layer using DEM (Digital Elevation Model) tiles.
 *
 * Terrain layers provide 3D elevation data that can be visualized with
 * terrain exaggeration. They require a raster-dem source containing elevation tiles.
 */
export interface TerrainLayerConfig extends BaseLayerConfig {
	/**
	 * DEM tiles URL template or array of templates.
	 * Supports {z}, {x}, {y} placeholders for tile coordinates.
	 * Can also be a Mapbox source URL (e.g., "mapbox://mapbox.mapbox-terrain-dem-v1").
	 *
	 * @example
	 * "https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw"
	 * ["https://dem-tiles.example.com/{z}/{x}/{y}.png"]
	 */
	demTiles: string | string[];

	/**
	 * Terrain exaggeration factor (0-100).
	 * Controls how much the terrain is exaggerated vertically.
	 * Default: 1.0 (no exaggeration)
	 *
	 * @example
	 * 1.0 - No exaggeration (realistic terrain)
	 * 1.5 - 50% exaggeration
	 * 2.0 - 100% exaggeration (double height)
	 */
	exaggeration?: number;

	/**
	 * Whether to create an optional hillshade overlay layer.
	 * Hillshade provides visual shading based on terrain elevation.
	 * Default: false
	 */
	hillshade?: boolean;

	/**
	 * Hillshade configuration options.
	 * Only used if hillshade is true.
	 */
	hillshadeOptions?: HillshadeOptions;

	/**
	 * Tile size in pixels.
	 * Default: 256
	 */
	tileSize?: number;

	/**
	 * Minimum zoom level for DEM tiles.
	 * Default: 0
	 */
	minzoom?: number;

	/**
	 * Maximum zoom level for DEM tiles.
	 * Default: 22
	 */
	maxzoom?: number;

	/**
	 * Subdomain placeholders for load balancing.
	 * If provided and demTiles contains {s}, URLs will be expanded.
	 *
	 * @example
	 * demTiles: "https://{s}.tiles.example.com/{z}/{x}/{y}.png"
	 * subdomains: ["a", "b", "c"]
	 */
	subdomains?: string[];
}

/**
 * Configuration options for hillshade overlay layer.
 */
export interface HillshadeOptions {
	/**
	 * Hillshade exaggeration factor (0-1).
	 * Controls the intensity of the shading effect.
	 * Default: 0.5
	 */
	exaggeration?: number;

	/**
	 * Shadow color.
	 * Default: "#000000" (black)
	 */
	shadowColor?: string;

	/**
	 * Highlight color.
	 * Default: "#FFFFFF" (white)
	 */
	highlightColor?: string;

	/**
	 * Azimuth (light direction) in degrees (0-360).
	 * Default: 335
	 */
	azimuth?: number;

	/**
	 * Altitude (light angle) in degrees (0-90).
	 * Default: 45
	 */
	altitude?: number;

	/**
	 * Opacity of the hillshade layer (0-1).
	 * Default: 0.6
	 */
	opacity?: number;

	/**
	 * Layer ID to insert hillshade before (for z-order control).
	 */
	beforeId?: string;
}

/**
 * Configuration for enabling terrain on a map.
 * This is a convenience type for the enableTerrain helper function.
 */
export interface EnableTerrainConfig extends Omit<TerrainLayerConfig, "id"> {
	/** Optional layer ID (defaults to "terrain") */
	id?: string;
}
