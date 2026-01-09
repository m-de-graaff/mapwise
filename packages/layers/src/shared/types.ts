/**
 * Shared types for layer configurations.
 *
 * @module shared/types
 */

import type { LayerCategory, LayerMetadata } from "@mapwise/core";

// =============================================================================
// Base Layer Configuration
// =============================================================================

/**
 * Base configuration shared by all layer types.
 */
export interface BaseLayerConfig {
	/** Unique layer identifier (stable across sessions) */
	id: string;
	/** Human-readable title */
	title?: string;
	/** Attribution/credits */
	attribution?: string;
	/** Minimum zoom level where layer is shown */
	minzoom?: number;
	/** Maximum zoom level where layer is shown */
	maxzoom?: number;
	/** Layer ID to insert before (for z-order control) */
	beforeId?: string;
	/** Initial opacity (0-1) */
	opacity?: number;
	/** Whether layer is initially visible */
	visible?: boolean;
	/** Layer category for z-order grouping */
	category?: LayerCategory;
	/** Additional metadata */
	metadata?: LayerMetadata;
	/**
	 * Request transform callback for HTTP fetches (capabilities, metadata, etc.).
	 * Allows adding authentication headers, signing requests, or modifying URLs.
	 *
	 * This callback is called before fetching capabilities, metadata, or other
	 * service information. It receives the URL and optional RequestInit, and
	 * returns a transformed URL and RequestInit.
	 *
	 * @example
	 * ```typescript
	 * // Add authentication token to headers
	 * requestTransform: async (url, init) => {
	 *   return {
	 *     url,
	 *     init: {
	 *       ...init,
	 *       headers: {
	 *         ...init?.headers,
	 *         'Authorization': `Bearer ${token}`,
	 *       },
	 *     },
	 *   };
	 * }
	 *
	 * // Add token to query string
	 * requestTransform: async (url) => {
	 *   const parsed = new URL(url);
	 *   parsed.searchParams.set('token', authToken);
	 *   return { url: parsed.toString() };
	 * }
	 *
	 * // Sign request URL
	 * requestTransform: async (url) => {
	 *   const signedUrl = await signUrl(url, secretKey);
	 *   return { url: signedUrl };
	 * }
	 * ```
	 */
	requestTransform?: (
		url: string,
		init?: RequestInit,
	) => Promise<{ url: string; init?: RequestInit }> | { url: string; init?: RequestInit };
	/**
	 * Tile URL transform callback for tile requests.
	 * Allows adding authentication tokens, query signing, or modifying tile URLs.
	 *
	 * This callback is called for each tile URL before it's requested by MapLibre.
	 * It receives the tile URL and returns a transformed URL (can be async for
	 * dynamic signing).
	 *
	 * @example
	 * ```typescript
	 * // Add token to query string
	 * tileUrlTransform: (url) => {
	 *   const parsed = new URL(url);
	 *   parsed.searchParams.set('token', authToken);
	 *   return parsed.toString();
	 * }
	 *
	 * // Add token to headers (requires custom tile loading, not standard MapLibre)
	 * // Note: For header-based auth, use requestTransform for capabilities
	 * // and consider a custom layer implementation for tiles
	 *
	 * // Async query signing
	 * tileUrlTransform: async (url) => {
	 *   const signature = await signQueryString(url, secretKey);
	 *   return `${url}&signature=${signature}`;
	 * }
	 * ```
	 */
	tileUrlTransform?: (url: string) => string | Promise<string>;
}

// =============================================================================
// Layer Capabilities
// =============================================================================

/**
 * Metadata about layer capabilities (typically from WMS/WMTS GetCapabilities).
 */
export interface LayerCapabilities {
	/** Service title */
	title?: string;
	/** Service abstract/description */
	abstract?: string;
	/** Supported coordinate reference systems */
	crs?: string[];
	/** Supported formats (e.g., "image/png", "image/jpeg") */
	formats?: string[];
	/** Supported styles */
	styles?: Array<{
		name: string;
		title?: string;
	}>;
	/** Bounding box */
	bbox?: {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
		crs: string;
	};
	/** Custom capabilities data */
	custom?: Record<string, unknown>;
}

// =============================================================================
// Layer Validation
// =============================================================================

/**
 * Structure for layer validation errors.
 */
export interface LayerValidationError {
	/** Error code */
	code: string;
	/** Human-readable error message */
	message: string;
	/** Field or path that failed validation */
	field?: string;
	/** Additional context */
	context?: Record<string, unknown>;
}

/**
 * Result of layer configuration validation.
 */
export interface LayerValidationResult {
	/** Whether the configuration is valid */
	valid: boolean;
	/** Validation errors */
	errors: LayerValidationError[];
	/** Validation warnings */
	warnings: LayerValidationError[];
}
