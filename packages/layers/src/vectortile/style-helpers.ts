/**
 * Style helper functions for vector tile layers.
 *
 * These helpers create MapLibre style expressions for common data-driven styling patterns.
 * They are pure functions with no dependencies on UI components.
 *
 * @module vectortile/style-helpers
 */

import type { CategoricalStyleOptions, ChoroplethStyleOptions } from "./types.js";

// =============================================================================
// Choropleth Style (Numeric/Continuous)
// =============================================================================

/**
 * Creates a color stop expression for choropleth styling.
 *
 * Choropleth maps use continuous color scales to represent numeric values.
 * This function creates a MapLibre 'interpolate' expression for smooth color transitions.
 *
 * @param stops - Color stops array, sorted by value (ascending)
 * @param property - Property name to use for data-driven styling
 * @returns MapLibre expression array for use in paint properties
 */
function createColorStops(
	stops: Array<{ value: number; result: string }>,
	property: string,
): unknown[] {
	if (stops.length === 0) {
		return ["get", property];
	}

	if (stops.length === 1) {
		return ["literal", stops[0]?.result || "#000000"];
	}

	// Create interpolate expression: ["interpolate", interpolation, input, stop1_value, stop1_output, stop2_value, stop2_output, ...]
	return [
		"interpolate",
		["linear"], // Linear interpolation for color
		["get", property],
		...stops.flatMap((stop) => [stop.value, stop.result]),
	];
}

/**
 * Creates an opacity stop expression for choropleth styling.
 *
 * @param stops - Opacity stops array, sorted by value (ascending)
 * @param property - Property name to use for data-driven styling
 * @returns MapLibre expression array for use in paint properties
 */
function createOpacityStops(
	stops: Array<{ value: number; result: number }>,
	property: string,
): unknown[] {
	if (stops.length === 0) {
		return ["get", property];
	}

	if (stops.length === 1) {
		return ["literal", stops[0]?.result ?? 1];
	}

	return [
		"interpolate",
		["linear"],
		["get", property],
		...stops.flatMap((stop) => [stop.value, stop.result]),
	];
}

/**
 * Creates style expressions for choropleth (numeric/continuous) data-driven styling.
 *
 * Choropleth maps use continuous color or opacity scales to represent numeric property values.
 * This function creates MapLibre expressions that can be used in paint properties.
 *
 * @param options - Choropleth style configuration
 * @returns Object with color and opacity expressions
 *
 * @example
 * ```typescript
 * const style = createChoroplethStyle({
 *   property: 'population',
 *   colorStops: [
 *     { value: 0, result: '#fee5d9' },
 *     { value: 10000, result: '#de2d26' },
 *   ],
 *   opacityStops: [
 *     { value: 0, result: 0.3 },
 *     { value: 10000, result: 1.0 },
 *   ],
 *   defaultColor: '#cccccc',
 * });
 *
 * // Use in layer spec:
 * // paint: {
 * //   'fill-color': style.color,
 * //   'fill-opacity': style.opacity,
 * // }
 * ```
 */
export function createChoroplethStyle(options: ChoroplethStyleOptions): {
	color?: unknown[];
	opacity?: unknown[];
} {
	const { property, colorStops, opacityStops, defaultColor, defaultOpacity } = options;

	const result: { color?: unknown[]; opacity?: unknown[] } = {};

	if (colorStops && colorStops.length > 0) {
		const stops = colorStops.map((stop) => ({
			value: stop.value,
			result: stop.result as string,
		}));
		const colorExpr = createColorStops(stops, property);
		result.color = defaultColor
			? ["case", ["has", property], colorExpr, ["literal", defaultColor]]
			: colorExpr;
	}

	if (opacityStops && opacityStops.length > 0) {
		const stops = opacityStops.map((stop) => ({
			value: stop.value,
			result: stop.result as number,
		}));
		const opacityExpr = createOpacityStops(stops, property);
		result.opacity =
			defaultOpacity !== undefined
				? ["case", ["has", property], opacityExpr, ["literal", defaultOpacity]]
				: opacityExpr;
	}

	return result;
}

// =============================================================================
// Categorical Style (Discrete)
// =============================================================================

/**
 * Creates a categorical style expression for discrete value mapping.
 *
 * Categorical styles map specific property values to specific colors or other style values.
 * This function creates a MapLibre 'match' expression.
 *
 * @param options - Categorical style configuration
 * @returns MapLibre expression array for use in paint properties
 *
 * @example
 * ```typescript
 * const fillColor = createCategoricalStyle({
 *   property: 'type',
 *   categories: [
 *     { value: 'residential', result: '#ff0000' },
 *     { value: 'commercial', result: '#00ff00' },
 *     { value: 'industrial', result: '#0000ff' },
 *   ],
 *   default: '#cccccc',
 * });
 *
 * // Use in layer: paint: { 'fill-color': fillColor }
 * ```
 */
export function createCategoricalStyle(options: CategoricalStyleOptions): unknown[] {
	const { property, categories, default: defaultValue } = options;

	if (categories.length === 0) {
		return ["literal", defaultValue ?? "#000000"];
	}

	// Create match expression: ["match", input, value1, output1, value2, output2, ..., default]
	const matchExpr: unknown[] = ["match", ["get", property]];

	// Add category mappings
	for (const category of categories) {
		matchExpr.push(category.value, category.result);
	}

	// Add default value
	matchExpr.push(defaultValue ?? "#000000");

	return matchExpr;
}
