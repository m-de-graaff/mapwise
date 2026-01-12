/**
 * 3D buildings layer factory function.
 *
 * Creates a fill-extrusion layer for 3D building visualization.
 *
 * @module buildings3d/buildings-3d-layer
 */

import type { MapLibreLayerDefinition } from "@mapwise/core";
import type { FillExtrusionLayerSpecification, StyleSpecification } from "maplibre-gl";
import { validateBaseLayerConfig } from "../shared/validation";
import type { BuildingCandidate, Buildings3dLayerConfig } from "./types";

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates 3D buildings layer configuration.
 */
export function validateBuildings3dConfig(config: unknown): void {
	const baseResult = validateBaseLayerConfig(config);
	if (!baseResult.valid) {
		throw new Error(`Invalid buildings3d layer config: ${baseResult.errors[0]?.message}`);
	}

	const cfg = config as Partial<Buildings3dLayerConfig>;
	validateRequiredFields(cfg);
	validatePropertyFields(cfg);
	validateOptionalNumericFields(cfg);
}

function validateRequiredFields(cfg: Partial<Buildings3dLayerConfig>): void {
	if (!cfg.sourceId || typeof cfg.sourceId !== "string") {
		throw new Error("Buildings3d layer requires 'sourceId' property (string)");
	}

	if (!cfg.sourceLayer || typeof cfg.sourceLayer !== "string") {
		throw new Error("Buildings3d layer requires 'sourceLayer' property (string)");
	}

	if (cfg.heightProperty === undefined) {
		throw new Error(
			"Buildings3d layer requires 'heightProperty' property (string property name or number default value)",
		);
	}
}

function validatePropertyFields(cfg: Partial<Buildings3dLayerConfig>): void {
	if (typeof cfg.heightProperty !== "string" && typeof cfg.heightProperty !== "number") {
		throw new Error(
			"Buildings3d layer 'heightProperty' must be a string (property name) or number (default value)",
		);
	}

	if (
		cfg.baseProperty !== undefined &&
		typeof cfg.baseProperty !== "string" &&
		typeof cfg.baseProperty !== "number"
	) {
		throw new Error(
			"Buildings3d layer 'baseProperty' must be a string (property name) or number (default value)",
		);
	}
}

function validateOptionalNumericFields(cfg: Partial<Buildings3dLayerConfig>): void {
	if (cfg.minZoom !== undefined && (typeof cfg.minZoom !== "number" || cfg.minZoom < 0)) {
		throw new Error("Buildings3d layer 'minZoom' must be a non-negative number");
	}

	if (
		cfg.opacity !== undefined &&
		(typeof cfg.opacity !== "number" || cfg.opacity < 0 || cfg.opacity > 1)
	) {
		throw new Error("Buildings3d layer 'opacity' must be a number between 0 and 1");
	}
}

// =============================================================================
// Layer Specification Creation
// =============================================================================

/**
 * Creates a fill-extrusion layer specification from configuration.
 */
