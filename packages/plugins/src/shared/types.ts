/**
 * Shared types and utilities for MapWise plugins.
 *
 * @module shared/types
 */

import type { PluginDefinition } from "@mapwise/core";

// =============================================================================
// Common Plugin Configuration
// =============================================================================

/**
 * Common configuration options for all plugins.
 */
export interface BasePluginConfig {
	/**
	 * Whether the plugin is enabled.
	 * When disabled, the plugin should not respond to user interactions.
	 *
	 * @default true
	 */
	enabled?: boolean;

	/**
	 * Keyboard shortcuts for plugin actions.
	 * Keys are action names, values are keyboard event key strings or key combinations.
	 *
	 * @example
	 * ```typescript
	 * hotkeys: {
	 *   activate: 'i',           // Single key
	 *   cancel: 'Escape',         // Named key
	 *   delete: 'Delete',         // Named key
	 *   undo: 'Ctrl+z',          // Key combination
	 *   redo: 'Ctrl+Shift+z',    // Key combination
	 * }
	 * ```
	 */
	hotkeys?: Record<string, string>;

	/**
	 * CSS cursor style when plugin is active.
	 * This is applied to the map container when the plugin is active.
	 *
	 * Common values:
	 * - `'crosshair'` - For drawing/measurement tools
	 * - `'pointer'` - For selection/inspection tools
	 * - `'grab'` / `'grabbing'` - For pan tools
	 * - `'zoom-in'` / `'zoom-out'` - For zoom tools
	 * - `'wait'` - For loading states
	 *
	 * @default undefined (no cursor change)
	 */
	cursor?: string;
}

// =============================================================================
// Plugin Event Naming Convention
// =============================================================================

/**
 * Plugin event naming follows the pattern: `plugin:<plugin-id>:<event-name>`
 *
 * @example
 * ```typescript
 * // Inspect plugin events
 * 'plugin:@mapwise/inspect:featureClick'
 * 'plugin:@mapwise/inspect:featureHover'
 *
 * // Draw plugin events
 * 'plugin:@mapwise/draw:featureComplete'
 * 'plugin:@mapwise/draw:featureCancel'
 *
 * // Measure plugin events
 * 'plugin:@mapwise/measure:measurementComplete'
 * ```
 */

/**
 * Type helper for plugin event names.
 * Plugins should use this to create type-safe event names.
 *
 * @example
 * ```typescript
 * type InspectPluginEvents = PluginEventNames<'@mapwise/inspect', 'featureClick' | 'featureHover'>;
 * // Results in: 'plugin:@mapwise/inspect:featureClick' | 'plugin:@mapwise/inspect:featureHover'
 * ```
 */
export type PluginEventNames<
	PluginId extends string,
	EventName extends string,
> = `plugin:${PluginId}:${EventName}`;

/**
 * Helper function to create a plugin event name.
 *
 * @param pluginId - Plugin identifier
 * @param eventName - Event name
 * @returns Full event name in the format `plugin:<plugin-id>:<event-name>`
 *
 * @example
 * ```typescript
 * const eventName = createPluginEventName('@mapwise/inspect', 'featureClick');
 * // Returns: 'plugin:@mapwise/inspect:featureClick'
 * ```
 */
export function createPluginEventName(pluginId: string, eventName: string): string {
	return `plugin:${pluginId}:${eventName}`;
}

// =============================================================================
// Plugin Factory Function Type
// =============================================================================

/**
 * Type for plugin factory functions.
 * All plugins should export a factory function that creates a PluginDefinition.
 *
 * @template TConfig - Plugin configuration type (must extend BasePluginConfig)
 *
 * @example
 * ```typescript
 * export function createInspectPlugin(
 *   config: InspectPluginConfig
 * ): PluginDefinition {
 *   return {
 *     id: '@mapwise/inspect',
 *     name: 'Inspect',
 *     onRegister(ctx) {
 *       // Plugin initialization
 *     },
 *     onUnregister(ctx) {
 *       // Plugin cleanup
 *     },
 *   };
 * }
 * ```
 */
export type PluginFactory<TConfig extends BasePluginConfig = BasePluginConfig> = (
	config: TConfig,
) => PluginDefinition;
