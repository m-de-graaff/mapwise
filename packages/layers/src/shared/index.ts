/**
 * Shared utilities and types for layer implementations.
 *
 * @module shared
 */

// Types
export type {
	BaseLayerConfig,
	LayerCapabilities,
	LayerValidationError,
	LayerValidationResult,
} from "./types.js";

// Validation
export {
	validateBaseLayerConfig,
	validateId,
	validateLayerId,
	validateOpacity,
	validateZoom,
	validateZoomRange,
} from "./validation.js";

// URL & Query
export type { UrlError } from "./url.js";
export { normalizeUrl, safeUrl, validateSafeUrl, withQuery } from "./url.js";

// Network
export type { FetchOptions, NetworkError } from "./network.js";
export { fetchText, fetchXml } from "./network.js";

// Parsing
export type { ParseError } from "./parse.js";
export { getXmlText, parseXml } from "./parse.js";

// MapLibre
export type { MapLibreError } from "./maplibre.js";
export {
	ensureLayer,
	ensureSource,
	removeLayerSafe,
	removeSourceSafe,
	setLayerOpacity,
} from "./maplibre.js";
