/**
 * MapWise Layers
 *
 * @packageDocumentation
 */

// =============================================================================
// Shared Types & Utilities
// =============================================================================

export type {
	BaseLayerConfig,
	LayerCapabilities,
	LayerValidationError,
	LayerValidationResult,
} from "./shared/types";
export {
	validateBaseLayerConfig,
	validateId,
	validateLayerId,
	validateOpacity,
	validateZoom,
	validateZoomRange,
} from "./shared/validation";
export type { UrlError } from "./shared/url";
export { normalizeUrl, safeUrl, validateSafeUrl, withQuery } from "./shared/url";
export type { FetchOptions, NetworkError } from "./shared/network";
export { fetchText, fetchXml } from "./shared/network";
export type { ParseError } from "./shared/parse";
export { getXmlText, parseXml } from "./shared/parse";
export type { MapLibreError } from "./shared/maplibre";
export {
	ensureLayer,
	ensureSource,
	removeLayerSafe,
	removeSourceSafe,
	setLayerOpacity,
} from "./shared/maplibre";

// =============================================================================
// Layer Factories
// =============================================================================

export { createGeoJsonLayer } from "./geojson/geojson-layer";
export { createXyzRasterLayer } from "./xyz/xyz-layer";
export { createWmsRasterLayer } from "./wms/wms-layer";
export { createWmtsRasterLayer } from "./wmts/wmts-layer";
export { createVectorTileLayer } from "./vectortile/vector-tile-layer";
export {
	createBuildings3DLayer,
	createBuildings3dLayer,
	findCandidateBuildingLayer,
} from "./buildings3d/buildings-3d-layer";
export { createTerrainLayer, enableTerrain } from "./terrain/terrain-layer";
export { createArcGisRestRasterLayer } from "./arcgis/arcgis-raster-layer";
// TODO: Export layer factories as they are implemented
// export { createPmtilesLayer } from "./pmtiles/pmtiles-layer";

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
export type { XyzRasterLayerConfig } from "./xyz/types";
export type {
	WmsRasterLayerConfig,
	WmsCapabilities,
	WmsCapabilityLayer,
	WmsVersion,
	WmsGetMapParams,
	WmsLegendParams,
} from "./wms/types";
export type {
	WmtsRasterLayerConfig,
	WmtsExplicitConfig,
	WmtsCapabilitiesConfig,
	WmtsCapabilities,
	WmtsCapabilityLayer,
	WmtsTileMatrixSet,
	WmtsTileMatrix,
	WmtsMatrixSetSelectionOptions,
	WmtsFormatSelectionOptions,
} from "./wmts/types";
export type {
	VectorTileLayerConfig,
	VectorTileStylePreset,
	VectorTileSimpleStyle,
	ChoroplethStyleOptions,
	CategoricalStyleOptions,
	StyleStop,
	StyleCategory,
} from "./vectortile/types";
export type { Buildings3dLayerConfig, BuildingCandidate } from "./buildings3d/types";
export type { TerrainLayerConfig, HillshadeOptions, EnableTerrainConfig } from "./terrain/types";
export type {
	ArcGisRestRasterLayerConfig,
	ArcGisExportParams,
} from "./arcgis/types";
export type { PersistedWmsRasterLayerConfig } from "./wms/persistence";
export type { PersistedXyzRasterLayerConfig } from "./xyz/persistence";
export type { PersistedArcGisRestRasterLayerConfig } from "./arcgis/persistence";
// TODO: Export layer config types as they are implemented
// export type { PmtilesLayerConfig } from "./pmtiles/types";

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

export { fetchWmsCapabilities, parseWmsCapabilities } from "./wms/capabilities";
export { fetchWmtsCapabilities, parseWmtsCapabilities } from "./wmts/capabilities";
// TODO: Export capabilities utilities as they are implemented

// =============================================================================
// Legend Utilities
// =============================================================================

export { buildWmsLegendUrl } from "./wms/legend";
export { buildWmsTileUrl } from "./wms/url-builder";
export { buildArcGisExportUrl } from "./arcgis/url-builder";
export {
	selectTileMatrixSet,
	selectFormat,
	selectStyle,
	selectResourceUrl,
} from "./wmts/selection";
export { createChoroplethStyle, createCategoricalStyle } from "./vectortile/style-helpers";

// =============================================================================
// Persistence Utilities
// =============================================================================

export { deserializeLayer, getLayerPersistedConfig } from "./persistence";
export {
	toPersistedConfig as toWmsPersistedConfig,
	fromPersistedConfig as fromWmsPersistedConfig,
	validatePersistedConfig as validateWmsPersistedConfig,
} from "./wms/persistence";
export {
	toPersistedConfig as toXyzPersistedConfig,
	fromPersistedConfig as fromXyzPersistedConfig,
	validatePersistedConfig as validateXyzPersistedConfig,
} from "./xyz/persistence";
export {
	toPersistedConfig as toArcGisPersistedConfig,
	fromPersistedConfig as fromArcGisPersistedConfig,
	validatePersistedConfig as validateArcGisPersistedConfig,
} from "./arcgis/persistence";
export {
	LAYER_CONFIG_SCHEMA_VERSION,
	MIN_LAYER_CONFIG_SCHEMA_VERSION,
	createValidationError,
	createValidationWarning,
	migrateLayerConfig,
	validateArray,
	validateNumber,
	validateObject,
	validateRequiredString,
	validateSchemaVersion,
	validateUrl,
} from "./shared/persistence";
export type {
	LayerConfigMigration,
	LayerConfigMigrationInfo,
	LayerValidationError,
	PersistedConfigValidationResult,
	PersistedLayerConfigBase,
} from "./shared/persistence";

// TODO: Export legend utilities as they are implemented
// export { getWmsLegend } from "./wms/legend";
