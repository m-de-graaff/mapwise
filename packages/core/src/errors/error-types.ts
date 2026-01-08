/**
 * Structured error types for MapWise.
 *
 * All errors are structured objects that can be serialized, logged,
 * and handled programmatically without crashing the application.
 *
 * @module errors/error-types
 */

// =============================================================================
// Error Categories
// =============================================================================

/**
 * Error category for classification and filtering.
 */
export type ErrorCategory =
	| "configuration" // Invalid options, missing required values
	| "network" // Failed requests, timeouts, CORS issues
	| "maplibre" // MapLibre GL errors (style, sources, layers)
	| "plugin" // Plugin lifecycle errors
	| "layer" // Layer registry errors
	| "style" // Basemap/style errors
	| "persistence" // Serialization/hydration errors
	| "validation" // Input validation failures
	| "internal"; // Unexpected internal errors

/**
 * Error severity levels.
 */
export type ErrorSeverity =
	| "debug" // Diagnostic info, only in debug mode
	| "info" // Informational, operation continues
	| "warning" // Potential issue, operation continues
	| "error" // Error occurred, operation may have failed
	| "critical"; // Fatal error, operation cannot continue

// =============================================================================
// Structured Error Interface
// =============================================================================

/**
 * Base interface for all MapWise errors.
 * These are structured objects, not thrown exceptions.
 */
export interface MapwiseError {
	/** Unique error code for programmatic handling */
	code: string;

	/** Human-readable error message */
	message: string;

	/** Error category for filtering and handling */
	category: ErrorCategory;

	/** Error severity level */
	severity: ErrorSeverity;

	/** Whether the system can recover from this error */
	recoverable: boolean;

	/** Timestamp when error occurred */
	timestamp: number;

	/** Source component that generated the error */
	source: string;

	/** Original error if this wraps another error */
	cause?: Error | unknown | undefined;

	/** Additional context for debugging */
	context?: Record<string, unknown> | undefined;

	/** Suggested recovery action */
	recovery?: string | undefined;

	/** Documentation link for this error */
	docsUrl?: string | undefined;
}

// =============================================================================
// Error Codes by Category
// =============================================================================

/**
 * Configuration error codes.
 */
export const ConfigurationErrors = {
	missingContainer: "CONFIG_MISSING_CONTAINER",
	invalidContainer: "CONFIG_INVALID_CONTAINER",
	missingStyle: "CONFIG_MISSING_STYLE",
	invalidOptions: "CONFIG_INVALID_OPTIONS",
	invalidCenter: "CONFIG_INVALID_CENTER",
	invalidZoom: "CONFIG_INVALID_ZOOM",
} as const;

/**
 * Network error codes.
 */
export const NetworkErrors = {
	styleLoadFailed: "NET_STYLE_LOAD_FAILED",
	spriteLoadFailed: "NET_SPRITE_LOAD_FAILED",
	glyphLoadFailed: "NET_GLYPH_LOAD_FAILED",
	tileLoadFailed: "NET_TILE_LOAD_FAILED",
	sourceLoadFailed: "NET_SOURCE_LOAD_FAILED",
	timeout: "NET_TIMEOUT",
	corsError: "NET_CORS_ERROR",
	offline: "NET_OFFLINE",
} as const;

/**
 * MapLibre error codes.
 */
export const MapLibreErrors = {
	mapCreationFailed: "ML_MAP_CREATION_FAILED",
	styleParseError: "ML_STYLE_PARSE_ERROR",
	sourceError: "ML_SOURCE_ERROR",
	layerError: "ML_LAYER_ERROR",
	webglError: "ML_WEBGL_ERROR",
	contextLost: "ML_CONTEXT_LOST",
	projectionError: "ML_PROJECTION_ERROR",
} as const;

/**
 * Plugin error codes.
 */
export const PluginErrors = {
	registerFailed: "PLUGIN_REGISTER_FAILED",
	unregisterFailed: "PLUGIN_UNREGISTER_FAILED",
	hookError: "PLUGIN_HOOK_ERROR",
	dependencyMissing: "PLUGIN_DEPENDENCY_MISSING",
	duplicateId: "PLUGIN_DUPLICATE_ID",
	invalidDefinition: "PLUGIN_INVALID_DEFINITION",
} as const;

/**
 * Layer error codes.
 */
