export interface GeocoderResult {
	/** Unique identifier for the result */
	id: string;
	/** Display name */
	name: string;
	/** Geographic coordinates [lng, lat] */
	center: [number, number];
	/** Bounding box [minLng, minLat, maxLng, maxLat] */
	bbox?: [number, number, number, number];
	/** Additional metadata (address components, type, etc.) */
	metadata?: Record<string, unknown>;
}

export interface GeocoderProvider {
	/**
	 * Search for locations by query string.
	 */
	search(query: string): Promise<GeocoderResult[]>;

	/**
	 * Find location by coordinates (reverse geocoding).
	 */
	reverse?(lngLat: [number, number]): Promise<GeocoderResult[]>;
}
