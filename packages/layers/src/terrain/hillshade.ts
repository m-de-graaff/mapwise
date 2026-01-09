/**
 * Hillshade layer helper functions.
 *
 * @module terrain/hillshade
 */

import type { MapLibreLayerDefinition } from "@mapwise/core";
import type { HillshadeLayerSpecification } from "maplibre-gl";
import type { HillshadeOptions } from "./types";

// =============================================================================
// Hillshade Layer Creation
// =============================================================================

/**
 * Configuration for creating a hillshade layer.
 */
export interface HillshadeLayerConfig {
	/** Hillshade layer ID */
	id: string;
	/** DEM source ID to use for hillshade */
	demSourceId: string;
	/** Hillshade options */
	options?: HillshadeOptions;
}

/**
 * Creates a hillshade layer definition that uses a DEM source.
 *
 * Hillshade layers provide visual shading based on terrain elevation,
 * making terrain features more visible.
 *
 * @param config - Hillshade layer configuration
 * @returns LayerDefinition with hillshade layer
 *
 * @example
 * ```typescript
 * const hillshadeLayer = createHillshadeLayer({
 *   id: 'terrain-hillshade',
 *   demSourceId: 'terrain-dem-source',
 *   options: {
 *     exaggeration: 0.5,
 *     opacity: 0.6,
 *     azimuth: 335,
 *     altitude: 45,
 *   },
 * });
 * ```
 */
export function createHillshadeLayer(config: HillshadeLayerConfig): MapLibreLayerDefinition {
	const { id, demSourceId, options = {} } = config;

	// Default hillshade options
	const exaggeration = options.exaggeration ?? 0.5;
	const shadowColor = options.shadowColor ?? "#000000";
	const highlightColor = options.highlightColor ?? "#FFFFFF";
	const azimuth = options.azimuth ?? 335;
	const altitude = options.altitude ?? 45;
	const _opacity = options.opacity ?? 0.6;

	// Create hillshade layer specification
	const layerSpec: HillshadeLayerSpecification = {
		id,
		type: "hillshade",
		source: demSourceId,
		paint: {
			"hillshade-exaggeration": exaggeration,
			"hillshade-shadow-color": shadowColor,
			"hillshade-highlight-color": highlightColor,
			"hillshade-illumination-direction": azimuth,
			"hillshade-illumination-anchor": "viewport",
			"hillshade-illumination-altitude": altitude,
		},
		layout: {
			visibility: "visible",
		},
	};

	// Note: Hillshade doesn't have opacity property directly,
	// but we can use raster-opacity as a workaround if needed
	// However, for hillshade, it's better to adjust exaggeration instead

	return {
		id,
		type: "hillshade",
		category: "overlay",
		layers: [layerSpec],
		metadata: {
			title: "Hillshade",
			toggleable: true,
			opacityAdjustable: false, // Hillshade uses exaggeration, not opacity
		},
	};
}
