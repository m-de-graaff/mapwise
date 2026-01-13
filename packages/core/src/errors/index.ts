/**
 * Error handling and diagnostics for MapWise.
 *
 * Provides structured error types, central error reporting,
 * and diagnostic logging with debug/production modes.
 *
 * @module errors
 */

// Error types
export {
	// Types
	type ErrorCategory,
	type ErrorSeverity,
	type MapwiseError,
	type CreateErrorOptions,
	// Error code constants
	ConfigurationErrors,
	NetworkErrors,
	MapLibreErrors,
	PluginErrors,
	LayerErrors,
	StyleErrors,
	PersistenceErrors,
	ValidationErrors,
	InternalErrors,
	// Factory and helpers
	createError,
	isMapwiseError,
	extractErrorMessage,
	extractError,
	formatError,
	serializeError,
} from "./error-types.js";

// Logger
export {
	type LogLevel,
	type LoggerOptions,
	type LogHandler,
	type LogEntry,
	type Logger,
	createLogger,
	defaultLogger,
	enableDebugMode,
	enableProductionMode,
} from "./logger.js";

// Error reporter
export {
	type ErrorReporterOptions,
	type ErrorHistoryEntry,
	type ErrorReporter,
	createErrorReporter,
	defaultErrorReporter,
	createSafeWrapper,
	createSafeAsyncWrapper,
	safePromise,
} from "./error-reporter.js";
