/**
 * Types for 3D buildings layer.
 *
 * @module buildings3d/types
 */

import type { BaseLayerConfig } from "../shared/types";

// =============================================================================
// Buildings 3D Layer Configuration
// =============================================================================

/**
 * Configuration for creating a 3D buildings fill-extrusion layer.
 *
 * This layer creates a MapLibre fill-extrusion layer that can extrude
 * building polygons from a vector tile source to create 3D buildings.
 */
export interface Buildings3dLayerConfig extends BaseLayerConfig {
	/** Source ID that contains the building data */
	sourceId: string;
	/** Source layer name (required for vector sources) */
	sourceLayer: string;
	/** Property name or expression for building height (default value if property not found) */
	heightProperty: string | number;
	/** Optional property name or expression for base height */
	baseProperty?: string | number;
	/** Minimum zoom level to show the extrusion (default: 13) */
	minZoom?: number;
	/** Fill-extrusion color (default: '#aaaaaa') */
	color?: string;
	/** Fill-extrusion opacity (0-1, default: 0.8) */
	opacity?: number;
}

// =============================================================================
// Building Candidate Detection
// =============================================================================

/**
 * A candidate building layer found in a style JSON.
 *
 * This represents a potential building layer that could be used for 3D extrusion.
 */
export interface BuildingCandidate {
	/** Source ID that contains the building data */
	sourceId: string;
	/** Source layer name */
	sourceLayer: string;
	/** Layer ID in the style */
	layerId: string;
	/** Confidence score (0-1) - higher means more likely to be a building layer */
	confidence: number;
	/** Suggested height property name (if detected) */
	heightProperty?: string;
	/** Suggested base property name (if detected) */
	baseProperty?: string;
}
