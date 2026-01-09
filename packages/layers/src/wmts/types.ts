/**
 * Types for WMTS (Web Map Tile Service) layer configuration and capabilities.
 *
 * @module wmts/types
 */

import type { BaseLayerConfig } from "../shared/types";

// =============================================================================
// WMTS Layer Configuration
// =============================================================================

/**
 * Tile matrix configuration for explicit WMTS setup.
 */
export interface WmtsTileMatrix {
	/** Zoom level */
	zoom: number;
	/** Matrix width (number of tiles) */
	matrixWidth: number;
	/** Matrix height (number of tiles) */
	matrixHeight: number;
	/** Tile width in pixels */
	tileWidth: number;
	/** Tile height in pixels */
	tileHeight: number;
	/** Top-left corner X coordinate */
	topLeftCorner: [number, number];
	/** Scale denominator */
	scaleDenominator: number;
}

/**
 * Configuration for a WMTS raster layer using explicit tile URL template.
 */
export interface WmtsExplicitConfig extends BaseLayerConfig {
	/** Tile URL template with {TileMatrix}, {TileCol}, {TileRow} placeholders */
	tileUrlTemplate: string;
	/** Tile matrix set identifier (e.g., "EPSG:3857") */
	matrixSet: string;
	/** Tile matrix definitions */
	tileMatrix: WmtsTileMatrix[];
	/** Image format */
	format?: string;
	/** Optional style identifier */
	style?: string;
	/** Optional dimension values (e.g., time, elevation) */
	dimensions?: Record<string, string>;
}

/**
 * Configuration for a WMTS raster layer using capabilities discovery.
 */
export interface WmtsCapabilitiesConfig extends BaseLayerConfig {
	/** WMTS GetCapabilities URL */
	capabilitiesUrl: string;
	/** Layer identifier from capabilities */
	layerId: string;
	/** Tile matrix set identifier (optional, will be auto-selected if not provided) */
	matrixSet?: string;
	/** Style identifier (optional, defaults to first available style) */
	style?: string;
	/** Image format (optional, will be auto-selected if not provided) */
	format?: string;
	/** Optional dimension values */
	dimensions?: Record<string, string>;
}

/**
 * Union type for WMTS layer configuration.
 */
export type WmtsRasterLayerConfig = WmtsExplicitConfig | WmtsCapabilitiesConfig;

/**
 * Type guard to check if config is explicit.
 */
export function isWmtsExplicitConfig(config: WmtsRasterLayerConfig): config is WmtsExplicitConfig {
	return "tileUrlTemplate" in config && "tileMatrix" in config;
}

// =============================================================================
// WMTS Capabilities Types
// =============================================================================

/**
 * Tile matrix definition from WMTS capabilities.
 */
export interface WmtsTileMatrixDefinition {
	/** Matrix identifier */
	identifier: string;
	/** Scale denominator */
	scaleDenominator: number;
	/** Top-left corner coordinates */
	topLeftCorner: [number, number];
	/** Tile width in pixels */
	tileWidth: number;
	/** Tile height in pixels */
	tileHeight: number;
	/** Matrix width (number of tiles) */
	matrixWidth: number;
	/** Matrix height (number of tiles) */
	matrixHeight: number;
}

/**
 * Tile matrix set from WMTS capabilities.
 */
export interface WmtsTileMatrixSet {
	/** Matrix set identifier (e.g., "EPSG:3857") */
	identifier: string;
	/** Supported CRS */
	supportedCRS: string;
	/** Tile matrices (ordered by zoom level) */
	tileMatrix: WmtsTileMatrixDefinition[];
	/** Well-known scale set (optional) */
	wellKnownScaleSet?: string;
}

/**
 * Resource URL template from WMTS capabilities.
 */
export interface WmtsResourceUrl {
	/** Resource type (e.g., "tile", "FeatureInfo") */
	resourceType: string;
	/** URL template */
	template: string;
	/** Format */
	format?: string;
}

/**
 * Dimension definition from WMTS capabilities.
 */
export interface WmtsDimension {
	/** Dimension identifier */
	identifier: string;
	/** Default value */
	default?: string;
	/** Available values */
	values?: string[];
	/** Unit of measure */
	unitOfMeasure?: string;
}

/**
 * Style definition from WMTS capabilities.
 */
export interface WmtsStyle {
	/** Style identifier */
	identifier: string;
	/** Style title */
	title?: string;
	/** Is default style */
	isDefault?: boolean;
	/** Legend URL (optional) */
	legendURL?: string;
}

/**
 * Layer definition from WMTS capabilities.
 */
export interface WmtsCapabilityLayer {
	/** Layer identifier */
	identifier: string;
	/** Layer title */
	title?: string;
	/** Layer abstract */
	abstract?: string;
	/** Supported formats */
	formats: string[];
	/** Supported tile matrix sets */
	tileMatrixSetLinks: string[];
	/** Available styles */
	styles: WmtsStyle[];
	/** Resource URL templates */
	resourceURLs?: WmtsResourceUrl[];
	/** Dimensions */
	dimensions?: WmtsDimension[];
	/** Bounding box */
	bbox?: {
		crs: string;
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	};
}

/**
 * Parsed WMTS capabilities document.
 */
export interface WmtsCapabilities {
	/** Service title */
	title?: string;
	/** Service abstract */
	abstract?: string;
	/** WMTS version */
	version?: string;
	/** Available layers */
	layers: WmtsCapabilityLayer[];
	/** Available tile matrix sets */
	tileMatrixSets: WmtsTileMatrixSet[];
	/** Service keywords */
	keywords?: string[];
}

// =============================================================================
// Selection Heuristics
// =============================================================================

/**
 * Options for selecting a tile matrix set.
 */
export interface WmtsMatrixSetSelectionOptions {
	/** Preferred CRS (defaults to Web Mercator) */
	preferredCRS?: string;
	/** Preferred well-known scale set */
	preferredWellKnownScaleSet?: string;
}

/**
 * Options for selecting a format.
 */
export interface WmtsFormatSelectionOptions {
	/** Preferred formats in order (defaults to ["image/png", "image/jpeg"]) */
	preferredFormats?: string[];
}
