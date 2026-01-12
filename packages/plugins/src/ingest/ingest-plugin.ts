// @ts-nocheck
import type { PluginDefinition } from "@mapwise/core";
import { fetchWmsCapabilities, fetchWmtsCapabilities } from "@mapwise/layers";
import type { BasePluginConfig } from "../shared/types";
import type { IngestResult, IngestLayerType } from "./types";

/**
 * Configuration for the Layer Ingestion plugin.
 */
export interface IngestPluginConfig extends BasePluginConfig {
	// Future: specific proxy or fetch options
}

interface IngestRequest {
	url: string;
}

function isIngestRequest(data: unknown): data is IngestRequest {
	return (
		typeof data === "object" &&
		data !== null &&
		"url" in data &&
		typeof (data as Record<string, unknown>)["url"] === "string"
	);
}

/**
 * Creates a Layer Ingestion plugin that detects and parses service capabilities.
 */
export function createLayerIngestionPlugin(_config: IngestPluginConfig = {}): PluginDefinition {
	return {
		id: "@mapwise/ingest",
		name: "Layer Ingestion",
		description: "Detect and ingest layer services (WMS, WMTS)",

		onRegister({ events }) {
			async function detectType(url: string): Promise<IngestLayerType> {
				const lower = url.toLowerCase();
				if (lower.includes("service=wms") || lower.includes("request=getcapabilities")) {
					return "wms";
				}
				if (lower.includes("service=wmts") || lower.includes("wmts")) {
					return "wmts";
				}
				if (lower.endsWith(".json") || lower.endsWith(".geojson")) {
					return "geojson";
				}
				return "unknown";
			}

			async function probeService(
				url: string,
			): Promise<{ type: IngestLayerType; capabilities: unknown }> {
				// Try WMS first
				try {
					const wmsCaps = await fetchWmsCapabilities(url);
					return { type: "wms", capabilities: wmsCaps };
				} catch (_e) {
					// Try WMTS
					try {
						const wmtsCaps = await fetchWmtsCapabilities(url);
						return { type: "wmts", capabilities: wmtsCaps };
					} catch (_e2) {
						throw new Error("Could not detect service type for URL");
					}
				}
			}

			async function fetchByType(
				url: string,
				type: IngestLayerType,
			): Promise<{ type: IngestLayerType; capabilities: unknown }> {
				if (type === "wms") {
					return { type, capabilities: await fetchWmsCapabilities(url) };
				}
				if (type === "wmts") {
					return { type, capabilities: await fetchWmtsCapabilities(url) };
				}
				if (type === "unknown") {
					return await probeService(url);
				}
				return { type, capabilities: null };
			}

			async function processUrl(url: string) {
				try {
					const initialType = await detectType(url);
					const { type, capabilities } = await fetchByType(url, initialType);

					const result: IngestResult = {
						type,
						url,
						capabilities,
					};

					events.emit("plugin:@mapwise/ingest:detected", result);
				} catch (error) {
					events.emit("plugin:@mapwise/ingest:error", {
						url,
						message: error instanceof Error ? error.message : "Unknown error",
						originalError: error,
					});
				}
			}

			// Listen for requests
			events.on("plugin:@mapwise/ingest:request", (data: unknown) => {
				if (isIngestRequest(data)) {
					processUrl(data.url);
				}
			});

			return () => {
				// cleanup
			};
		},
	};
}
