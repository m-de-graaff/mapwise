/**
 * Layer and source type definitions for the style manager.
 *
 * @module types/layer
 */

import type { LayerSpecification, SourceSpecification, StyleSpecification } from "maplibre-gl";

// =============================================================================
// Source Types
// =============================================================================

/**
 * A registered source that will be reapplied after basemap changes.
 */
export interface RegisteredSource {
	/** Unique source identifier */
	id: string;
	/** Source specification (GeoJSON, vector, raster, etc.) */
	spec: SourceSpecification;
	/** Order in which source was added (for deterministic reapplication) */
	order: number;
}

// =============================================================================
// Layer Types
// =============================================================================

/**
 * A registered layer that will be reapplied after basemap changes.
 */
export interface RegisteredLayer {
	/** Unique layer identifier */
	id: string;
	/** Full layer specification */
	spec: LayerSpecification;
	/** Source ID this layer depends on (if any) */
	sourceId: string | null;
	/** Order in which layer was added (for deterministic reapplication) */
	order: number;
	/** Optional: ID of layer to insert this layer before */
	beforeId?: string;
}

// =============================================================================
// Feature State
// =============================================================================

/**
 * Represents a feature state entry for restoration after style changes.
 */
export interface RegisteredFeatureState {
	/** Source ID */
	sourceId: string;
	/** Source layer (for vector sources) */
	sourceLayer?: string;
	/** Feature ID */
	featureId: string | number;
	/** State object */
	state: Record<string, unknown>;
}

// =============================================================================
// Style Types
// =============================================================================

/**
 * Style input can be a URL string or a full style specification object.
 */
export type StyleInput = string | StyleSpecification;

/**
 * Options for setBasemap operation.
 */
export interface SetBasemapOptions {
	/**
	 * Timeout in milliseconds for style load.
	 * @default 30000
	 */
	timeout?: number;

	/**
	 * Whether to diff the style and only update changed parts.
	 * When false, performs a full style replace.
	 * @default false
	 */
	diff?: boolean;

	/**
	 * Whether to validate the style before applying.
	 * @default true
	 */
	validate?: boolean;
}

/**
 * Result of a basemap change operation.
 */
export interface SetBasemapResult {
	/** Whether the operation succeeded */
	success: boolean;
	/** Time taken in milliseconds */
	durationMs: number;
	/** Number of layers reapplied */
	reappliedLayers: number;
	/** Number of sources reapplied */
	reappliedSources: number;
	/** Error if operation failed */
	error?: Error;
}

// =============================================================================
// Layer Ordering
// =============================================================================

/**
 * Special positioning constants for layer ordering.
 */
export const LayerPosition = {
	/** Add layer at the top of the layer stack */
	top: undefined,
	/** Add layer at the bottom of the layer stack (above basemap) */
	bottom: "__mapwise_bottom__",
} as const;

export type LayerPositionValue = (typeof LayerPosition)[keyof typeof LayerPosition];
