/**
 * Internal types for WMS capabilities XML parsing.
 *
 * @module wms/capabilities/wms-types
 */

// =============================================================================
// XML Namespace and Structure
// =============================================================================

/**
 * WMS namespace URIs by version.
 */
export const WMS_NAMESPACES = {
	"1.1.1": "http://www.opengis.net/wms",
	"1.3.0": "http://www.opengis.net/wms",
} as const;

/**
 * Common XML namespaces used in WMS capabilities.
 */
export const XML_NAMESPACES = {
	wms: "http://www.opengis.net/wms",
	ows: "http://www.opengis.net/ows/1.1",
	xlink: "http://www.w3.org/1999/xlink",
} as const;
