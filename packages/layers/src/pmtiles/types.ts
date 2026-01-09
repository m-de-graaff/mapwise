/**
 * Types for PMTiles layer configuration.
 *
 * @module pmtiles/types
 */

import type { LayerSpecification } from "maplibre-gl";
import type { BaseLayerConfig } from "../shared/types";

// =============================================================================
// PMTiles Layer Configuration
// =============================================================================

/**
 * Configuration for a PMTiles raster layer.
 *
 * PMTiles is a single-file archive format for tiles. This configuration
 * is for raster tiles stored in PMTiles format.
 */
export interface PmtilesRasterLayerConfig extends BaseLayerConfig {
	/** PMTiles file URL (.pmtiles file) */
	url: string;
	/** Source layer name (for PMTiles that contain multiple layers) */
	sourceLayer?: string;
	/** Image format (if PMTiles contains raster tiles) */
	format?: string;
	/**
	 * Minimum zoom level.
	 * @default 0
	 */
	minzoom?: number;
	/**
	 * Maximum zoom level.
	 * @default 22
	 */
	maxzoom?: number;
	/** Attribution text or HTML */
	attribution?: string;
}

/**
 * Configuration for a PMTiles vector layer.
 *
 * PMTiles can contain vector tiles (MVT). This configuration allows
 * styling vector tiles from a PMTiles archive.
 */
export interface PmtilesVectorLayerConfig extends BaseLayerConfig {
	/** PMTiles file URL (.pmtiles file) */
	url: string;
	/** Source layer name within the vector tiles */
	sourceLayer: string;
	/**
	 * Style configuration.
	 * Can be a preset string or advanced MapLibre layer specs.
	 */
	style?: "fill" | "line" | "circle" | "symbol" | LayerSpecification[];
	/**
	 * Minimum zoom level.
	 * @default 0
	 */
	minzoom?: number;
	/**
	 * Maximum zoom level.
	 * @default 22
	 */
	maxzoom?: number;
	/** Attribution text or HTML */
	attribution?: string;
}

/**
 * Union type for PMTiles layer configuration.
 */
export type PmtilesLayerConfig = PmtilesRasterLayerConfig | PmtilesVectorLayerConfig;

/**
 * Type guard to check if config is for a vector layer.
 */
export function isPmtilesVectorConfig(
	config: PmtilesLayerConfig,
): config is PmtilesVectorLayerConfig {
	return ("sourceLayer" in config && typeof config.sourceLayer === "string") || "style" in config;
}