export const LayerErrors = {
	registerFailed: "LAYER_REGISTER_FAILED",
	applyFailed: "LAYER_APPLY_FAILED",
	removeFailed: "LAYER_REMOVE_FAILED",
	notFound: "LAYER_NOT_FOUND",
	duplicateId: "LAYER_DUPLICATE_ID",
	invalidDefinition: "LAYER_INVALID_DEFINITION",
	sourceError: "LAYER_SOURCE_ERROR",
} as const;

/**
 * Style error codes.
 */
export const StyleErrors = {
	loadFailed: "STYLE_LOAD_FAILED",
	loadTimeout: "STYLE_LOAD_TIMEOUT",
	invalidStyle: "STYLE_INVALID",
	reapplyFailed: "STYLE_REAPPLY_FAILED",
	spriteMissing: "STYLE_SPRITE_MISSING",
	glyphMissing: "STYLE_GLYPH_MISSING",
} as const;

/**
 * Persistence error codes.
 */
export const PersistenceErrors = {
	serializeFailed: "PERSIST_SERIALIZE_FAILED",
	hydrateFailed: "PERSIST_HYDRATE_FAILED",
	schemaInvalid: "PERSIST_SCHEMA_INVALID",
	versionUnsupported: "PERSIST_VERSION_UNSUPPORTED",
	migrationFailed: "PERSIST_MIGRATION_FAILED",
} as const;

/**
 * Validation error codes.
 */
export const ValidationErrors = {
	requiredField: "VALID_REQUIRED_FIELD",
	invalidType: "VALID_INVALID_TYPE",
	outOfRange: "VALID_OUT_OF_RANGE",
	invalidFormat: "VALID_INVALID_FORMAT",
} as const;

/**
 * Internal error codes.
 */
export const InternalErrors = {
	unexpected: "INTERNAL_UNEXPECTED",
	notImplemented: "INTERNAL_NOT_IMPLEMENTED",
	invariantViolation: "INTERNAL_INVARIANT_VIOLATION",
	stateCorruption: "INTERNAL_STATE_CORRUPTION",
} as const;

// =============================================================================
// Error Factory
// =============================================================================

/**
 * Options for creating a MapwiseError.
 */
export interface CreateErrorOptions {
	code: string;
	message: string;
	category: ErrorCategory;
	severity?: ErrorSeverity | undefined;
	recoverable?: boolean | undefined;
	source: string;
	cause?: Error | unknown | undefined;
	context?: Record<string, unknown> | undefined;
	recovery?: string | undefined;
	docsUrl?: string | undefined;
}

/**
 * Create a structured MapwiseError.
 */
export function createError(options: CreateErrorOptions): MapwiseError {
	return {
		code: options.code,
		message: options.message,
		category: options.category,
		severity: options.severity ?? "error",
		recoverable: options.recoverable ?? true,
		timestamp: Date.now(),
		source: options.source,
		cause: options.cause,
		context: options.context,
		recovery: options.recovery,
		docsUrl: options.docsUrl,
	};
}

// =============================================================================
// Error Helpers
// =============================================================================

/**
 * Check if a value is a MapwiseError.
 */
export function isMapwiseError(value: unknown): value is MapwiseError {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return (
		typeof obj["code"] === "string" &&
		typeof obj["message"] === "string" &&
		typeof obj["category"] === "string" &&
		typeof obj["severity"] === "string" &&
		typeof obj["recoverable"] === "boolean" &&
		typeof obj["timestamp"] === "number" &&
		typeof obj["source"] === "string"
	);
}

/**
 * Extract error message from unknown error type.
 */
export function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	if (isMapwiseError(error)) {
		return error.message;
	}
	return "Unknown error";
}

/**
 * Extract the original Error from unknown error type.
 */
export function extractError(error: unknown): Error | undefined {
	if (error instanceof Error) {
		return error;
	}
	if (isMapwiseError(error) && error.cause instanceof Error) {
		return error.cause;
	}
	return undefined;
}

/**
 * Format error for logging.
 */
export function formatError(error: MapwiseError): string {
	const parts = [`[${error.code}] ${error.message}`];

	if (error.source) {
		parts.push(`Source: ${error.source}`);
	}

	if (error.recovery) {
		parts.push(`Recovery: ${error.recovery}`);
	}

	if (error.context && Object.keys(error.context).length > 0) {
		parts.push(`Context: ${JSON.stringify(error.context)}`);
	}

	return parts.join(" | ");
}

/**
 * Serialize error for persistence or transmission.
 */
export function serializeError(error: MapwiseError): string {
	const serializable = {
		...error,
		cause: error.cause instanceof Error ? error.cause.message : error.cause,
	};
	return JSON.stringify(serializable);
}
