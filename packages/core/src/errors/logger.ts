/**
 * Diagnostic logger for MapWise.
 *
 * Provides structured logging with debug/production modes.
 * In production, minimal logs are output. In debug mode,
 * verbose logging and event tracing are enabled.
 *
 * @module errors/logger
 */

import type { ErrorSeverity, MapwiseError } from "./error-types";
import { formatError } from "./error-types";

// =============================================================================
// Logger Configuration
// =============================================================================

/**
 * Log level configuration.
 */
export type LogLevel = "silent" | "error" | "warn" | "info" | "debug" | "trace";

/**
 * Logger configuration options.
 */
export interface LoggerOptions {
	/** Minimum log level to output */
	level: LogLevel;

	/** Enable debug mode (verbose output) */
	debug?: boolean | undefined;

	/** Enable event tracing */
	trace?: boolean | undefined;

	/** Custom log handler (default: console) */
	handler?: LogHandler | undefined;

	/** Prefix for all log messages */
	prefix?: string | undefined;

	/** Enable timestamps in output */
	timestamps?: boolean | undefined;

	/** Enable colors in output (Node.js only) */
	colors?: boolean | undefined;
}

/**
 * Custom log handler function.
 */
export type LogHandler = (entry: LogEntry) => void;

/**
 * Log entry structure.
 */
export interface LogEntry {
	/** Log level */
	level: LogLevel;

	/** Log message */
	message: string;

	/** Timestamp */
	timestamp: number;

	/** Source component */
	source?: string | undefined;

	/** Additional data */
	data?: unknown | undefined;

	/** Associated error */
	error?: MapwiseError | Error | undefined;
}

// =============================================================================
// Log Level Priorities
// =============================================================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	silent: 0,
	error: 1,
	warn: 2,
	info: 3,
	debug: 4,
	trace: 5,
};

const SEVERITY_TO_LEVEL: Record<ErrorSeverity, LogLevel> = {
	critical: "error",
	error: "error",
	warning: "warn",
	info: "info",
	debug: "debug",
};

// =============================================================================
// Logger Implementation
// =============================================================================

/**
 * MapWise diagnostic logger.
 */
export interface Logger {
	/** Log an error */
	error(message: string, data?: unknown): void;

	/** Log a warning */
	warn(message: string, data?: unknown): void;

	/** Log an info message */
	info(message: string, data?: unknown): void;

	/** Log a debug message */
	debug(message: string, data?: unknown): void;

	/** Log a trace message */
	trace(message: string, data?: unknown): void;

	/** Log a MapwiseError */
	logError(error: MapwiseError): void;

	/** Check if a level is enabled */
	isEnabled(level: LogLevel): boolean;

	/** Get current configuration */
	getConfig(): LoggerOptions;

	/** Update configuration */
	configure(options: Partial<LoggerOptions>): void;

	/** Create a child logger with a source prefix */
	child(source: string): Logger;
}

/**
 * Create a new logger instance.
 */
