/**
 * Central error reporter for MapWise.
 *
 * Provides a unified interface for handling, reporting, and recovering
 * from errors throughout the system. Errors never crash the app;
 * they are caught, reported, and recovered where possible.
 *
 * @module errors/error-reporter
 */

import type { EventBus } from "../events/event-bus.js";
import type {
	CreateErrorOptions,
	ErrorCategory,
	ErrorSeverity,
	MapwiseError,
} from "./error-types.js";
import { createError, isMapwiseError } from "./error-types.js";
import type { Logger } from "./logger.js";
import { createLogger } from "./logger.js";

// =============================================================================
// Error Reporter Configuration
// =============================================================================

/**
 * Error reporter configuration options.
 */
export interface ErrorReporterOptions {
	/** Logger instance to use */
	logger?: Logger | undefined;

	/** Event bus to emit error events to */
	eventBus?: EventBus | undefined;

	/** Enable debug mode */
	debug?: boolean | undefined;

	/** Custom error handler for external reporting (e.g., Sentry) */
	onError?: ((error: MapwiseError) => void) | undefined;

	/** Enable recovery attempts */
	enableRecovery?: boolean | undefined;

	/** Maximum errors to keep in history */
	maxHistorySize?: number | undefined;
}

/**
 * Error history entry.
 */
export interface ErrorHistoryEntry {
	error: MapwiseError;
	handled: boolean;
	recovered: boolean;
}

// =============================================================================
// Error Reporter Interface
// =============================================================================

/**
 * Central error reporter.
 */
export interface ErrorReporter {
	/**
	 * Report an error.
	 * The error is logged, emitted to event bus, and stored in history.
	 */
	report(error: MapwiseError): void;

	/**
	 * Create and report an error in one call.
	 */
	reportError(options: CreateErrorOptions): MapwiseError;

	/**
	 * Wrap an async operation with error handling.
	 * Errors are caught, reported, and optionally recovered.
	 */
	wrapAsync<T>(
		operation: () => Promise<T>,
		context: {
			source: string;
			category: ErrorCategory;
			recoveryValue?: T;
		},
	): Promise<T>;

	/**
	 * Wrap a sync operation with error handling.
	 */
	wrapSync<T>(
		operation: () => T,
		context: {
			source: string;
			category: ErrorCategory;
			recoveryValue?: T;
		},
	): T;

	/**
	 * Get error history.
	 */
	getHistory(): ErrorHistoryEntry[];

	/**
	 * Get errors by category.
	 */
	getErrorsByCategory(category: ErrorCategory): MapwiseError[];

	/**
	 * Get errors by severity.
	 */
	getErrorsBySeverity(severity: ErrorSeverity): MapwiseError[];

	/**
	 * Clear error history.
	 */
	clearHistory(): void;

	/**
	 * Get the count of errors by category.
	 */
	getErrorCounts(): Record<ErrorCategory, number>;

	/**
	 * Check if there are any critical errors.
	 */
	hasCriticalErrors(): boolean;

	/**
	 * Enable debug mode.
	 */
	enableDebug(): void;

	/**
	 * Disable debug mode.
	 */
	disableDebug(): void;

	/**
	 * Get current configuration.
	 */
	getConfig(): ErrorReporterOptions;
}

// =============================================================================
// Error Reporter Implementation
// =============================================================================

/**
 * Create a new error reporter instance.
 */
