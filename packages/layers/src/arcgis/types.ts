/**
 * Types for ArcGIS REST raster layer configuration.
 *
 * @module arcgis/types
 */

import type { BaseLayerConfig } from "../shared/types";

// =============================================================================
// ArcGIS REST Raster Layer Configuration
// =============================================================================

/**
 * Configuration for an ArcGIS REST raster layer.
 *
 * ArcGIS REST services provide raster map images via the Export endpoint.
 * This adapter builds tile URLs using the ArcGIS REST API Export service,
 * which accepts bounding box, size, and format parameters.
 *
 * The Export endpoint URL format:
 * `{serviceUrl}/export?bbox={bbox}&size={width},{height}&format={format}&f=image&...`
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
 *
 * // With custom parameters
 * const layer = createArcGisRestRasterLayer({
 *   id: 'arcgis-layer',
 *   serviceUrl: 'https://example.com/arcgis/rest/services/MyLayer/MapServer',
 *   layerId: 0,
 *   format: 'png32',
 *   transparent: true,
 *   extraParams: {
 *     layers: 'show:0,1,2',
 *   },
 * });
 * ```
 */
export interface ArcGisRestRasterLayerConfig extends BaseLayerConfig {
	/**
	 * Base URL of the ArcGIS REST service.
	 * Should be the MapServer or ImageServer URL without query parameters.
	 *
	 * @example
	 * ```typescript
	 * serviceUrl: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
	 * serviceUrl: 'https://example.com/arcgis/rest/services/MyLayer/ImageServer'
	 * ```
	 */
	serviceUrl: string;

	/**
	 * Layer ID to display (0-based index).
	 * For MapServer, this is the layer index.
	 * For ImageServer, this is typically 0.
	 *
	 * @default 0
	 */
	layerId?: number;

	/**
	 * Image format for Export requests.
	 * Common formats: 'png', 'png8', 'png24', 'png32', 'jpg', 'pdf', 'bmp', 'gif', 'svg', 'svgz'.
	 *
	 * @default 'png32'
	 */
	format?: string;

	/**
	 * Whether to request transparent background.
	 * Only effective with formats that support transparency (png, png8, png24, png32).
	 *
	 * @default true
	 */
	transparent?: boolean;

	/**
	 * Tile width in pixels.
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

	/**
	 * Coordinate Reference System (CRS) for requests.
	 * Common values: 'EPSG:3857' (Web Mercator), 'EPSG:4326' (WGS84).
	 *
	 * @default 'EPSG:3857'
	 */
	crs?: string;

	/**
	 * Additional ArcGIS REST Export parameters.
	 *
	 * Common parameters:
	 * - `layers`: Show specific layers (e.g., 'show:0,1,2')
	 * - `time`: Time dimension (e.g., '1234567890')
	 * - `imageSR`: Image spatial reference
	 * - `bboxSR`: Bounding box spatial reference
	 * - `dpi`: Output DPI
	 *
	 * @example
	 * ```typescript
	 * extraParams: {
	 *   layers: 'show:0,1,2',
	 *   time: '1234567890',
	 *   dpi: '96',
	 * }
	 * ```
	 */
	extraParams?: Record<string, string>;
}

// =============================================================================
// ArcGIS REST Export URL Parameters
// =============================================================================

/**
 * Parameters for building an ArcGIS REST Export request URL.
 */
export interface ArcGisExportParams {
	/** Service base URL */
	serviceUrl: string;
	/** Bounding box [minX, minY, maxX, maxY] */
	bbox: [number, number, number, number];
	/** Image width in pixels */
	width: number;
	/** Image height in pixels */
	height: number;
	/** Layer ID (optional) */
	layerId?: number;
	/** Image format */
	format?: string;
	/** Transparent background */
	transparent?: boolean;
	/** CRS/SRS code */
	crs?: string;
	/** Additional parameters */
	extraParams?: Record<string, string>;
}
