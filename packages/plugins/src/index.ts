/**
 * MapWise Plugins
 *
 * @packageDocumentation
 */

// =============================================================================
// Shared Types & Utilities
// =============================================================================

export type {
	BasePluginConfig,
	PluginEventNames,
	PluginFactory,
} from "./shared/types";

export { createPluginEventName } from "./shared/types";

// Pointer Router
export {
	createPointerRouter,
	type NormalizedPointerEvent,
	type PointerHandlers,
	type PointerRouterOptions,
} from "./shared/pointer-router";

// Keyboard Manager
export {
	createKeyboardManager,
	type KeyboardManager,
	type KeyboardHandler,
	type KeyboardManagerOptions,
} from "@mapwise/core";

// Cursor Manager
export {
	createCursorManager,
	type CursorManager,
} from "@mapwise/core";

// Interaction Mode Store
export {
	createInteractionModeStore,
	type InteractionModeStore,
	type InteractionModeStoreOptions,
} from "@mapwise/core";

// Geometry Helpers
export {
	distanceMeters,
	distanceMetersLine,
	areaSqMeters,
	bbox,
	bboxGeometry,
	pointToSegmentDistanceMeters,
	snapToVertex,
	type GeoJSONPoint,
	type GeoJSONLineString,
	type GeoJSONPolygon,
	type GeoJSONGeometry,
} from "./shared/geometry";

// Error Handler
export {
	safePluginCall,
	safePluginCallAsync,
	type PluginErrorContext,
} from "./shared/error-handler";

// =============================================================================
// Plugin Exports
// =============================================================================

// Inspect Plugin
export { createInspectPlugin } from "./inspect/inspect-plugin";
export type { InspectPluginConfig } from "./inspect/inspect-plugin";

// Draw Plugin
export { createDrawPlugin } from "./draw/draw-plugin";
export type { DrawPluginConfig } from "./draw/draw-plugin";

// Measure Plugin
export { createMeasurePlugin } from "./measure/measure-plugin";
export type { MeasurePluginConfig } from "./measure/measure-plugin";

// Note: Additional plugins (geocoder, sync, etc.) will be exported here as they are implemented.
