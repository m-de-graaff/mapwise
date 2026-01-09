/**
 * WMTS capabilities fetching utilities.
 *
 * @module wmts/capabilities/fetch-capabilities
 */

import { fetchXml } from "../../shared/network";
import { parseXml } from "../../shared/parse";
import { withQuery } from "../../shared/url";
import type { WmtsCapabilities } from "../types";
import { parseWmtsCapabilities } from "./parse-capabilities";

// =============================================================================
// Fetch Capabilities
// =============================================================================

/**
 * Fetches and parses WMTS capabilities from a GetCapabilities URL.
 *
 * @param url - WMTS GetCapabilities URL (can include existing params, or base URL)
 * @returns Promise resolving to parsed WMTS capabilities
 *
 * @example
 * ```typescript
 * // From base URL (will add GetCapabilities params)
 * const caps = await fetchWmtsCapabilities('https://example.com/wmts');
 *
 * // From full GetCapabilities URL
 * const caps = await fetchWmtsCapabilities('https://example.com/wmts?REQUEST=GetCapabilities&SERVICE=WMTS&VERSION=1.0.0');
 * ```
 */
export async function fetchWmtsCapabilities(url: string): Promise<WmtsCapabilities> {
	// Ensure URL has GetCapabilities parameters
	let getCapabilitiesUrl = url;

	// Check if URL already has GetCapabilities params
	if (!(url.includes("REQUEST=GetCapabilities") || url.includes("request=GetCapabilities"))) {
		// Build GetCapabilities URL
		getCapabilitiesUrl = withQuery(url, {
			SERVICE: "WMTS",
			REQUEST: "GetCapabilities",
			VERSION: "1.0.0",
		});
	}

	// Fetch and parse XML
	const xmlString = await fetchXml(getCapabilitiesUrl);
	const xmlDoc = parseXml(xmlString);

	// Parse capabilities
	return parseWmtsCapabilities(xmlDoc);
}
