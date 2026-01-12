// @ts-nocheck
import type { Map as MapLibreMap, MapGeoJSONFeature, PointLike } from "maplibre-gl";

/**
 * Options for querying features.
 */
export interface FeatureQueryOptions {
	/**
	 * Layers to include in the query.
	 * If undefined, all layers are queried.
	 */
	layers?: string[];

	/**
	 * Pixel buffer around the point to include in the query.
	 * specific for points/lines that are hard to click exactly.
	 *
	 * @default 0
	 */
	hitTolerance?: number;

	/**
	 * Maximum number of features to return.
	 *
	 * @default undefined (no limit)
	 */
	maxFeatures?: number;

	/**
	 * Whether to include raster layers in the result.
	 *
	 * @default false
	 */
	includeRasterLayers?: boolean;

	/**
	 * Custom filter function to further filter features.
	 */
	filter?: (feature: MapGeoJSONFeature) => boolean;
}

/**
 * Query features at a specific point on the map.
 */
export function queryFeatures(
	map: MapLibreMap,
	point: { x: number; y: number },
	options: FeatureQueryOptions = {},
): MapGeoJSONFeature[] {
	const { layers, hitTolerance = 0, maxFeatures, includeRasterLayers = false, filter } = options;

	let geometry: PointLike | [PointLike, PointLike];

	// Create bounding box if tolerance is > 0
	if (hitTolerance > 0) {
		const p1 = { x: point.x - hitTolerance, y: point.y - hitTolerance };
		const p2 = { x: point.x + hitTolerance, y: point.y + hitTolerance };
		geometry = [p1, p2];
	} else {
		geometry = point;
	}

	// Query map features
	const features = map.queryRenderedFeatures(geometry, { layers });

	// Filter results
	let filtered = features.filter((feature) => {
		// Filter raster layers if not included
		if (!includeRasterLayers && feature.layer.type === "raster") {
			return false;
		}

		// Apply custom filter
		if (filter && !filter(feature)) {
			return false;
		}

		return true;
	});

	// Apply max features limit if specified
	if (maxFeatures !== undefined && maxFeatures > 0) {
		filtered = filtered.slice(0, maxFeatures);
	}

	return filtered;
}
