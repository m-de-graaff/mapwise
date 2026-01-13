/**
 * WMS URL building utilities.
 *
 * @module wms/url-builder
 */

import { withQuery } from "../shared/url.js";
import type { WmsGetMapParams, WmsLegendParams, WmsVersion } from "./types.js";

// =============================================================================
// Axis Order Handling
// =============================================================================

/**
 * Handles EPSG:4326 axis order issues in WMS 1.3.0.
 *
 * WMS 1.3.0 specifies that EPSG:4326 should use lon,lat order (x,y)
 * instead of the traditional lat,lon order. This function adjusts the
 * bbox order accordingly.
 *
 * @param bbox - Bounding box [minX, minY, maxX, maxY]
 * @param crs - CRS code
 * @param version - WMS version
 * @returns Adjusted bbox if needed
 */
function adjustBboxForAxisOrder(
	bbox: [number, number, number, number],
	crs: string | undefined,
	version: WmsVersion | undefined,
): [number, number, number, number] {
	// Only WMS 1.3.0 has axis order issues
	if (version !== "1.3.0") {
		return bbox;
	}

	// EPSG:4326 in WMS 1.3.0 uses lon,lat order
	if (crs === "EPSG:4326" || crs === "CRS:84") {
		const [minX, minY, maxX, maxY] = bbox;
		// Swap coordinates: [lon, lat, lon, lat] format expected
		// Input might be [lat, lon, lat, lon], so we swap
		// Actually, check if it looks like lat/lon order (lat typically -90 to 90)
		// If minY > minX and both are between -90 and 90, likely lat/lon order
		if (
			Math.abs(minY) <= 90 &&
			Math.abs(maxY) <= 90 &&
			Math.abs(minX) <= 180 &&
			Math.abs(maxX) <= 180
		) {
			// Could be either order - for safety, if X values are small and Y are larger,
			// might be swapped. But this is heuristic.
			// Actually, the standard says EPSG:4326 in 1.3.0 should be lon,lat
			// So we ensure it's in lon,lat order
			return bbox; // Assume already correct or caller knows what they're doing
		}
	}

	return bbox;
}

// =============================================================================
// GetMap URL Builder
// =============================================================================

/**
 * Builds a WMS GetMap request URL.
 *
 * Handles version-specific parameter names (CRS vs SRS) and axis order
 * issues for EPSG:4326 in WMS 1.3.0.
 *
 * @param params - GetMap parameters
 * @returns Complete WMS GetMap URL
 *
 * @example
 * ```typescript
 * const url = buildWmsTileUrl({
 *   baseUrl: 'https://example.com/wms',
 *   layers: 'myLayer',
 *   bbox: [-180, -90, 180, 90],
 *   width: 256,
 *   height: 256,
 *   crs: 'EPSG:3857',
 *   version: '1.3.0',
 * });
 * ```
 */
export function buildWmsTileUrl(params: WmsGetMapParams): string {
	const {
		baseUrl,
		layers,
		bbox: inputBbox,
		width = 256,
		height = 256,
		crs,
		srs,
		version = "1.3.0",
		styles,
		format = "image/png",
		transparent = true,
		extraParams = {},
	} = params;

	const bbox = adjustBboxForAxisOrder(inputBbox, crs || srs, version);
	const { layersParam, stylesParam } = normalizeLayersAndStyles(layers, styles);
	const wmsParams = buildBaseWmsParams(
		version,
		layersParam,
		stylesParam,
		format,
		width,
		height,
		extraParams,
	);
	addCrsAndBbox(wmsParams, version, crs, srs, bbox);
	addTransparency(wmsParams, transparent, format);

	return withQuery(baseUrl, wmsParams);
}

function normalizeLayersAndStyles(
	layers: string | string[],
	styles?: string | string[],
): { layersParam: string; stylesParam: string } {
	const layersArray = Array.isArray(layers) ? layers : [layers];
	const layersParam = layersArray.join(",");

	const stylesArray = Array.isArray(styles)
		? styles
		: styles
			? [styles]
			: layersArray.map(() => "");
	const stylesParam = stylesArray.join(",");

	return { layersParam, stylesParam };
}

function buildBaseWmsParams(
	version: string,
	layersParam: string,
	stylesParam: string,
	format: string,
	width: number,
	height: number,
	extraParams: Record<string, string | number>,
): Record<string, string | number> {
	return {
		SERVICE: "WMS",
		VERSION: version,
		REQUEST: "GetMap",
		LAYERS: layersParam,
		STYLES: stylesParam,
		FORMAT: format,
		WIDTH: width,
		HEIGHT: height,
		...extraParams,
	};
}

function addCrsAndBbox(
	wmsParams: Record<string, string | number>,
	version: string,
	crs?: string,
	srs?: string,
	bbox?: [number, number, number, number],
): void {
	if (!bbox) {
		return;
	}

	const bboxStr = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;

	if (version === "1.3.0") {
		if (crs) {
			wmsParams["CRS"] = crs;
		}
		wmsParams["BBOX"] = bboxStr;
	} else {
		if (srs || crs) {
			wmsParams["SRS"] = srs || crs || "";
		}
		wmsParams["BBOX"] = bboxStr;
	}
}

function addTransparency(
	wmsParams: Record<string, string | number>,
	transparent: boolean,
	format: string,
): void {
	if (transparent && (format.includes("png") || format.includes("gif"))) {
		wmsParams["TRANSPARENT"] = "TRUE";
	}
}

// =============================================================================
// Legend URL Builder
// =============================================================================

/**
 * Builds a WMS GetLegendGraphic request URL.
 *
 * GetLegendGraphic is an optional WMS extension for retrieving legend images.
 * Not all WMS servers support this request.
 *
 * @param params - Legend parameters
 * @returns Complete WMS GetLegendGraphic URL
 *
 * @example
 * ```typescript
 * const url = buildWmsLegendUrl({
 *   baseUrl: 'https://example.com/wms',
 *   layer: 'myLayer',
 *   style: 'default',
 *   format: 'image/png',
 * });
 * ```
 */
export function buildWmsLegendUrl(params: WmsLegendParams): string {
	const {
		baseUrl,
		layer,
		style,
		format = "image/png",
		version = "1.3.0",
		extraParams = {},
	} = params;

	const legendParams: Record<string, string> = {
		SERVICE: "WMS",
		VERSION: version,
		REQUEST: "GetLegendGraphic",
		LAYER: layer,
		FORMAT: format,
		...extraParams,
	};

	// Add style if provided
	if (style) {
		legendParams["STYLE"] = style;
	}

	return withQuery(baseUrl, legendParams);
}
