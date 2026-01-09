// placeholder

import type { PluginDefinition } from "@mapwise/core";
import type { BasePluginConfig } from "../shared/types";

/**
 * Configuration for the Draw plugin.
 */
export interface DrawPluginConfig extends BasePluginConfig {
	// TODO: Add draw-specific config options
}

/**
 * Creates a Draw plugin that allows drawing features on the map.
 *
 * @param _config - Draw plugin configuration
 * @returns PluginDefinition for the Draw plugin
 */
export function createDrawPlugin(_config: DrawPluginConfig): PluginDefinition {
	// TODO: Implement draw plugin
	return {
		id: "@mapwise/draw",
		name: "Draw",
		description: "Draw points, lines, and polygons on the map",
		onRegister() {
			// TODO: Implement
		},
	};
}
