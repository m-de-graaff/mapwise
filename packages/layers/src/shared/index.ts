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
} from "./types";

// Validation
export {
	validateBaseLayerConfig,
	validateId,
	validateLayerId,
	validateOpacity,
	validateZoom,
	validateZoomRange,
} from "./validation";

// URL & Query
export type { UrlError } from "./url";
export { normalizeUrl, safeUrl, validateSafeUrl, withQuery } from "./url";

// Network
export type { FetchOptions, NetworkError } from "./network";
export { fetchText, fetchXml } from "./network";

// Parsing
export type { ParseError } from "./parse";
export { getXmlText, parseXml } from "./parse";

// MapLibre
export type { MapLibreError } from "./maplibre";
export {
	ensureLayer,
	ensureSource,
	removeLayerSafe,
	removeSourceSafe,
	setLayerOpacity,
} from "./maplibre";
