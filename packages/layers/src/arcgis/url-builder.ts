/**
 * URL builder for ArcGIS REST Export requests.
 *
 * @module arcgis/url-builder
 */

import { withQuery } from "../shared/url";
import type { ArcGisExportParams } from "./types";

// =============================================================================
// Export URL Builder
// =============================================================================

/**
 * Builds an ArcGIS REST Export request URL.
 *
 * The Export endpoint accepts:
 * - bbox: Bounding box in format "minX,minY,maxX,maxY"
 * - size: Image size in format "width,height"
 * - format: Image format (png, jpg, pdf, etc.)
 * - f: Response format (always "image" for image output)
 * - transparent: true/false for transparency
 * - bboxSR: Bounding box spatial reference (CRS code)
 * - imageSR: Image spatial reference (CRS code)
 * - layers: show/hide specific layers
 * - Additional service-specific parameters
 *
 * @param params - Export parameters
 * @returns Complete Export URL
 *
 * @example
 * ```typescript
 * const url = buildArcGisExportUrl({
 *   serviceUrl: 'https://example.com/arcgis/rest/services/MyLayer/MapServer',
 *   bbox: [-180, -85, 180, 85],
 *   width: 256,
 *   height: 256,
 *   format: 'png32',
 *   transparent: true,
 *   crs: 'EPSG:3857',
 * });
 * ```
 */
export function buildArcGisExportUrl(params: ArcGisExportParams): string {
	const {
		serviceUrl,
		bbox,
		width,
		height,
		layerId,
		format = "png32",
		transparent = true,
		crs = "EPSG:3857",
		extraParams = {},
	} = params;

	// Build base URL - ensure it ends with /export
	let exportUrl = serviceUrl;
	if (!(exportUrl.endsWith("/export") || exportUrl.endsWith("/export/"))) {
		// Remove trailing slash if present
		exportUrl = exportUrl.replace(/\/$/, "");
		exportUrl = `${exportUrl}/export`;
	}

	// Build bbox string: "minX,minY,maxX,maxY"
	const bboxStr = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;

	// Build size string: "width,height"
	const sizeStr = `${width},${height}`;

	// Build query parameters
	const queryParams: Record<string, string> = {
		bbox: bboxStr,
		size: sizeStr,
		format,
		f: "image", // Response format: "image" for image output
		bboxSR: crs, // Bounding box spatial reference
		imageSR: crs, // Image spatial reference
		...extraParams,
	};

	// Add layer ID if specified (using layers parameter with "show:")
	if (layerId !== undefined && layerId !== null) {
		queryParams.layers = `show:${layerId}`;
	}

	// Add transparency if supported by format
	if (transparent && (format.includes("png") || format === "gif")) {
		queryParams.transparent = "true";
	}

	// Build final URL
	return withQuery(exportUrl, queryParams);
}
