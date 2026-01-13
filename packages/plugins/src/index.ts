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
} from "./shared/types.js";

export { createPluginEventName } from "./shared/types.js";

// Pointer Router
export {
	createPointerRouter,
	type NormalizedPointerEvent,
	type PointerHandlers,
	type PointerRouterOptions,
} from "./shared/pointer-router.js";

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
} from "./shared/geometry.js";

// Error Handler
export {
	safePluginCall,
	safePluginCallAsync,
	type PluginErrorContext,
} from "./shared/error-handler.js";

// =============================================================================
// Plugin Exports
// =============================================================================

// Inspect Plugin
export { createInspectPlugin } from "./inspect/inspect-plugin.js";
export type { InspectPluginConfig } from "./inspect/inspect-plugin.js";

// Draw Plugin
export { createDrawPlugin } from "./draw/draw-plugin.js";
export type { DrawPluginConfig } from "./draw/draw-plugin.js";

// Measure Plugin
export { createMeasurePlugin } from "./measure/measure-plugin.js";
export type { MeasurePluginConfig } from "./measure/measure-plugin.js";

// Note: Additional plugins (geocoder, sync, etc.) will be exported here as they are implemented.
export { createSyncViewPlugin } from "./sync/sync-plugin.js";
export type { SyncViewPluginConfig } from "./sync/sync-plugin.js";

export { createGeocoderPlugin } from "./geocoder/geocoder-plugin.js";
export type { GeocoderConfig as GeocoderPluginConfig } from "./geocoder/geocoder-plugin.js";

export { createLayerIngestionPlugin } from "./ingest/ingest-plugin.js";
export type { IngestPluginConfig as LayerIngestionPluginConfig } from "./ingest/ingest-plugin.js";
