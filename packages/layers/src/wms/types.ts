/**
 * Types for WMS (Web Map Service) layer configuration and capabilities.
 *
 * @module wms/types
 */

import type { BaseLayerConfig } from "../shared/types.js";

// =============================================================================
// WMS Version
// =============================================================================

/**
 * Supported WMS versions.
 */
export type WmsVersion = "1.1.1" | "1.3.0";

// =============================================================================
// WMS Layer Configuration
// =============================================================================

/**
 * Configuration for a WMS raster layer.
 *
 * WMS (Web Map Service) is an OGC standard for serving georeferenced map images.
 * This implementation supports WMS 1.1.1 and 1.3.0.
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
 * // Multiple layers with styles
 * const layer = createWmsRasterLayer({
 *   id: 'wms-layer',
 *   baseUrl: 'https://example.com/wms',
 *   layers: ['layer1', 'layer2'],
 *   styles: ['style1', 'style2'],
 *   format: 'image/png',
 *   transparent: true,
 *   version: '1.3.0',
 * });
 *
 * // With extra parameters (time, elevation, etc.)
 * const layer = createWmsRasterLayer({
 *   id: 'wms-layer',
 *   baseUrl: 'https://example.com/wms',
 *   layers: 'myLayer',
 *   extraParams: {
 *     time: '2024-01-01',
 *     elevation: '0',
 *   },
 * });
 * ```
 */
export interface WmsRasterLayerConfig extends BaseLayerConfig {
	/**
	 * Base URL of the WMS service.
	 * Should not include query parameters.
	 *
	 * @example
	 * ```typescript
	 * baseUrl: 'https://example.com/wms'
	 * baseUrl: 'https://geo.example.com/ows?SERVICE=WMS'
	 * ```
	 */
	baseUrl: string;

	/**
	 * Layer name(s) to request.
	 * Can be a single layer name or an array for multiple layers.
	 *
	 * @example
	 * ```typescript
	 * layers: 'myLayer'
	 * layers: ['layer1', 'layer2']
	 * ```
	 */
	layers: string | string[];

	/**
	 * Style name(s) for the layer(s).
	 * If provided, must match the number of layers.
	 *
	 * @example
	 * ```typescript
	 * styles: 'default'
	 * styles: ['style1', 'style2']
	 * styles: '' // Empty string for default style
	 * ```
	 */
	styles?: string | string[];

	/**
	 * Image format for WMS GetMap requests.
	 *
	 * Common formats:
	 * - `image/png` - PNG with transparency support (default)
	 * - `image/jpeg` - JPEG (no transparency)
	 * - `image/gif` - GIF
	 *
	 * @default 'image/png'
	 */
	format?: string;

	/**
	 * Whether to request transparent background.
	 * Only effective with formats that support transparency (PNG, GIF).
	 *
	 * @default true
	 */
	transparent?: boolean;

	/**
	 * WMS version to use.
	 *
	 * Important differences:
	 * - 1.3.0: Uses CRS instead of SRS, different axis order for EPSG:4326
	 * - 1.1.1: Uses SRS, traditional axis order
	 *
	 * @default '1.3.0'
	 */
	version?: WmsVersion;

	/**
	 * Coordinate Reference System (CRS) for 1.3.0, or SRS for 1.1.1.
	 *
	 * Common values:
	 * - `EPSG:3857` - Web Mercator (default for web maps)
	 * - `EPSG:4326` - WGS84 lat/lon
	 * - `EPSG:900913` - Alternative Web Mercator code
	 *
	 * @default 'EPSG:3857'
	 */
	crs?: string;

	/**
	 * Additional WMS parameters.
	 *
	 * Useful for:
	 * - Time dimension: `{ time: '2024-01-01' }`
	 * - Elevation: `{ elevation: '0' }`
	 * - Custom vendor parameters
	 *
	 * @example
	 * ```typescript
	 * extraParams: {
	 *   time: '2024-01-01T00:00:00Z',
	 *   elevation: '0',
	 *   dim_custom: 'value',
	 * }
	 * ```
	 */
	extraParams?: Record<string, string>;

	/**
	 * Tile width in pixels.
	 *
	 * Some WMS services don't like non-standard sizes.
	 * Default is 256 for compatibility.
	 *
	 * @default 256
	 */
	tileWidth?: number;

	/**
	 * Tile height in pixels.
	 *
	 * @default 256
	 */
	tileHeight?: number;
}

// =============================================================================
// WMS Capabilities Types
// =============================================================================

/**
 * WMS layer information from capabilities.
 */
export interface WmsCapabilityLayer {
	/** Layer name */
	name?: string;
	/** Layer title */
	title?: string;
	/** Layer abstract/description */
	abstract?: string;
	/** Available styles */
	styles?: Array<{
		name: string;
		title?: string;
		abstract?: string;
	}>;
	/** Supported CRS/SRS codes */
	crs?: string[];
	srs?: string[];
	/** Bounding boxes */
	bbox?: Array<{
		crs: string;
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	}>;
	/** Child layers */
	layers?: WmsCapabilityLayer[];
}

/**
 * Parsed WMS capabilities document.
 */
export interface WmsCapabilities {
	/** Service title */
	title?: string;
	/** Service abstract */
	abstract?: string;
	/** WMS version */
	version?: string;
	/** Supported formats */
	formats?: string[];
	/** Supported CRS/SRS codes */
	crs?: string[];
	srs?: string[];
	/** Root layer (contains all available layers) */
	layer?: WmsCapabilityLayer;
	/** Service keywords */
	keywords?: string[];
}

// =============================================================================
// WMS URL Builder Types
// =============================================================================

/**
 * Parameters for building a WMS GetMap request URL.
 */
export interface WmsGetMapParams {
	/** Service base URL */
	baseUrl: string;
	/** Layer name(s) */
	layers: string | string[];
	/** Bounding box [minX, minY, maxX, maxY] */
	bbox: [number, number, number, number];
	/** Image width in pixels */
	width: number;
	/** Image height in pixels */
	height: number;
	/** CRS (for 1.3.0) or SRS (for 1.1.1) */
	crs?: string;
	srs?: string;
	/** WMS version */
	version?: WmsVersion;
	/** Style name(s) */
	styles?: string | string[];
	/** Image format */
	format?: string;
	/** Transparent background */
	transparent?: boolean;
	/** Additional parameters */
	extraParams?: Record<string, string>;
}

/**
 * Parameters for building a WMS GetLegendGraphic request URL.
 */
export interface WmsLegendParams {
	/** Service base URL */
	baseUrl: string;
	/** Layer name */
	layer: string;
	/** Style name (optional) */
	style?: string;
	/** Image format */
	format?: string;
	/** WMS version */
	version?: WmsVersion;
	/** Additional parameters */
	extraParams?: Record<string, string>;
}