export function createErrorReporter(options: ErrorReporterOptions = {}): ErrorReporter {
	const logger = options.logger ?? createLogger({ debug: options.debug });
	const eventBus = options.eventBus;
	const history: ErrorHistoryEntry[] = [];
	const maxHistorySize = options.maxHistorySize ?? 100;

	let config: ErrorReporterOptions = {
		...options,
		logger,
		eventBus,
		enableRecovery: options.enableRecovery ?? true,
	};

	function report(error: MapwiseError): void {
		// Log the error
		logger.logError(error);

		// Add to history
		addToHistory(error, true, false);

		// Emit to event bus if available
		emitToEventBus(error);

		// Call custom handler
		config.onError?.(error);
	}

	function addToHistory(error: MapwiseError, handled: boolean, recovered: boolean): void {
		history.push({ error, handled, recovered });

		// Trim history if needed
		while (history.length > maxHistorySize) {
			history.shift();
		}
	}

	function emitToEventBus(error: MapwiseError): void {
		if (!eventBus) {
			return;
		}

		eventBus.emit("core:error", {
			source: mapCategoryToSource(error.category),
			code: error.code,
			message: error.message,
			recoverable: error.recoverable,
			originalError: error.cause instanceof Error ? error.cause : undefined,
			context: error.context,
		});
	}

	function mapCategoryToSource(
		category: ErrorCategory,
	): "event-bus" | "layer-registry" | "plugin-manager" | "style-manager" | "map-store" {
		switch (category) {
			case "plugin":
				return "plugin-manager";
			case "layer":
				return "layer-registry";
			case "style":
				return "style-manager";
			default:
				return "map-store";
		}
	}

	function reportError(errorOptions: CreateErrorOptions): MapwiseError {
		const error = createError(errorOptions);
		report(error);
		return error;
	}

	async function wrapAsync<T>(
		operation: () => Promise<T>,
		context: {
			source: string;
			category: ErrorCategory;
			recoveryValue?: T;
		},
	): Promise<T> {
		try {
			return await operation();
		} catch (caught) {
			const error = createErrorFromCaught(caught, context.source, context.category);
			report(error);

			if (config.enableRecovery && context.recoveryValue !== undefined) {
				addToHistory(error, true, true);
				return context.recoveryValue;
			}

			throw caught;
		}
	}

	function wrapSync<T>(
		operation: () => T,
		context: {
			source: string;
			category: ErrorCategory;
			recoveryValue?: T;
		},
	): T {
		try {
			return operation();
		} catch (caught) {
			const error = createErrorFromCaught(caught, context.source, context.category);
			report(error);

			if (config.enableRecovery && context.recoveryValue !== undefined) {
				addToHistory(error, true, true);
				return context.recoveryValue;
			}

			throw caught;
		}
	}

	function createErrorFromCaught(
		caught: unknown,
		source: string,
		category: ErrorCategory,
	): MapwiseError {
		if (isMapwiseError(caught)) {
			return caught;
		}

		const message =
			caught instanceof Error
				? caught.message
				: typeof caught === "string"
					? caught
					: "Unknown error";

		return createError({
			code: "CAUGHT_ERROR",
			message,
			category,
			source,
			cause: caught,
			recoverable: true,
		});
	}

	function getHistory(): ErrorHistoryEntry[] {
		return [...history];
	}

	function getErrorsByCategory(category: ErrorCategory): MapwiseError[] {
		return history.filter((entry) => entry.error.category === category).map((entry) => entry.error);
	}

	function getErrorsBySeverity(severity: ErrorSeverity): MapwiseError[] {
		return history.filter((entry) => entry.error.severity === severity).map((entry) => entry.error);
	}

	function clearHistory(): void {
		history.length = 0;
	}

	function getErrorCounts(): Record<ErrorCategory, number> {
		const counts: Record<string, number> = {};
		for (const entry of history) {
			const cat = entry.error.category;
			counts[cat] = (counts[cat] ?? 0) + 1;
		}
		return counts as Record<ErrorCategory, number>;
	}

	function hasCriticalErrors(): boolean {
		return history.some((entry) => entry.error.severity === "critical");
	}

	function enableDebug(): void {
		logger.configure({ level: "debug", debug: true });
		config = { ...config, debug: true };
	}

	function disableDebug(): void {
		logger.configure({ level: "warn", debug: false });
		config = { ...config, debug: false };
	}

	return {
		report,
		reportError,
		wrapAsync,
		wrapSync,
		getHistory,
		getErrorsByCategory,
		getErrorsBySeverity,
		clearHistory,
		getErrorCounts,
		hasCriticalErrors,
		enableDebug,
		disableDebug,
		getConfig: () => ({ ...config }),
	};
}

// =============================================================================
// Default Error Reporter
// =============================================================================

/**
 * Default error reporter instance.
 */
export const defaultErrorReporter = createErrorReporter();

// =============================================================================
// Error Boundary Helpers
// =============================================================================

/**
 * Create a safe wrapper for a function that catches errors.
 * The wrapper will never throw - it logs errors and returns the recovery value.
 */
export function createSafeWrapper<TArgs extends unknown[], TReturn>(
	fn: (...args: TArgs) => TReturn,
	options: {
		source: string;
		category: ErrorCategory;
		recoveryValue: TReturn;
		reporter?: ErrorReporter;
	},
): (...args: TArgs) => TReturn {
	const reporter = options.reporter ?? defaultErrorReporter;

	return (...args: TArgs): TReturn => {
		return reporter.wrapSync(() => fn(...args), {
			source: options.source,
			category: options.category,
			recoveryValue: options.recoveryValue,
		});
	};
}

/**
 * Create a safe wrapper for an async function that catches errors.
 */
export function createSafeAsyncWrapper<TArgs extends unknown[], TReturn>(
	fn: (...args: TArgs) => Promise<TReturn>,
	options: {
		source: string;
		category: ErrorCategory;
		recoveryValue: TReturn;
		reporter?: ErrorReporter;
	},
): (...args: TArgs) => Promise<TReturn> {
	const reporter = options.reporter ?? defaultErrorReporter;

	return async (...args: TArgs): Promise<TReturn> => {
		return reporter.wrapAsync(() => fn(...args), {
			source: options.source,
			category: options.category,
			recoveryValue: options.recoveryValue,
		});
	};
}

/**
 * Wrap a promise to ensure it never rejects.
 * Errors are logged and the recovery value is returned.
 */
export async function safePromise<T>(
	promise: Promise<T>,
	options: {
		source: string;
		category: ErrorCategory;
		recoveryValue: T;
		reporter?: ErrorReporter;
	},
): Promise<T> {
	const reporter = options.reporter ?? defaultErrorReporter;
	return reporter.wrapAsync(() => promise, {
		source: options.source,
		category: options.category,
		recoveryValue: options.recoveryValue,
	});
}
