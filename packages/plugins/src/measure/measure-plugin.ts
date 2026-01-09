// placeholder

import type { PluginDefinition } from "@mapwise/core";
import type { BasePluginConfig } from "../shared/types";

/**
 * Configuration for the Measure plugin.
 */
export interface MeasurePluginConfig extends BasePluginConfig {
	// TODO: Add measure-specific config options
}

/**
 * Creates a Measure plugin that allows measuring distances and areas on the map.
 *
 * @param _config - Measure plugin configuration
 * @returns PluginDefinition for the Measure plugin
 */
export function createMeasurePlugin(_config: MeasurePluginConfig): PluginDefinition {
	// TODO: Implement measure plugin
	return {
		id: "@mapwise/measure",
		name: "Measure",
		description: "Measure distances and areas on the map",
		onRegister() {
			// TODO: Implement
		},
	};
}
