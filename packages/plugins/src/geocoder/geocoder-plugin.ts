import type { PluginDefinition } from "@mapwise/core";
import type { BasePluginConfig } from "../shared/types";
import type { GeocoderProvider, GeocoderResult } from "./types";

/**
 * Configuration for the Geocoder plugin.
 */
export interface GeocoderConfig extends BasePluginConfig {
	/**
	 * Geocoder provider instance.
	 */
	provider: GeocoderProvider;

	/**
	 * Whether to automatically fly to the selected result.
	 *
	 * @default true
	 */
	flyToSelected?: boolean;
}

/**
 * Creates a Geocoder plugin that provides search functionality.
 */
export function createGeocoderPlugin(config: GeocoderConfig): PluginDefinition {
	const { provider, flyToSelected = true } = config;

	return {
		id: "@mapwise/geocoder",
		name: "Geocoder",
		description: "Search for locations using a geocoder provider",

		onRegister({ map, events }) {
			// Helper to fly to result
			function flyToResult(result: GeocoderResult) {
				if (result.bbox) {
					map.fitBounds(result.bbox as [number, number, number, number], {
						padding: 50,
						maxZoom: 16,
					});
				} else {
					map.flyTo({
						center: result.center,
						zoom: 14,
					});
				}
			}

			// Expose API listeners
			// search(query)
			const onSearch = async (query: string) => {
				try {
					const results = await provider.search(query);
					events.emit("plugin:@mapwise/geocoder:results", { query, results });
				} catch (error) {
					console.error("Geocoder search failed:", error);
					events.emit("plugin:@mapwise/geocoder:results", { query, results: [] });
				}
			};

			// select(result)
			const onSelect = (result: GeocoderResult) => {
				if (flyToSelected) {
					flyToResult(result);
				}
				events.emit("plugin:@mapwise/geocoder:select", { result });
			};

			// reverse(lngLat)
			// const _onReverse = async (lngLat: [number, number]) => {
			// 	if (!provider.reverse) {
			// 		return;
			// 	}
			// 	try {
			// 		const results = await provider.reverse(lngLat);
			// 		// Just return results via event?
			// 		// Typically used for "What is here?"
			// 		events.emit("plugin:@mapwise/geocoder:results", { query: `${lngLat}`, results });
			// 	} catch (error) {
			// 		console.error("Reverse geocoding failed:", error);
			// 	}
			// };

			// Listen to internal commands/events if we had a command bus.
			// For headless usage, the consumer will likely wrap this or simply invoke the provider directly?
			// "Integrate Map: flyToResult(result) helper" - The user request implies the plugin should offer this capability.
			// By emitting 'select', the UI can trigger it? Or the plugin handles it (flyToSelected=true).

			// We expose these via the event bus for now so the UI can drive it.
			events.on("plugin:@mapwise/geocoder:search", (data: unknown) => {
				if (
					typeof data === "object" &&
					data !== null &&
					"query" in data &&
					typeof (data as Record<string, unknown>)["query"] === "string"
				) {
					onSearch((data as { query: string }).query);
				}
			});

			// Listen for selection requests
			events.on("plugin:@mapwise/geocoder:select", (data: unknown) => {
				if (typeof data === "object" && data !== null && "result" in data) {
					onSelect((data as { result: GeocoderResult }).result);
				}
			});

			return () => {
				// cleanup listeners
				// events.off(...) if we could.
			};
		},
	};
}
