/**
 * Registry type definitions for layers and sources.
 *
 * @module registry/registry-types
 */

import type { LayerSpecification, Map as MapLibreMap, SourceSpecification } from "maplibre-gl";

// =============================================================================
// Layer Category
// =============================================================================

/**
 * Layer categories for z-order grouping.
 * Layers are rendered in this order (bottom to top):
 * 1. basemap (managed by map style, not registry)
 * 2. base - below other custom layers
 * 3. overlay - default, above base layers
 * 4. annotation - labels, markers, always on top
 */
export type LayerCategory = "base" | "overlay" | "annotation";

// =============================================================================
// Layer Positioning
// =============================================================================

/**
 * Specifies where to position a layer in the stack.
 */
export type LayerPosition =
	| { type: "top" }
	| { type: "bottom" }
	| { type: "above"; layerId: string }
	| { type: "below"; layerId: string }
	| { type: "index"; index: number };

/**
 * Helper to create layer position values.
 */
export const Position = {
	top: (): LayerPosition => ({ type: "top" }),
	bottom: (): LayerPosition => ({ type: "bottom" }),
	above: (layerId: string): LayerPosition => ({ type: "above", layerId }),
	below: (layerId: string): LayerPosition => ({ type: "below", layerId }),
	at: (index: number): LayerPosition => ({ type: "index", index }),
} as const;

// =============================================================================
// Layer Metadata
// =============================================================================

/**
 * Optional metadata attached to a layer.
 */
export interface LayerMetadata {
	/** Human-readable title */
	title?: string;
	/** Description of the layer */
	description?: string;
	/** Attribution/credits */
	attribution?: string;
	/** Legend configuration (opaque, interpreted by UI) */
	legend?: unknown;
	/** Whether layer is initially visible */
	initialVisibility?: boolean;
	/** Initial opacity (0-1) */
	initialOpacity?: number;
	/** Whether the layer can be toggled by users */
	toggleable?: boolean;
	/** Whether opacity can be adjusted by users */
	opacityAdjustable?: boolean;
	/** Minimum zoom level where layer is shown */
	minZoom?: number;
	/** Maximum zoom level where layer is shown */
	maxZoom?: number;
	/** Custom data (passthrough for app-specific needs) */
	custom?: Record<string, unknown>;
}

// =============================================================================
// Source Definition
// =============================================================================

/**
 * A source definition for the registry.
 */
export interface SourceDefinition {
	/** Unique source identifier */
	id: string;
	/** MapLibre source specification */
	spec: SourceSpecification;
}

// =============================================================================
// Layer Definition (MapLibre-based)
// =============================================================================

/**
 * A layer definition using MapLibre specifications.
 * Use this when you have standard MapLibre layer/source specs.
 */
export interface MapLibreLayerDefinition {
	/** Unique layer identifier (stable across sessions) */
	id: string;
	/** Layer type identifier (opaque string for categorization) */
	type: string;
	/** Layer category for z-order grouping */
	category?: LayerCategory;
	/** Optional source definition (if layer needs its own source) */
	source?: SourceDefinition;
	/** MapLibre layer specifications (can be multiple for complex layers) */
	layers: LayerSpecification[];
	/** Layer metadata */
	metadata?: LayerMetadata;
}

// =============================================================================
// Layer Definition (Custom handlers)
// =============================================================================

/**
 * Context provided to custom layer handlers.
 */
export interface LayerHandlerContext {
	/** The MapLibre map instance */
	map: MapLibreMap;
	/** Generate a unique ID prefixed with layer ID */
	generateId: (suffix: string) => string;
}

/**
 * A layer definition using custom apply/remove handlers.
 * Use this for complex layers that need custom logic.
 */
export interface CustomLayerDefinition {
	/** Unique layer identifier (stable across sessions) */
	id: string;
	/** Layer type identifier (opaque string for categorization) */
	type: string;
	/** Layer category for z-order grouping */
	category?: LayerCategory;
	/** Layer metadata */
	metadata?: LayerMetadata;
	/** IDs of sources this layer uses (for dependency tracking) */
	sourceIds?: string[];
	/** IDs of MapLibre layers this definition manages */
	managedLayerIds?: string[];
	/**
	 * Apply the layer to the map.
	 * Called when layer is added or map style reloads.
	 */
	apply: (ctx: LayerHandlerContext) => void | Promise<void>;
	/**
	 * Remove the layer from the map.
	 * Called when layer is unregistered or before style reload.
	 */
	remove: (ctx: LayerHandlerContext) => void | Promise<void>;
	/**
	 * Set layer visibility (optional, for layers that support it).
	 */
	setVisibility?: (ctx: LayerHandlerContext, visible: boolean) => void;
	/**
	 * Set layer opacity (optional, for layers that support it).
	 */
	setOpacity?: (ctx: LayerHandlerContext, opacity: number) => void;
}

// =============================================================================
// Unified Layer Definition
// =============================================================================

/**
 * A layer definition - either MapLibre-based or custom.
 */
export type LayerDefinition = MapLibreLayerDefinition | CustomLayerDefinition;

/**
 * Type guard to check if definition uses custom handlers.
 */
export function isCustomLayerDefinition(def: LayerDefinition): def is CustomLayerDefinition {
	return "apply" in def && typeof def.apply === "function";
}

/**
 * Type guard to check if definition uses MapLibre specs.
 */
export function isMapLibreLayerDefinition(def: LayerDefinition): def is MapLibreLayerDefinition {
	return "layers" in def && Array.isArray(def.layers);
}

// =============================================================================
// Layer State
// =============================================================================

/**
 * Runtime state of a registered layer.
 */
export interface LayerState {
	/** Layer ID */
	id: string;
	/** Layer type */
	type: string;
	/** Layer category */
	category: LayerCategory;
	/** Whether layer is currently visible */
	visible: boolean;
	/** Current opacity (0-1) */
	opacity: number;
	/** Whether layer is currently applied to map */
	applied: boolean;
	/** Z-order index in registry (0 = bottom) */
	order: number;
	/** Layer metadata */
	metadata: LayerMetadata;
	/** Error if layer failed to apply */
	error?: string | undefined;
}

// =============================================================================
// Registry Events
// =============================================================================

/**
 * Event emitted when layer state changes.
 */
export interface LayerStateChangeEvent {
	layerId: string;
	state: LayerState;
	change: "added" | "removed" | "visibility" | "opacity" | "order" | "error" | "applied";
}

// =============================================================================
// Registry Options
// =============================================================================

/**
 * Options for registering a layer.
 */
export interface RegisterLayerOptions {
	/** Where to position the layer in the stack */
	position?: LayerPosition;
	/** Override initial visibility from metadata */
	visible?: boolean;
	/** Override initial opacity from metadata */
	opacity?: number;
}
