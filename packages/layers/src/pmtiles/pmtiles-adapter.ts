import maplibregl from "maplibre-gl";

// ... existing code ...

/**
 * Error thrown when PMTiles library is not installed.
 */
export class PmtilesNotInstalledError extends Error {
	constructor() {
		super("PMTiles support requires 'pmtiles' package. Install it with: pnpm add pmtiles");
		this.name = "PmtilesNotInstalledError";
	}
}

/**
 * Checks if PMTiles library is available.
 *
 * @returns true if PMTiles is available, false otherwise
 */
export function isPmtilesAvailable(): boolean {
	try {
		// Try to dynamically import PMTiles
		// We use a function that will be called at runtime to check availability
		return typeof window !== "undefined" && "pmtiles" in window;
	} catch {
		return false;
	}
}

/**
 * Registers the PMTiles protocol handler with MapLibre.
 *
 * This should be called once before using PMTiles layers.
 *
 * @throws PmtilesNotInstalledError if PMTiles library is not available
 */
export async function registerPmtilesProtocol(): Promise<void> {
	try {
		// Standard dynamic import to ensure bundler support
		// @ts-ignore - Optional dependency
		// biome-ignore lint/suspicious/noExplicitAny: Dynamic import type
		const pmtilesModule = (await import("pmtiles")) as any;

		if (pmtilesModule.Protocol) {
			const protocol = new pmtilesModule.Protocol();
			maplibregl.addProtocol("pmtiles", (request, abortController) => {
				// MapLibre v2+ / v4+ / v5 expects a promise or cancellation object
				// v5 specifically looks for a Promise return for async protocols
				// The pmtiles library uses a callback style, so we wrap it
				return new Promise((resolve, reject) => {
					// Bind the tile method to the protocol instance to ensure 'this' context is preserved
					// biome-ignore lint/suspicious/noExplicitAny: Library callback type
					const cancelable = protocol.tile.bind(protocol)(request, (err: any, data: any) => {
						if (err) {
							console.error("PMTiles Error for URL:", request.url, err);
							reject(err);
						} else if (data?.data) {
							// If data has a 'data' property (binary), returns it wrapped
							// If data is just JSON (metadata), wrap it in { data: ... }
							resolve({
								data: data.data,
								cacheControl: data.cacheControl,
								expires: data.expires,
							});
						} else {
							resolve({ data: data });
						}
					});

					// Handle abort signal from MapLibre
					if (abortController?.signal) {
						abortController.signal.addEventListener("abort", () => {
							if (cancelable && typeof cancelable.cancel === "function") {
								cancelable.cancel();
							}
						});
					}
				});
			});
		} else if (typeof pmtilesModule.registerProtocol === "function") {
			// Legacy support
			pmtilesModule.registerProtocol();
		} else if (typeof pmtilesModule.default?.registerProtocol === "function") {
			// Limited legacy support
			pmtilesModule.default.registerProtocol();
		} else {
			throw new PmtilesNotInstalledError();
		}
	} catch (error) {
		// If import fails, check if it's a module not found error
		if (
			error instanceof Error &&
			(error.message.includes("Cannot find module") ||
				error.message.includes("Failed to fetch") ||
				error.message.includes("pmtiles") ||
				error.message.includes("Cannot resolve") ||
				error.message.includes("Failed to resolve") ||
				error.name === "TypeError")
		) {
			throw new PmtilesNotInstalledError();
		}
		throw error;
	}
}

/**
 * PMTiles header information
 */
export interface PmtilesHeader {
	specVersion: number;
	rootDirectoryOffset: number;
	rootDirectoryLength: number;
	jsonMetadataOffset: number;
	jsonMetadataLength: number;
	leafDirectoryOffset: number;
	leafDirectoryLength: number;
	tileDataOffset: number;
	tileDataLength: number;
	numAddressedTiles: number;
	numTileEntries: number;
	numTileContents: number;
	clustered: boolean;
	internalCompression: number;
	tileCompression: number;
	tileType: number;
	minZoom: number;
	maxZoom: number;
	minLon: number;
	minLat: number;
	maxLon: number;
	maxLat: number;
	centerZoom: number;
	centerLon: number;
	centerLat: number;
}

/**
 * PMTiles vector layer metadata
 */
export interface PmtilesVectorLayer {
	id: string;
	fields: Record<string, string>;
	description?: string;
	minzoom?: number;
	maxzoom?: number;
}

/**
 * PMTiles content metadata
 */
export interface PmtilesMetadata {
	vector_layers?: PmtilesVectorLayer[];
	tilestats?: unknown;
	minzoom?: number;
	maxzoom?: number;
	name?: string;
	description?: string;
	version?: string;
	type?: string;
	attribution?: string;
	[key: string]: unknown;
}

/**
 * Fetches PMTiles header and metadata.
 *
 * @param url - URL to PMTiles file
 * @returns Promise resolving to header and metadata
 */
export async function getPmtilesInfo(
	url: string,
): Promise<{ header: PmtilesHeader; metadata: PmtilesMetadata }> {
	try {
		// @ts-ignore
		// biome-ignore lint/suspicious/noExplicitAny: Dynamic import type
		const pmtilesModule = (await import("pmtiles")) as any;

		// Remove pmtiles:// prefix if present to pass to PMTiles constructor?
		// Wait, PMTiles constructor expects http url or file source.
		// If we pass pmtiles:// it might fail if the library doesn't expect it.
		// The protocol handler in MapLibre handles pmtiles://.
		// The PMTiles class (from usage) usually takes a fetch-able URL.
		const cleanUrl = url.replace(/^pmtiles:\/\//, "");

		const p = new pmtilesModule.PMTiles(cleanUrl);
		const header = await p.getHeader();
		const metadata = await p.getMetadata();

		return { header, metadata };
	} catch (error) {
		if (
			error instanceof Error &&
			(error.message.includes("Cannot find module") || error.message.includes("pmtiles"))
		) {
			throw new PmtilesNotInstalledError();
		}
		throw error;
	}
}

/**
 * Converts a regular URL to a PMTiles protocol URL.
 *
 * @param url - Regular URL to PMTiles file
 * @returns PMTiles protocol URL (pmtiles://...)
 */
export function toPmtilesUrl(url: string): string {
	// If already pmtiles://, return as-is
	if (url.startsWith("pmtiles://")) {
		return url;
	}

	// Prepend pmtiles:// to the original URL
	// This creates pmtiles://https://example.com/... which handles absolute URLs correctly
	return `pmtiles://${url}`;
}
