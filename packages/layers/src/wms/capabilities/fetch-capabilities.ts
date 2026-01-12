/**
 * WMS capabilities fetching utilities.
 *
 * @module wms/capabilities/fetch-capabilities
 */

import { fetchXml } from "../../shared/network";
import { parseXml } from "../../shared/parse";
import { withQuery } from "../../shared/url";
import type { WmsCapabilities } from "../types";
import { parseWmsCapabilities } from "./parse-capabilities";

// =============================================================================
// Fetch Capabilities
// =============================================================================

/**
 * Fetches and parses WMS capabilities from a GetCapabilities URL.
 *
 * @param url - WMS GetCapabilities URL (can include existing params, or base URL)
 * @param options - Optional fetch options including requestTransform for authentication
 * @returns Promise resolving to parsed WMS capabilities
 *
 * @example
 * ```typescript
 * // From base URL (will add GetCapabilities params)
 * const caps = await fetchWmsCapabilities('https://example.com/wms');
 *
 * // From full GetCapabilities URL
 * const caps = await fetchWmsCapabilities('https://example.com/wms?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.3.0');
 *
 * // With authentication
 * const caps = await fetchWmsCapabilities('https://example.com/wms', {
 *   requestTransform: async (url, init) => ({
 *     url,
 *     init: { ...init, headers: { ...init?.headers, 'Authorization': `Bearer ${token}` } }
 *   })
 * });
 * ```
 */
export async function fetchWmsCapabilities(
	url: string,
	options?: {
		requestTransform?: (
			url: string,
			init?: RequestInit,
		) => Promise<{ url: string; init?: RequestInit }> | { url: string; init?: RequestInit };
	},
): Promise<WmsCapabilities> {
	// Ensure URL has GetCapabilities parameters
	let getCapabilitiesUrl = url;

	// Check if URL already has GetCapabilities params
	if (!(url.includes("REQUEST=GetCapabilities") || url.includes("request=GetCapabilities"))) {
		// Build GetCapabilities URL
		getCapabilitiesUrl = withQuery(url, {
			SERVICE: "WMS",
			REQUEST: "GetCapabilities",
			VERSION: "1.3.0", // Try 1.3.0 first, server can respond with different version
		});
	}

	// Fetch and parse XML
	const xmlString = await fetchXml(getCapabilitiesUrl, {
		...(options?.requestTransform ? { requestTransform: options.requestTransform } : {}),
	});
	const xmlDoc = parseXml(xmlString);

	// Parse capabilities
	return parseWmsCapabilities(xmlDoc);
}
