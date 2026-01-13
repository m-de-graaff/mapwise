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
	LayerValidationResult,
} from "./shared/types.js";
export {
	validateBaseLayerConfig,
	validateId,
	validateLayerId,
	validateOpacity,
	validateZoom,
	validateZoomRange,
} from "./shared/validation.js";
export type { UrlError } from "./shared/url.js";
export { normalizeUrl, safeUrl, validateSafeUrl, withQuery } from "./shared/url.js";
export type { FetchOptions, NetworkError } from "./shared/network.js";
export { fetchText, fetchXml } from "./shared/network.js";
export type { ParseError } from "./shared/parse.js";
export { getXmlText, parseXml } from "./shared/parse.js";
export type { MapLibreError } from "./shared/maplibre.js";
export {
	ensureLayer,
	ensureSource,
	removeLayerSafe,
	removeSourceSafe,
	setLayerOpacity,
} from "./shared/maplibre.js";

// =============================================================================
// Layer Factories
// =============================================================================

export { createGeoJsonLayer } from "./geojson/geojson-layer.js";
export { createXyzRasterLayer } from "./xyz/xyz-layer.js";
export { createWmsRasterLayer } from "./wms/wms-layer.js";
export { createWmtsRasterLayer } from "./wmts/wmts-layer.js";
export { createVectorTileLayer } from "./vectortile/vector-tile-layer.js";
export {
	createBuildings3DLayer,
	createBuildings3dLayer,
	findCandidateBuildingLayer,
} from "./buildings3d/buildings-3d-layer.js";
export { createTerrainLayer, enableTerrain } from "./terrain/terrain-layer.js";
export { createArcGisRestRasterLayer } from "./arcgis/arcgis-raster-layer.js";
export { createHeatmapLayer } from "./heatmap/heatmap-layer.js";
// TODO: Export layer factories as they are implemented
// export { createPmtilesLayer } from "./pmtiles/pmtiles-layer.js";
export { createPmtilesLayer } from "./pmtiles/pmtiles-layer.js";
export { getPmtilesInfo } from "./pmtiles/pmtiles-adapter.js";

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
} from "./geojson/types.js";
export type { XyzRasterLayerConfig } from "./xyz/types.js";
export type {
	WmsRasterLayerConfig,
	WmsCapabilities,
	WmsCapabilityLayer,
	WmsVersion,
	WmsGetMapParams,
	WmsLegendParams,
} from "./wms/types.js";
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
} from "./wmts/types.js";
export type {
	VectorTileLayerConfig,
	VectorTileStylePreset,
	VectorTileSimpleStyle,
	ChoroplethStyleOptions,
	CategoricalStyleOptions,
	StyleStop,
	StyleCategory,
} from "./vectortile/types.js";
export type { Buildings3dLayerConfig, BuildingCandidate } from "./buildings3d/types.js";
export type { TerrainLayerConfig, HillshadeOptions, EnableTerrainConfig } from "./terrain/types.js";
export type {
	ArcGisRestRasterLayerConfig,
	ArcGisExportParams,
} from "./arcgis/types.js";
export type { PersistedWmsRasterLayerConfig } from "./wms/persistence.js";
export type { PersistedXyzRasterLayerConfig } from "./xyz/persistence.js";
export type { PersistedArcGisRestRasterLayerConfig } from "./arcgis/persistence.js";
// TODO: Export layer config types as they are implemented
// export type { PmtilesLayerConfig } from "./pmtiles/types.js";
export type {
	PmtilesHeader,
	PmtilesMetadata,
	PmtilesVectorLayer,
} from "./pmtiles/pmtiles-adapter.js";
export type { PmtilesLayerConfig } from "./pmtiles/types.js";
export type {
	HeatmapLayerConfig,
	HeatmapInputData,
	HeatmapStyle,
} from "./heatmap/heatmap-layer.js";

// =============================================================================
// Layer Utilities
// =============================================================================

export { getGeoJsonBounds, fitToGeoJson } from "./geojson/bounds.js";
export {
	setData,
	setFeatureState,
	getFeatureState,
	removeFeatureState,
} from "./geojson/operations.js";

// =============================================================================
// Capabilities Utilities
// =============================================================================

export { fetchWmsCapabilities, parseWmsCapabilities } from "./wms/capabilities/index.js";
export { fetchWmtsCapabilities, parseWmtsCapabilities } from "./wmts/capabilities/index.js";
// TODO: Export capabilities utilities as they are implemented

// =============================================================================
// Legend Utilities
// =============================================================================

export { buildWmsLegendUrl } from "./wms/legend.js";
export { buildWmsTileUrl } from "./wms/url-builder.js";
export { buildArcGisExportUrl } from "./arcgis/url-builder.js";
export {
	selectTileMatrixSet,
	selectFormat,
	selectStyle,
	selectResourceUrl,
} from "./wmts/selection.js";
export { createChoroplethStyle, createCategoricalStyle } from "./vectortile/style-helpers.js";

// =============================================================================
// Persistence Utilities
// =============================================================================

export { deserializeLayer, getLayerPersistedConfig } from "./persistence.js";
export {
	toPersistedConfig as toWmsPersistedConfig,
	fromPersistedConfig as fromWmsPersistedConfig,
	validatePersistedConfig as validateWmsPersistedConfig,
} from "./wms/persistence.js";
export {
	toPersistedConfig as toXyzPersistedConfig,
	fromPersistedConfig as fromXyzPersistedConfig,
	validatePersistedConfig as validateXyzPersistedConfig,
} from "./xyz/persistence.js";
export {
	toPersistedConfig as toArcGisPersistedConfig,
	fromPersistedConfig as fromArcGisPersistedConfig,
	validatePersistedConfig as validateArcGisPersistedConfig,
} from "./arcgis/persistence.js";
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
} from "./shared/persistence.js";
export type {
	LayerConfigMigration,
	LayerConfigMigrationInfo,
	LayerValidationError,
	PersistedConfigValidationResult,
	PersistedLayerConfigBase,
} from "./shared/persistence.js";

// TODO: Export legend utilities as they are implemented
// export { getWmsLegend } from "./wms/legend.js";