export function createLogger(options: Partial<LoggerOptions> = {}): Logger {
	let config: LoggerOptions = {
		level: options.debug ? "debug" : "warn",
		debug: options.debug ?? false,
		trace: options.trace ?? false,
		handler: options.handler,
		prefix: options.prefix ?? "@mapwise/core",
		timestamps: options.timestamps ?? false,
		colors: options.colors ?? false,
		...options,
	};

	function isEnabled(level: LogLevel): boolean {
		return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[config.level];
	}

	function formatMessage(level: LogLevel, message: string, source?: string): string {
		const parts: string[] = [];

		if (config.timestamps) {
			parts.push(new Date().toISOString());
		}

		parts.push(`[${config.prefix}]`);

		if (source) {
			parts.push(`[${source}]`);
		}

		parts.push(`[${level.toUpperCase()}]`);
		parts.push(message);

		return parts.join(" ");
	}

	function log(level: LogLevel, message: string, data?: unknown, source?: string): void {
		if (!isEnabled(level)) {
			return;
		}

		const entry: LogEntry = {
			level,
			message,
			timestamp: Date.now(),
			source,
			data,
		};

		if (config.handler) {
			config.handler(entry);
			return;
		}

		const formattedMessage = formatMessage(level, message, source);

		switch (level) {
			case "error":
				console.error(formattedMessage, data ?? "");
				break;
			case "warn":
				console.warn(formattedMessage, data ?? "");
				break;
			case "info":
				console.info(formattedMessage, data ?? "");
				break;
			case "debug":
			case "trace":
				console.debug(formattedMessage, data ?? "");
				break;
		}
	}

	function logError(error: MapwiseError): void {
		const level = SEVERITY_TO_LEVEL[error.severity];

		if (!isEnabled(level)) {
			return;
		}

		const formattedError = formatError(error);

		if (config.handler) {
			config.handler({
				level,
				message: formattedError,
				timestamp: error.timestamp,
				source: error.source,
				error,
			});
			return;
		}

		const formattedMessage = formatMessage(level, formattedError, error.source);

		switch (level) {
			case "error": {
				console.error(formattedMessage);
				if (config.debug && error.cause) {
					console.error("Caused by:", error.cause);
				}
				break;
			}
			case "warn":
				console.warn(formattedMessage);
				break;
			case "info":
				console.info(formattedMessage);
				break;
			default:
				console.debug(formattedMessage);
		}
	}

	function child(source: string): Logger {
		return createChildLogger(logger, source);
	}

	const logger: Logger = {
		error: (message, data) => log("error", message, data),
		warn: (message, data) => log("warn", message, data),
		info: (message, data) => log("info", message, data),
		debug: (message, data) => log("debug", message, data),
		trace: (message, data) => log("trace", message, data),
		logError,
		isEnabled,
		getConfig: () => ({ ...config }),
		configure: (newOptions) => {
			config = { ...config, ...newOptions };
		},
		child,
	};

	return logger;
}

/**
 * Create a child logger with a source prefix.
 */
function createChildLogger(parent: Logger, source: string): Logger {
	const parentConfig = parent.getConfig();

	return {
		error: (message, data) => {
			if (parent.isEnabled("error")) {
				parent.error(`[${source}] ${message}`, data);
			}
		},
		warn: (message, data) => {
			if (parent.isEnabled("warn")) {
				parent.warn(`[${source}] ${message}`, data);
			}
		},
		info: (message, data) => {
			if (parent.isEnabled("info")) {
				parent.info(`[${source}] ${message}`, data);
			}
		},
		debug: (message, data) => {
			if (parent.isEnabled("debug")) {
				parent.debug(`[${source}] ${message}`, data);
			}
		},
		trace: (message, data) => {
			if (parent.isEnabled("trace")) {
				parent.trace(`[${source}] ${message}`, data);
			}
		},
		logError: (error) => parent.logError({ ...error, source: `${source}/${error.source}` }),
		isEnabled: (level) => parent.isEnabled(level),
		getConfig: () => parentConfig,
		configure: (options) => parent.configure(options),
		child: (childSource) => createChildLogger(parent, `${source}/${childSource}`),
	};
}

// =============================================================================
// Default Logger
// =============================================================================

/**
 * Default logger instance.
 * Can be reconfigured via `defaultLogger.configure()`.
 */
export const defaultLogger = createLogger({
	level: "warn",
	debug: false,
});

/**
 * Enable debug mode on the default logger.
 */
export function enableDebugMode(): void {
	defaultLogger.configure({
		level: "debug",
		debug: true,
		trace: true,
		timestamps: true,
	});
}

/**
 * Enable production mode on the default logger (minimal logs).
 */
export function enableProductionMode(): void {
	defaultLogger.configure({
		level: "error",
		debug: false,
		trace: false,
		timestamps: false,
	});
}
