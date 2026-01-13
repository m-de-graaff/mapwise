/**
 * Types for XYZ/TMS raster layer configuration.
 *
 * XYZ layers are the most common type of raster tile layer, used by many
 * tile providers (OpenStreetMap, Mapbox, Google Maps, etc.).
 *
 * @module xyz/types
 */

import type { BaseLayerConfig } from "../shared/types.js";

// =============================================================================
// XYZ Layer Configuration
// =============================================================================

/**
 * Configuration for an XYZ/TMS raster tile layer.
 *
 * XYZ layers serve raster tiles using a standard URL pattern where tiles are
 * addressed by zoom level (z), column (x), and row (y).
 *
 * @example
 * ```typescript
 * // Basic XYZ layer
 * const layer = createXyzRasterLayer({
 *   id: 'osm-tiles',
 *   tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
 *   attribution: '© OpenStreetMap contributors',
 * });
 *
 * // With subdomains for load balancing
 * const layer = createXyzRasterLayer({
 *   id: 'mapbox-tiles',
 *   tiles: ['https://{s}.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png'],
 *   subdomains: ['a', 'b', 'c', 'd'],
 *   tileSize: 512,
 *   maxzoom: 18,
 * });
 *
 * // TMS (Tile Map Service) layer with y-flip
 * const layer = createXyzRasterLayer({
 *   id: 'tms-layer',
 *   tiles: ['https://example.com/tiles/{z}/{x}/{y}.png'],
 *   tms: true, // Uses inverted Y coordinates
 * });
 * ```
 */
export interface XyzRasterLayerConfig extends BaseLayerConfig {
	/**
	 * Tile URL template(s).
	 *
	 * Supports the following placeholders:
	 * - `{z}` - Zoom level
	 * - `{x}` - Tile column
	 * - `{y}` - Tile row (or inverted Y if TMS is enabled)
	 * - `{s}` - Subdomain (if subdomains array is provided)
	 *
	 * Can be a single URL string or an array of URLs for multiple tile servers.
	 *
	 * @example
	 * ```typescript
	 * // Single URL
	 * tiles: 'https://tile.example.com/{z}/{x}/{y}.png'
	 *
	 * // Multiple URLs for redundancy
	 * tiles: [
	 *   'https://tile1.example.com/{z}/{x}/{y}.png',
	 *   'https://tile2.example.com/{z}/{x}/{y}.png',
	 * ]
	 *
	 * // With subdomain placeholder
	 * tiles: 'https://{s}.tile.example.com/{z}/{x}/{y}.png'
	 * ```
	 */
	tiles: string | string[];

	/**
	 * Tile size in pixels.
	 *
	 * Most tile servers use 256x256 tiles. Mapbox uses 512x512.
	 * Some high-resolution providers use 512x512 or 1024x1024.
	 *
	 * @default 256
	 */
	tileSize?: number;

	/**
	 * Minimum zoom level at which tiles are available.
	 *
	 * @default 0
	 */
	minzoom?: number;

	/**
	 * Maximum zoom level at which tiles are available.
	 *
	 * Most tile servers support zoom levels 0-18, some go up to 20.
	 *
	 * @default 22
	 */
	maxzoom?: number;

	/**
	 * Subdomains for load balancing across multiple servers.
	 *
	 * When provided, the `{s}` placeholder in tile URLs will be replaced
	 * with values from this array. MapLibre will automatically rotate through
	 * subdomains to distribute load.
	 *
	 * @example
	 * ```typescript
	 * // With subdomains
	 * tiles: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	 * subdomains: ['a', 'b', 'c']
	 * // Results in: https://a.tile..., https://b.tile..., https://c.tile...
	 * ```
	 */
	subdomains?: string[];

	/**
	 * Enable TMS (Tile Map Service) Y-flip.
	 *
	 * TMS uses an inverted Y coordinate system compared to XYZ. When `true`,
	 * the Y coordinate will be flipped (y = 2^z - 1 - y) for each tile request.
	 *
	 * - XYZ: Y increases from top to bottom
	 * - TMS: Y increases from bottom to top
	 *
	 * @default false
	 *
	 * @example
	 * ```typescript
	 * // TMS layer
	 * tiles: 'https://example.com/tms/{z}/{x}/{y}.png',
	 * tms: true
	 * ```
	 */
	tms?: boolean;

	/**
	 * Attribution text or HTML.
	 *
	 * Should include copyright and attribution information for the tile provider.
	 * Will be included in the layer metadata.
	 *
	 * @example
	 * ```typescript
	 * attribution: '© OpenStreetMap contributors'
	 * attribution: '<a href="...">© Mapbox</a>'
	 * ```
	 */
	attribution?: string;
}
