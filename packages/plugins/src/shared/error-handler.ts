/**
 * Safe plugin call wrapper that catches and emits structured errors.
 *
 * @module shared/error-handler
 */

import type { EventBus } from "@mapwise/core";

// =============================================================================
// Types
// =============================================================================

/**
 * Error context for plugin error events.
 */
export interface PluginErrorContext {
	/** Plugin ID */
	pluginId: string;
	/** Context description (e.g., "onRegister", "event handler", "hotkey handler") */
	context: string;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

// =============================================================================
// Safe Plugin Call
// =============================================================================

/**
 * Safely execute a plugin function and emit structured errors if it fails.
 *
 * @param fn - Function to execute
 * @param context - Error context
 * @param eventBus - Event bus for emitting errors (optional)
 * @returns Result of function execution, or undefined if error occurred
 *
 * @example
 * ```typescript
 * const result = safePluginCall(
 *   () => riskyOperation(),
 *   { pluginId: '@mapwise/inspect', context: 'feature query' },
 *   eventBus
 * );
 * ```
 */
export function safePluginCall<T>(
	fn: () => T,
	context: PluginErrorContext,
	eventBus?: EventBus,
): T | undefined {
	try {
		return fn();
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;

		// Emit structured error event
		if (eventBus) {
			eventBus.emit("plugin:error", {
				pluginId: context.pluginId,
				hook: context.context,
				message: errorMessage,
				recoverable: true,
			});
		}

		// Log to console for debugging
		console.error(
			`[@mapwise/plugins] Error in plugin "${context.pluginId}" (${context.context}):`,
			errorMessage,
			errorStack ? `\n${errorStack}` : "",
			context.metadata ? `\nMetadata: ${JSON.stringify(context.metadata)}` : "",
		);

		return undefined;
	}
}

/**
 * Safely execute an async plugin function and emit structured errors if it fails.
 *
 * @param fn - Async function to execute
 * @param context - Error context
 * @param eventBus - Event bus for emitting errors (optional)
 * @returns Promise resolving to result or undefined if error occurred
 *
 * @example
 * ```typescript
 * const result = await safePluginCallAsync(
 *   async () => await asyncOperation(),
 *   { pluginId: '@mapwise/inspect', context: 'onMapReady' },
 *   eventBus
 * );
 * ```
 */
export async function safePluginCallAsync<T>(
	fn: () => Promise<T>,
	context: PluginErrorContext,
	eventBus?: EventBus,
): Promise<T | undefined> {
	try {
		return await fn();
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;

		// Emit structured error event
		if (eventBus) {
			eventBus.emit("plugin:error", {
				pluginId: context.pluginId,
				hook: context.context,
				message: errorMessage,
				recoverable: true,
			});
		}

		// Log to console for debugging
		console.error(
			`[@mapwise/plugins] Error in plugin "${context.pluginId}" (${context.context}):`,
			errorMessage,
			errorStack ? `\n${errorStack}` : "",
			context.metadata ? `\nMetadata: ${JSON.stringify(context.metadata)}` : "",
		);

		return undefined;
	}
}
