/**
 * Request and Authentication types.
 *
 * @module request/types
 */

/**
 * Parameters to modify the request.
 * MapLibre compatible return type for transformRequest.
 */
export interface RequestParameters {
	url: string;
	headers?: Record<string, string>;
	credentials?: "same-origin" | "include" | "omit";
	method?: "GET" | "POST" | "PUT";
	body?: string;
	collectResourceTiming?: boolean;
}

/**
 * Type of resource being requested.
 * Compatible with MapLibre's ResourceType.
 */
export type ResourceType =
	| "Unknown"
	| "Style"
	| "Source"
	| "Tile"
	| "Glyphs"
	| "SpriteImage"
	| "SpriteJSON"
	| "Image";

/**
 * Interface for intercepting and modifying requests.
 */
export interface RequestTransform {
	/**
	 * Unique identifier for this transformer.
	 */
	id: string;

	/**
	 * Transform a fetch request (async).
	 * Used for API calls, geocoding, etc. where strict MapLibre compliance isn't needed.
	 */
	transformFetch?(url: string, init?: RequestInit): Promise<{ url: string; init?: RequestInit }>;

	/**
	 * Transform a MapLibre resource request (sync).
	 * MapLibre requires synchronous transformation for tiles to avoid blocking.
	 * If undefined is returned, no change is applied.
	 */
	transformMapRequest?(url: string, resourceType: ResourceType): RequestParameters | undefined;
}

/**
 * Interface for providing authentication tokens.
 */
export interface TokenProvider {
	/**
	 * Get the current valid token.
	 * Should handle refreshing if expired or nearly expired.
	 */
	getToken(): Promise<string | null>;

	/**
	 * Get the token synchronously if available (cached).
	 * Used for sync MapLibre transforms.
	 */
	getTokenSync?(): string | null;
}
