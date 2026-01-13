/**
 * Types for GeoJSON layer configuration.
 *
 * @module geojson/types
 */

import type { FeatureCollection } from "geojson";
import type { LayerSpecification } from "maplibre-gl";
import type { BaseLayerConfig } from "../shared/types.js";

// =============================================================================
// GeoJSON Data Input
// =============================================================================

/**
 * GeoJSON data can be provided as an object or a URL string.
 */
export type GeoJsonData = FeatureCollection | string;

// =============================================================================
// Clustering Configuration
// =============================================================================

/**
 * Clustering configuration for point features.
 */
export interface ClusterConfig {
	/** Enable clustering */
	enabled: boolean;
	/** Cluster radius in pixels */
	radius?: number;
	/** Maximum zoom level where clustering is applied */
	maxZoom?: number;
	/** Minimum number of points to form a cluster */
	minPoints?: number;
	/** Property name to use for cluster point count */
	clusterProperty?: string;
}

// =============================================================================
// Style Configuration
// =============================================================================

/**
 * Simplified style configuration for common GeoJSON styling.
 */
export interface GeoJsonStyle {
	/** Fill color (for polygons) */
	fillColor?: string;
	/** Fill opacity (0-1) */
	fillOpacity?: number;
	/** Stroke color (for lines and polygons) */
	strokeColor?: string;
	/** Stroke width in pixels */
	strokeWidth?: number;
	/** Stroke opacity (0-1) */
	strokeOpacity?: number;
	/** Circle radius in pixels (for points) */
	circleRadius?: number;
	/** Circle color (for points) */
	circleColor?: string;
	/** Circle opacity (0-1) */
	circleOpacity?: number;

	// Symbol options
	/** Icon image name (sprite) */
	iconImage?: string;
	/** Icon size (scale factor, default 1) */
	iconSize?: number;
	/** Icon rotation in degrees */
	iconRotate?: number | ["get", string];
	/** Allow icon overlap (default false) */
	iconAllowOverlap?: boolean;
	/** Ignore icon placement (default false) */
	iconIgnorePlacement?: boolean;

	/** Text field (label) */
	textField?: string;
	/** Text size (default 12) */
	textSize?: number;
	/** Text color (default #000000) */
	textColor?: string;
	/** Text halo color (default #ffffff) */
	textHaloColor?: string;
	/** Text halo width (default 0) */
	textHaloWidth?: number;
	/** Text anchor (default center) */
	textAnchor?:
		| "center"
		| "left"
		| "right"
		| "top"
		| "bottom"
		| "top-left"
		| "top-right"
		| "bottom-left"
		| "bottom-right";
	/** Text offset (ems) */
	textOffset?: [number, number];
}

/**
 * Style can be a simplified object or raw MapLibre layer specifications.
 */
export type GeoJsonStyleInput = GeoJsonStyle | LayerSpecification[];

// =============================================================================
// GeoJSON Layer Configuration
// =============================================================================

/**
 * Configuration for a GeoJSON layer.
 */
export interface GeoJsonLayerConfig extends BaseLayerConfig {
	/** GeoJSON data (object or URL string) */
	data: GeoJsonData;
	/** Generate IDs for features that lack them */
	generateId?: boolean;
	/** Clustering configuration for point features */
	cluster?: ClusterConfig | boolean;
	/** Style configuration (simplified or raw MapLibre specs) */
	style?: GeoJsonStyleInput;
}

// =============================================================================
// Runtime Operations
// =============================================================================

/**
 * Feature state for selection/hover effects.
 */
export interface FeatureState {
	/** Selected state */
	selected?: boolean;
	/** Hovered state */
	hovered?: boolean;
	/** Custom state properties */
	[key: string]: unknown;
}
