/**
 * ID generation utilities.
 *
 * @module utils/id
 */

/**
 * Generate a unique ID for map instances.
 *
 * Uses crypto.randomUUID when available, falls back to timestamp + random.
 */
export function generateMapId(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return `map-${crypto.randomUUID().slice(0, 8)}`;
	}

	// Fallback for older environments
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).slice(2, 8);
	return `map-${timestamp}-${random}`;
}

/**
 * Generate a unique ID for layers.
 */
export function generateLayerId(prefix = "layer"): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
	}

	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).slice(2, 8);
	return `${prefix}-${timestamp}-${random}`;
}
