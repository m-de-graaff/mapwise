/**
 * PMTiles protocol handler adapter.
 *
 * This module handles optional PMTiles dependency and protocol registration.
 *
 * @module pmtiles/pmtiles-adapter
 */

/**
 * Error thrown when PMTiles library is not installed.
 */
export class PmtilesNotInstalledError extends Error {
	constructor() {
		super(
			"PMTiles support requires '@protomaps/pmtiles' package. Install it with: pnpm add @protomaps/pmtiles",
		);
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
	// Dynamic import of PMTiles
	// Using Function constructor to avoid Vite/build tool static analysis
	// since @protomaps/pmtiles is an optional dependency
	try {
		// Use Function constructor to create a dynamic import that build tools won't analyze
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const dynamicImport = new Function("specifier", "return import(specifier)");
		const pmtilesModule = (await dynamicImport("@protomaps/pmtiles")) as {
			registerProtocol?: () => void;
			default?: {
				registerProtocol?: () => void;
			};
		};

		// Check if registerProtocol exists
		if (typeof pmtilesModule.registerProtocol === "function") {
			pmtilesModule.registerProtocol();
		} else if (typeof pmtilesModule.default?.registerProtocol === "function") {
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
				error.message.includes("@protomaps/pmtiles") ||
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
 * Converts a regular URL to a PMTiles protocol URL.
 *
 * @param url - Regular URL to PMTiles file
 * @returns PMTiles protocol URL (pmtiles://...)
 */
export function toPmtilesUrl(url: string): string {
	// Convert http:// or https:// URL to pmtiles:// protocol
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url.replace(/^https?:/, "pmtiles:");
	}

	// If already pmtiles://, return as-is
	if (url.startsWith("pmtiles://")) {
		return url;
	}

	// Otherwise, prepend pmtiles://
	if (!url.startsWith("pmtiles://")) {
		return `pmtiles://${url}`;
	}

	return url;
}
