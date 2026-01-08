/**
 * MapWise Layers
 *
 * @packageDocumentation
 */

// =============================================================================
// Shared Types & Utilities
// =============================================================================

export * from "./shared";

// =============================================================================
// Layer Factories
// =============================================================================

export { createGeoJsonLayer } from "./geojson/geojson-layer";
// TODO: Export layer factories as they are implemented
// export { createWmsLayer } from "./wms/wms-layer";
// export { createWmtsLayer } from "./wmts/wmts-layer";
// export { createVectorTileLayer } from "./vectortile/vector-tile-layer";
// export { createPmtilesLayer } from "./pmtiles/pmtiles-layer";
// export { createTerrainLayer } from "./terrain/terrain-layer";
// export { createBuildings3dLayer } from "./buildings3d/buildings-3d-layer";
// export { createXyzLayer } from "./xyz/xyz-layer";

// =============================================================================
// Layer Types
// =============================================================================

export type {
	GeoJsonLayerConfig,
	GeoJsonData,
	ClusterConfig,
	GeoJsonStyle,
	GeoJsonStyleInput,
	FeatureState,
} from "./geojson/types";
// TODO: Export layer config types as they are implemented
// export type { WmsLayerConfig } from "./wms/types";
// export type { WmtsLayerConfig } from "./wmts/types";
// export type { VectorTileLayerConfig } from "./vectortile/types";
// export type { PmtilesLayerConfig } from "./pmtiles/types";
// export type { TerrainLayerConfig } from "./terrain/types";
// export type { Buildings3dLayerConfig } from "./buildings3d/types";
// export type { XyzLayerConfig } from "./xyz/types";

// =============================================================================
// Layer Utilities
// =============================================================================

export { getGeoJsonBounds, fitToGeoJson } from "./geojson/bounds";
export {
	setData,
	setFeatureState,
	getFeatureState,
	removeFeatureState,
} from "./geojson/operations";

// =============================================================================
// Capabilities Utilities
// =============================================================================

// TODO: Export capabilities utilities as they are implemented
// export { fetchWmsCapabilities, parseWmsCapabilities } from "./wms/capabilities";
// export { fetchWmtsCapabilities, parseWmtsCapabilities } from "./wmts/capabilities";

// =============================================================================
// Legend Utilities
// =============================================================================

// TODO: Export legend utilities as they are implemented
// export { getWmsLegend } from "./wms/legend";
