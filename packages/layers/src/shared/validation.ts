/**
 * Shared validation utilities for layer configurations.
 *
 * @module shared/validation
 */

import type { BaseLayerConfig, LayerValidationError, LayerValidationResult } from "./types";

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validates a layer ID.
 */
export function validateLayerId(id: unknown): LayerValidationError | null {
	if (typeof id !== "string" || id.length === 0) {
		return {
			code: "INVALID_ID",
			message: "Layer ID must be a non-empty string",
			field: "id",
		};
	}

	if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
		return {
			code: "INVALID_ID_FORMAT",
			message: "Layer ID must contain only alphanumeric characters, hyphens, and underscores",
			field: "id",
		};
	}

	return null;
}

/**
 * Validates an ID (alias for validateLayerId for consistency).
 */
export function validateId(id: unknown): LayerValidationError | null {
	return validateLayerId(id);
}

/**
 * Validates opacity value (0-1).
 */
export function validateOpacity(opacity: unknown): LayerValidationError | null {
	if (opacity === undefined || opacity === null) {
		return null; // Optional field
	}

	if (typeof opacity !== "number" || Number.isNaN(opacity)) {
		return {
			code: "INVALID_OPACITY",
			message: "Opacity must be a number",
			field: "opacity",
		};
	}

	if (opacity < 0 || opacity > 1) {
		return {
			code: "OPACITY_OUT_OF_RANGE",
			message: "Opacity must be between 0 and 1",
			field: "opacity",
			context: { value: opacity },
		};
	}

	return null;
}

/**
 * Validates zoom level.
 */
export function validateZoom(
	zoom: unknown,
	field: "minzoom" | "maxzoom",
): LayerValidationError | null {
	if (zoom === undefined || zoom === null) {
		return null; // Optional field
	}

	if (typeof zoom !== "number" || Number.isNaN(zoom)) {
		return {
			code: "INVALID_ZOOM",
			message: `${field} must be a number`,
			field,
		};
	}

	if (zoom < 0 || zoom > 24) {
		return {
			code: "ZOOM_OUT_OF_RANGE",
			message: `${field} must be between 0 and 24`,
			field,
			context: { value: zoom },
		};
	}

	return null;
}

/**
 * Validates base layer configuration.
 */
export function validateBaseLayerConfig(config: unknown): LayerValidationResult {
	const errors: LayerValidationError[] = [];
	const warnings: LayerValidationError[] = [];

	if (typeof config !== "object" || config === null) {
		errors.push({
			code: "INVALID_CONFIG",
			message: "Layer configuration must be an object",
		});
		return { valid: false, errors, warnings };
	}

	const cfg = config as Partial<BaseLayerConfig>;

	// Validate required fields
	const idError = validateLayerId(cfg.id);
	if (idError) {
		errors.push(idError);
	}

	// Validate optional fields
	const opacityError = validateOpacity(cfg.opacity);
	if (opacityError) {
		errors.push(opacityError);
	}

	const minZoomError = validateZoom(cfg.minzoom, "minzoom");
	if (minZoomError) {
		errors.push(minZoomError);
	}

	const maxZoomError = validateZoom(cfg.maxzoom, "maxzoom");
	if (maxZoomError) {
		errors.push(maxZoomError);
	}

	// Validate zoom range consistency
	if (
		cfg.minzoom !== undefined &&
		cfg.maxzoom !== undefined &&
		typeof cfg.minzoom === "number" &&
		typeof cfg.maxzoom === "number" &&
		cfg.minzoom > cfg.maxzoom
	) {
		errors.push({
			code: "INVALID_ZOOM_RANGE",
			message: "minzoom must be less than or equal to maxzoom",
			field: "minzoom",
			context: { minzoom: cfg.minzoom, maxzoom: cfg.maxzoom },
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Validates that minzoom is less than or equal to maxzoom.
 *
 * @param minzoom - Minimum zoom level
 * @param maxzoom - Maximum zoom level
 * @returns Error if range is invalid, null if valid
 */
export function validateZoomRange(
	minzoom: number | undefined,
	maxzoom: number | undefined,
): LayerValidationError | null {
	// If both are undefined, range is valid (no constraints)
	if (minzoom === undefined && maxzoom === undefined) {
		return null;
	}

	// If only one is defined, range is valid
	if (minzoom === undefined || maxzoom === undefined) {
		return null;
	}

	// Both are defined, check that min <= max
	if (typeof minzoom === "number" && typeof maxzoom === "number") {
		if (minzoom > maxzoom) {
			return {
				code: "INVALID_ZOOM_RANGE",
				message: "minzoom must be less than or equal to maxzoom",
				field: "minzoom",
				context: { minzoom, maxzoom },
			};
		}
	}

	return null;
}