function createFillExtrusionLayerSpec(
	layerId: string,
	sourceId: string,
	sourceLayer: string,
	heightProperty: string | number,
	baseProperty: string | number | undefined,
	minZoom: number | undefined,
	color: string | undefined,
	opacity: number | undefined,
): FillExtrusionLayerSpecification {
	// Create height expression
	// If string: property name (with default fallback if missing)
	// If number: literal value
	const heightValue: unknown =
		typeof heightProperty === "string"
			? ["coalesce", ["get", heightProperty], 10] // Default to 10 if property not found
			: heightProperty;

	const baseValue: unknown | undefined =
		baseProperty !== undefined
			? typeof baseProperty === "string"
				? ["coalesce", ["get", baseProperty], 0]
				: baseProperty
			: undefined;

	const layer: FillExtrusionLayerSpecification = {
		id: layerId,
		type: "fill-extrusion",
		source: sourceId,
		"source-layer": sourceLayer,
		paint: {
			"fill-extrusion-height": heightValue as NonNullable<
				NonNullable<FillExtrusionLayerSpecification["paint"]>["fill-extrusion-height"]
			>,
			"fill-extrusion-opacity": opacity ?? 0.8,
			"fill-extrusion-color": color || "#aaaaaa",
		},
	};

	if (minZoom !== undefined) {
		layer.minzoom = minZoom;
	}

	if (baseValue !== undefined && layer.paint) {
		const paint = layer.paint;
		paint["fill-extrusion-base"] = baseValue as NonNullable<
			NonNullable<FillExtrusionLayerSpecification["paint"]>["fill-extrusion-base"]
		>;
	}

	return layer;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a 3D buildings layer definition with fill-extrusion.
 *
 * This creates a MapLibre fill-extrusion layer that extrudes building polygons
 * from a vector tile source to create 3D buildings. The layer requires an
 * existing vector source that contains building data.
 *
 * @param config - Buildings3d layer configuration
 * @returns LayerDefinition that can be registered with @mapwise/core
 *
 * @example
 * ```typescript
 * // Simple 3D buildings with height from property
 * const layer = createBuildings3DLayer({
 *   id: 'buildings-3d',
 *   sourceId: 'openmaptiles',
 *   sourceLayer: 'building',
 *   heightProperty: 'height',
 *   minZoom: 13,
 * });
 *
 * // With default height and base
 * const layer = createBuildings3DLayer({
 *   id: 'buildings-3d',
 *   sourceId: 'openmaptiles',
 *   sourceLayer: 'building',
 *   heightProperty: 20, // Default height if property missing
 *   baseProperty: 0,
 *   color: '#cccccc',
 *   opacity: 0.9,
 * });
 * ```
 */
export function createBuildings3DLayer(config: Buildings3dLayerConfig): MapLibreLayerDefinition {
	// Validate config
	validateBuildings3dConfig(config);

	const {
		id,
		sourceId,
		sourceLayer,
		heightProperty,
		baseProperty,
		minZoom = 13,
		color,
		opacity,
		category,
		metadata,
		title,
		attribution,
	} = config;

	// Create layer specification
	const layerSpec = createFillExtrusionLayerSpec(
		id,
		sourceId,
		sourceLayer,
		heightProperty,
		baseProperty,
		minZoom,
		color,
		opacity,
	);

	// Build metadata
	const layerMetadata: {
		title?: string;
		attribution?: string;
		minZoom?: number;
		[key: string]: unknown;
	} = {
		...(metadata || {}),
	};

	if (title) {
		layerMetadata.title = title;
	}
	if (attribution) {
		layerMetadata.attribution = attribution;
	}
	if (minZoom !== undefined) {
		layerMetadata.minZoom = minZoom;
	}

	return {
		id,
		type: "buildings3d",
		category: category || "overlay",
		layers: [layerSpec],
		metadata: layerMetadata,
		// No source - uses existing sourceId
	};
}

/**
 * Alias for createBuildings3DLayer with lowercase 'd' for consistency with naming conventions.
 * @see createBuildings3DLayer
 */
export const createBuildings3dLayer = createBuildings3DLayer;

// =============================================================================
// Auto-Detection Helper
// =============================================================================

/**
 * Finds candidate building layers in a MapLibre style JSON.
 *
 * This is a best-effort helper that analyzes a style specification to find
 * potential building layers that could be used for 3D extrusion.
 *
 * @param styleJson - MapLibre style specification
 * @returns Array of candidate building layers, sorted by confidence (highest first)
 *
 * @example
 * ```typescript
 * const style = await fetch('https://example.com/style.json').then(r => r.json());
 * const candidates = findCandidateBuildingLayer(style);
 *
 * if (candidates.length > 0) {
 *   const best = candidates[0];
 *   const layer = createBuildings3DLayer({
 *     id: 'buildings-3d',
 *     sourceId: best.sourceId,
 *     sourceLayer: best.sourceLayer,
 *     heightProperty: best.heightProperty || 'height',
 *   });
 * }
 * ```
 */
export function findCandidateBuildingLayer(styleJson: StyleSpecification): BuildingCandidate[] {
	const candidates: BuildingCandidate[] = [];

	if (!(styleJson.layers && Array.isArray(styleJson.layers))) {
		return candidates;
	}

	// Common building-related keywords to look for
	const buildingKeywords = [
		"building",
		"buildings",
		"structure",
		"structures",
		"edifice",
		"facility",
	];

	// Common height property names
	const heightProperties = [
		"height",
		"building:height",
		"building_height",
		"elevation",
		"levels",
		"min_height",
	];

	// Common base property names
	const baseProperties = ["min_height", "base_height", "base", "ground"];

	// Iterate through layers
	for (const layer of styleJson.layers) {
		const candidate = processLayer(
			layer,
			styleJson,
			buildingKeywords,
			heightProperties,
			baseProperties,
		);
		if (candidate) {
			candidates.push(candidate);
		}
	}

	// Sort by confidence (highest first)
	candidates.sort((a, b) => b.confidence - a.confidence);

	return candidates;
}

function processLayer(
	layer: StyleSpecification["layers"][number],
	styleJson: StyleSpecification,
	buildingKeywords: string[],
	heightProperties: string[],
	baseProperties: string[],
): BuildingCandidate | null {
	if (layer.type !== "fill" && layer.type !== "fill-extrusion") {
		return null; // Only interested in fill/fill-extrusion layers
	}

	const sourceLayer = (layer as { "source-layer"?: string })["source-layer"];
	if (!sourceLayer) {
		return null; // Need a source-layer for vector tiles
	}

	const sourceId = (layer as { source?: string }).source;
	if (!(sourceId && styleJson.sources?.[sourceId])) {
		return null; // Source must exist
	}

	// Check if source is a vector source
	const source = styleJson.sources[sourceId];
	if (source.type !== "vector") {
		return null; // Only vector sources can have building data
	}

	const confidence = calculateConfidence(layer, sourceLayer, buildingKeywords);
	const properties = detectProperties(layer, heightProperties, baseProperties);

	return createCandidate(sourceId, sourceLayer, layer.id, confidence, properties);
}

function calculateConfidence(
	layer: StyleSpecification["layers"][number],
	sourceLayer: string,
	buildingKeywords: string[],
): number {
	let confidence = 0.5; // Base confidence

	const layerId = layer.id.toLowerCase();
	// Check layer ID for building keywords
	for (const keyword of buildingKeywords) {
		if (layerId.includes(keyword)) {
			confidence += 0.3;
			break;
		}
	}

	// Check source-layer name for building keywords
	const sourceLayerLower = sourceLayer.toLowerCase();
	for (const keyword of buildingKeywords) {
		if (sourceLayerLower.includes(keyword)) {
			confidence += 0.2;
			break;
		}
	}

	// Check if already a fill-extrusion layer
	if (layer.type === "fill-extrusion") {
		confidence += 0.3;
	}

	return confidence;
}

function detectProperties(
	layer: StyleSpecification["layers"][number],
	heightProperties: string[],
	baseProperties: string[],
): { heightProperty?: string; baseProperty?: string; confidenceBoost: number } {
	let detectedHeightProperty: string | undefined;
	let detectedBaseProperty: string | undefined;
	let confidenceBoost = 0;

	if (layer.type === "fill-extrusion") {
		const paint = (layer as FillExtrusionLayerSpecification).paint;
		if (paint) {
			detectedBaseProperty = extractBaseProperty(paint);
			const heightValue = paint["fill-extrusion-height"];
			// If height is an expression with "get", extract property name
			if (Array.isArray(heightValue)) {
				detectedHeightProperty = extractPropertyFromExpression(heightValue);
				if (detectedHeightProperty) {
					confidenceBoost = 0.2; // Boost confidence if we found height property
				}
			}
		}
	}

	// Guess height property if not detected
	if (!detectedHeightProperty) {
		detectedHeightProperty = heightProperties[0]; // Use first common property as guess
	}
	if (!detectedBaseProperty) {
		detectedBaseProperty = baseProperties[0]; // Use first common base property as guess
	}

	const result: { heightProperty?: string; baseProperty?: string; confidenceBoost: number } = {
		confidenceBoost,
	};
	if (detectedHeightProperty !== undefined) {
		result.heightProperty = detectedHeightProperty;
	}
	if (detectedBaseProperty !== undefined) {
		result.baseProperty = detectedBaseProperty;
	}

	return result;
}

function createCandidate(
	sourceId: string,
	sourceLayer: string,
	layerId: string,
	baseConfidence: number,
	properties: { heightProperty?: string; baseProperty?: string; confidenceBoost: number },
): BuildingCandidate {
	const candidate: BuildingCandidate = {
		sourceId,
		sourceLayer,
		layerId,
		confidence: Math.min(1.0, baseConfidence + properties.confidenceBoost),
	};

	if (properties.heightProperty !== undefined) {
		candidate.heightProperty = properties.heightProperty;
	}
	if (properties.baseProperty !== undefined) {
		candidate.baseProperty = properties.baseProperty;
	}

	return candidate;
}

/**
 * Extracts property name from a MapLibre expression.
 * Looks for ["get", "propertyName"] patterns.
 */
function extractPropertyFromExpression(expression: unknown[]): string | undefined {
	// Check if this is a direct ["get", "property"] expression
	if (expression.length >= 2 && expression[0] === "get" && typeof expression[1] === "string") {
		return expression[1];
	}

	// Recursively search for ["get", "property"] in nested expressions
	for (const exprItem of expression) {
		if (Array.isArray(exprItem)) {
			if (exprItem.length >= 2 && exprItem[0] === "get" && typeof exprItem[1] === "string") {
				return exprItem[1];
			}
			// Recurse into nested arrays
			const nested = extractPropertyFromExpression(exprItem);
			if (nested) {
				return nested;
			}
		}
	}

	return undefined;
}

/**
 * Extracts base property from fill-extrusion paint properties.
 */
function extractBaseProperty(paint: FillExtrusionLayerSpecification["paint"]): string | undefined {
	if (!paint) {
		return undefined;
	}

	const baseValue = paint["fill-extrusion-base"];
	if (Array.isArray(baseValue)) {
		return extractPropertyFromExpression(baseValue);
	}

	return undefined;
}
