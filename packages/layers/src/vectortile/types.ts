/**
 * Types for vector tile layer configuration and style helpers.
 *
 * @module vectortile/types
 */

import type { LayerSpecification } from "maplibre-gl";
import type { BaseLayerConfig } from "../shared/types.js";

// =============================================================================
// Style Presets
// =============================================================================

/**
 * Style preset options for quick styling.
 */
export type VectorTileStylePreset = "fill" | "line" | "circle" | "symbol";

/**
 * Simple style configuration for presets.
 */
export interface VectorTileSimpleStyle {
	/** Color for fill/line/circle/symbol */
	color?: string;
	/** Opacity (0-1) */
	opacity?: number;
	/** Width for lines */
	width?: number;
	/** Radius for circles */
	radius?: number;
	/** Stroke color for fills */
	strokeColor?: string;
	/** Stroke width for fills */
	strokeWidth?: number;
	/** Font size for symbols */
	fontSize?: number;
}

// =============================================================================
// Vector Tile Layer Configuration
// =============================================================================

/**
 * Configuration for a vector tile layer.
 *
 * Vector tiles (MVT - Mapbox Vector Tiles) are an efficient format for
 * delivering map data. They are pre-rendered on the client using MapLibre.
 *
 * @example
 * ```typescript
 * // Basic vector tile layer with style preset
 * const layer = createVectorTileLayer({
 *   id: 'vector-layer',
 *   tiles: ['https://example.com/tiles/{z}/{x}/{y}.pbf'],
 *   sourceLayer: 'myLayer',
 *   style: 'fill',
 * });
 *
 * // With simple style options
 * const layer = createVectorTileLayer({
 *   id: 'vector-layer',
 *   tiles: ['https://example.com/tiles/{z}/{x}/{y}.pbf'],
 *   sourceLayer: 'myLayer',
 *   style: {
 *     preset: 'fill',
 *     color: '#3388ff',
 *     opacity: 0.6,
 *     strokeColor: '#ffffff',
 *     strokeWidth: 1,
 *   },
 * });
 *
 * // With advanced MapLibre layer specs
 * const layer = createVectorTileLayer({
 *   id: 'vector-layer',
 *   tiles: ['https://example.com/tiles/{z}/{x}/{y}.pbf'],
 *   sourceLayer: 'myLayer',
 *   style: [
 *     {
 *       id: 'fill-layer',
 *       type: 'fill',
 *       source: 'source-id',
 *       'source-layer': 'myLayer',
 *       paint: {
 *         'fill-color': '#3388ff',
 *         'fill-opacity': 0.6,
 *       },
 *     },
 *   ],
 * });
 * ```
 */
export interface VectorTileLayerConfig extends BaseLayerConfig {
	/**
	 * Tile URL template(s) or single URL.
	 * Supports {z}, {x}, {y} placeholders.
	 *
	 * Can be a single URL string or an array of URLs for multiple tile servers.
	 *
	 * @example
	 * ```typescript
	 * tiles: 'https://example.com/tiles/{z}/{x}/{y}.pbf'
	 * tiles: ['https://tile1.example.com/{z}/{x}/{y}.pbf', 'https://tile2.example.com/{z}/{x}/{y}.pbf']
	 * ```
	 */
	tiles: string | string[];

	/**
	 * Source layer name within the vector tile.
	 * This is the layer name that was used when creating the vector tiles.
	 *
	 * Required unless using advanced layer specs that specify 'source-layer' themselves.
	 */
	sourceLayer?: string;

	/**
	 * Style configuration.
	 *
	 * Can be:
	 * - A preset string: 'fill', 'line', 'circle', 'symbol'
	 * - An object with preset and style options
	 * - An array of MapLibre layer specifications for advanced styling
	 */
	style?:
		| VectorTileStylePreset
		| { preset: VectorTileStylePreset; options?: VectorTileSimpleStyle }
		| LayerSpecification[];

	/**
	 * Minimum zoom level.
	 *
	 * @default 0
	 */
	minzoom?: number;

	/**
	 * Maximum zoom level.
	 *
	 * @default 22
	 */
	maxzoom?: number;

	/**
	 * Attribution text or HTML.
	 */
	attribution?: string;
}

// =============================================================================
// Style Helper Types
// =============================================================================

/**
 * Stop for choropleth styling (color/opacity stops based on property value).
 */
export interface StyleStop {
	/** Property value threshold */
	value: number;
	/** Color or opacity value */
	result: string | number;
}

/**
 * Category for categorical styling.
 */
export interface StyleCategory {
	/** Property value to match */
	value: string | number | boolean;
	/** Color or other style value */
	result: string | number;
}

/**
 * Options for creating a choropleth style expression.
 */
export interface ChoroplethStyleOptions {
	/** Property name to use for data-driven styling */
	property: string;
	/** Color stops (for fill-color, line-color, etc.) */
	colorStops?: StyleStop[];
	/** Opacity stops (for fill-opacity, line-opacity, etc.) */
	opacityStops?: StyleStop[];
	/** Default color if property is missing */
	defaultColor?: string;
	/** Default opacity if property is missing */
	defaultOpacity?: number;
}

/**
 * Options for creating a categorical style expression.
 */
export interface CategoricalStyleOptions {
	/** Property name to use for data-driven styling */
	property: string;
	/** Categories mapping values to style results */
	categories: StyleCategory[];
	/** Default value if property doesn't match any category */
	default?: string | number;
}
