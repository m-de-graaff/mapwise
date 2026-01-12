// @ts-nocheck
import type { PluginDefinition } from "@mapwise/core";
import type { MapGeoJSONFeature } from "maplibre-gl";
import { safePluginCall } from "../shared/error-handler";
import { FeatureHighlighter } from "./highlight";
import { type FeatureQueryOptions, queryFeatures } from "./feature-query";
import type { BasePluginConfig } from "../shared/types";
import { createPointerRouter, type NormalizedPointerEvent } from "../shared/pointer-router";
import { throttle } from "../shared/utils";

/**
 * Configuration for the Inspect plugin.
 */
export interface InspectPluginConfig extends BasePluginConfig, FeatureQueryOptions {
	/**
	 * Whether to highlight features on hover/click.
	 *
	 * @default true
	 */
	highlight?: boolean;

	/**
	 * Whether to inspect on hover (in addition to click).
	 *
	 * @default false
	 */
	inspectOnHover?: boolean;
}

/**
 * Inspect plugin state interface.
 */
export interface InspectPluginState {
	selectedFeature: MapGeoJSONFeature | null;
	clearSelection: () => void;
}

/**
 * Creates an Inspect plugin that allows querying and inspecting map features.
 *
 * @param config - Inspect plugin configuration
 * @returns PluginDefinition for the Inspect plugin
 */
export function createInspectPlugin(config: InspectPluginConfig): PluginDefinition {
	const {
		enabled = true,
		cursor = "pointer",
		highlight = true,
		inspectOnHover = false,
		...queryOptions
	} = config;

	let highlighter: FeatureHighlighter | null = null;
	let cleanupPointer: (() => void) | null = null;
	let selectedFeature: MapGeoJSONFeature | null = null;

	return {
		id: "@mapwise/inspect",
		name: "Inspect",
		description: "Query and inspect map features",

		onRegister({ map, events, interactionMode, cursorManager }) {
			highlighter = new FeatureHighlighter(map);

			// Register interaction mode
			const unregisterMode = interactionMode.register("@mapwise/inspect", {
				priority: 0,
				exclusive: true,
			});
			interactionMode.setActive("@mapwise/inspect", enabled);

			// Throttled inspection handler
			const throttledHoverInspect = throttle((e: NormalizedPointerEvent) => {
				safePluginCall(
					() => {
						handleInspect(e, "hover");
					},
					{ pluginId: "@mapwise/inspect", context: "onMove" },
					events,
				);
			}, 50); // 50ms throttle

			// Setup pointer router
			cleanupPointer = createPointerRouter(map, {
				onClick: (e) => {
					// Check if we are the active mode
					if (!interactionMode.isActive("@mapwise/inspect")) {
						return;
					}

					safePluginCall(
						() => {
							handleInspect(e, "click");
						},
						{ pluginId: "@mapwise/inspect", context: "onClick" },
						events,
					);
				},
				onMove: (e) => {
					// Check if we are the active mode
					if (!interactionMode.isActive("@mapwise/inspect")) {
						// Clear highlight if we're not active anymore (and haven't selected anything)
						if (highlight && !selectedFeature) {
							highlighter?.clear();
						}
						return;
					}

					if (inspectOnHover) {
						throttledHoverInspect(e);
					}
				},
			});

			function updateHighlight(feature: MapGeoJSONFeature | null, type: "click" | "hover") {
				if (!highlight) {
					return;
				}

				if (feature) {
					highlighter?.highlight(feature);
					cursorManager.set("@mapwise/inspect", cursor);
				} else {
					// Only clear highlight if we're hovering or if we clicked empty space (deselect)
					if (type === "click" || !selectedFeature) {
						highlighter?.clear();
					}
					cursorManager.clear("@mapwise/inspect");
				}
			}

			// Helper to handle inspection logic
			function handleInspect(e: NormalizedPointerEvent, type: "click" | "hover") {
				const features = queryFeatures(map, e.point, queryOptions);
				const topFeature = features[0] || null;

				updateHighlight(topFeature, type);

				// Update selection state on click
				if (type === "click") {
					selectedFeature = topFeature;

					// Emit event
					events.emit("plugin:@mapwise/inspect:click", {
						lngLat: e.lngLat,
						point: e.point,
						features: features,
					});
				} else {
					// Emit hover event
					events.emit("plugin:@mapwise/inspect:hover", {
						lngLat: e.lngLat,
						point: e.point,
						features: features,
					});
				}
			}

			// Expose API
			// Expose API
			// const _api: InspectPluginState = {
			// 	get selectedFeature() {
			// 		return selectedFeature;
			// 	},
			// 	clearSelection() {
			// 		selectedFeature = null;
			// 		highlighter?.clear();
			// 	},
			// };

			return () => {
				cleanupPointer?.();
				unregisterMode();
				highlighter?.clear();
			};
		},
	};
}
