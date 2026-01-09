/**
 * Central persistence utilities for all layer types.
 *
 * @module persistence
 */

import type { LayerDefinition } from "@mapwise/core";
import { createArcGisRestRasterLayer } from "./arcgis/arcgis-raster-layer";
import { fromPersistedConfig as fromArcGisPersistedConfig } from "./arcgis/persistence";
import type { PersistedLayerConfigBase } from "./shared/persistence";
import { fromPersistedConfig as fromWmsPersistedConfig } from "./wms/persistence";
import { createWmsRasterLayer } from "./wms/wms-layer";
import { fromPersistedConfig as fromXyzPersistedConfig } from "./xyz/persistence";
import { createXyzRasterLayer } from "./xyz/xyz-layer";

// =============================================================================
// Layer Type Registry
// =============================================================================

/**
 * Deserialize a persisted layer config and recreate the layer.
 * This function routes to the appropriate deserializer based on layer type.
 *
 * @param persisted - Persisted layer configuration
 * @returns Recreated layer definition
 * @throws Error if layer type is not recognized or config is invalid
 *
 * @example
 * ```typescript
 * const persistedConfig = {
 *   _version: 1,
 *   _type: "wms-raster",
 *   id: "my-layer",
 *   baseUrl: "https://example.com/wms",
 *   layers: "mylayer",
 * };
 *
 * const layer = deserializeLayer(persistedConfig);
 * layerRegistry.registerLayer(layer);
 * ```
 */
export function deserializeLayer(persisted: PersistedLayerConfigBase): LayerDefinition {
	const type = persisted["_type"];

	switch (type) {
		case "wms-raster": {
			const { config } = fromWmsPersistedConfig(persisted);
			return createWmsRasterLayer(config);
		}
		case "xyz-raster": {
			const { config } = fromXyzPersistedConfig(persisted);
			return createXyzRasterLayer(config);
		}
		case "arcgis-raster": {
			const { config } = fromArcGisPersistedConfig(persisted);
			return createArcGisRestRasterLayer(config);
		}
		// TODO: Add remaining layer types
		// case "wmts-raster": ...
		// case "geojson-points": ...
		// case "geojson-lines": ...
		// case "geojson-polygons": ...
		// case "vectortile": ...
		// case "terrain": ...
		// case "buildings3d": ...
		default:
			throw new Error(`Unknown layer type: ${type}`);
	}
}

/**
 * Get the persisted config from a layer definition if it supports it.
 *
 * @param layer - Layer definition
 * @returns Persisted config or undefined if layer doesn't support persistence
 */
export function getLayerPersistedConfig(layer: LayerDefinition): unknown | undefined {
	const layerWithPersistence = layer as LayerDefinition & {
		getPersistedConfig?: () => unknown;
	};

	return layerWithPersistence.getPersistedConfig?.();
}
