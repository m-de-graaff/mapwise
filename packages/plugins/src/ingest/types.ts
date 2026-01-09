export type IngestLayerType = "wms" | "wmts" | "xyz" | "geojson" | "unknown";

export interface IngestResult {
	/** Detected type of the service */
	type: IngestLayerType;
	/** Original URL used */
	url: string;
	/** Parsed capabilities or metadata */
	capabilities?: unknown;
	/** Suggestion for configuration */
	config?: unknown;
}

export interface IngestError {
	url: string;
	message: string;
	originalError?: unknown;
}
