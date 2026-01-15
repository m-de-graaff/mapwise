import maplibregl from "maplibre-gl";
import type { RequestParameters } from "maplibre-gl";

// =============================================================================
// Types
// =============================================================================

/**
 * Function that builds a real HTTP URL for a tile.
 * @param z Zoom level
 * @param x Tile X coordinate
 * @param y Tile Y coordinate
 * @returns The HTTP URL for the image
 */
export type WmtsUrlBuilder = (z: number, x: number, y: number) => string;

// =============================================================================
// State
// =============================================================================

// Registry of source IDs to their URL builders
const sourceRegistry = new Map<string, WmtsUrlBuilder>();

// Track if protocol is registered to avoid duplicate registration
let isProtocolRegistered = false;

// =============================================================================
// Registry Management
// =============================================================================

/**
 * Registers a URL builder for a specific source ID.
 * @param sourceId The source ID (e.g., "my-wmts-source")
 * @param builder The function that generates URLs
 */
export function registerWmtsSource(sourceId: string, builder: WmtsUrlBuilder): void {
	sourceRegistry.set(sourceId, builder);
}

/**
 * Unregisters a source.
 * @param sourceId The source ID to remove
 */
export function unregisterWmtsSource(sourceId: string): void {
	sourceRegistry.delete(sourceId);
}

// =============================================================================
// Protocol Implementation
// =============================================================================

/**
 * Parses a wmts:// URL to extract source ID and coordinates.
 * Format: wmts://<sourceId>/<z>/<x>/<y>
 */
function parseWmtsUrl(url: string): { sourceId: string; z: number; x: number; y: number } | null {
	// Remove protocol
	const path = url.replace(/^wmts:\/\//, "");
	const parts = path.split("/");

	if (parts.length < 4) {
		return null;
	}

	const y = Number.parseInt(parts.pop() || "", 10);
	const x = Number.parseInt(parts.pop() || "", 10);
	const z = Number.parseInt(parts.pop() || "", 10);

	// The rest is the source ID (handles IDs with slashes if any, though unlikely)
	const sourceId = parts.join("/");

	if (Number.isNaN(z) || Number.isNaN(x) || Number.isNaN(y)) {
		return null;
	}

	return { sourceId, z, x, y };
}

/**
 * MapLibre protocol handler for wmts://
 */
async function wmtsProtocolHandler(
	request: RequestParameters,
	_abortController: AbortController,
): Promise<{ data: ArrayBuffer; cacheControl?: string; expires?: string }> {
	const parsed = parseWmtsUrl(request.url);
	if (!parsed) {
		throw new Error(`Invalid WMTS URL format: ${request.url}`);
	}

	const { sourceId, z, x, y } = parsed;
	const builder = sourceRegistry.get(sourceId);

	if (!builder) {
		throw new Error(`No WMTS builder registered for source: ${sourceId}`);
	}

	// Generate real URL
	const realUrl = builder(z, x, y);

	// Fetch data
	const response = await fetch(realUrl, {
		headers: request.headers,
		signal: _abortController.signal,
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch tile: ${response.statusText}`);
	}

	const buffer = await response.arrayBuffer();

	const result: { data: ArrayBuffer; cacheControl?: string; expires?: string } = {
		data: buffer,
	};

	const cacheControl = response.headers.get("Cache-Control");
	if (cacheControl) {
		result.cacheControl = cacheControl;
	}

	const expires = response.headers.get("Expires");
	if (expires) {
		result.expires = expires;
	}

	return result;
}

/**
 * Adapter to match MapLibre's addProtocol signature.
 * MapLibre v2+ expects a promise-based handler for async protocols.
 */
// biome-ignore lint/suspicious/noExplicitAny: MapLibre protocol types are complex
const protocolAdapter = (request: RequestParameters, abortController: AbortController) => {
	return wmtsProtocolHandler(request, abortController);
};

/**
 * Registers the wmts:// protocol with MapLibre.
 * Safe to call multiple times.
 */
export function registerWmtsProtocol(): void {
	if (isProtocolRegistered) {
		return;
	}

	try {
		// @ts-ignore - maplibregl.addProtocol might not be in all type definitions
		maplibregl.addProtocol("wmts", protocolAdapter);
		isProtocolRegistered = true;
	} catch (e) {
		console.warn(
			"Failed to register WMTS protocol. It might already be registered or MapLibre is not available.",
			e,
		);
	}
}
