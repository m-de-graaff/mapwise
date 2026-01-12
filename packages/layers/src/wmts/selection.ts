/**
 * WMTS selection heuristics for choosing tile matrix sets and formats.
 *
 * @module wmts/selection
 */

import type {
	WmtsCapabilities,
	WmtsCapabilityLayer,
	WmtsFormatSelectionOptions,
	WmtsMatrixSetSelectionOptions,
	WmtsTileMatrixSet,
} from "./types";

// =============================================================================
// Tile Matrix Set Selection
// =============================================================================

/**
 * Selects the best tile matrix set for a layer.
 *
 * Selection priority:
 * 1. Preferred CRS (defaults to EPSG:3857 - Web Mercator)
 * 2. Preferred well-known scale set
 * 3. First available matrix set
 *
 * @param layer - WMTS layer from capabilities
 * @param capabilities - Full WMTS capabilities
 * @param options - Selection options
 * @returns Selected tile matrix set identifier, or undefined if none found
 */
export function selectTileMatrixSet(
	layer: WmtsCapabilityLayer,
	capabilities: WmtsCapabilities,
	options: WmtsMatrixSetSelectionOptions = {},
): string | undefined {
	const { preferredCRS = "EPSG:3857", preferredWellKnownScaleSet } = options;

	// Get available matrix sets for this layer
	const availableMatrixSets = layer.tileMatrixSetLinks
		.map((linkId) => capabilities.tileMatrixSets.find((set) => set.identifier === linkId))
		.filter((set): set is WmtsTileMatrixSet => set !== undefined);

	if (availableMatrixSets.length === 0) {
		return undefined;
	}

	// If well-known scale set is preferred, check for that first
	if (preferredWellKnownScaleSet) {
		const scaleSetMatch = availableMatrixSets.find(
			(set) =>
				set.wellKnownScaleSet === preferredWellKnownScaleSet &&
				(set.supportedCRS === preferredCRS || set.supportedCRS.includes(preferredCRS)),
		);
		if (scaleSetMatch) {
			return scaleSetMatch.identifier;
		}
	}

	// Try to find matrix set matching preferred CRS
	const crsMatch = availableMatrixSets.find(
		(set) => set.supportedCRS === preferredCRS || set.supportedCRS.includes(preferredCRS),
	);

	if (crsMatch) {
		return crsMatch.identifier;
	}

	// Fallback: try to find Web Mercator variants and GoogleMapsCompatible
	const webMercatorVariants = [
		"GoogleMapsCompatible",
		"EPSG:3857",
		"EPSG:900913",
		"EPSG:102113",
		"EPSG:102100",
		"3857",
	];
	for (const variant of webMercatorVariants) {
		const match = availableMatrixSets.find(
			(set) =>
				set.identifier === variant ||
				set.supportedCRS === variant ||
				set.supportedCRS.includes(variant),
		);
		if (match) {
			return match.identifier;
		}
	}

	// Fallback to first available
	return availableMatrixSets[0]?.identifier;
}

// =============================================================================
// Format Selection
// =============================================================================

/**
 * Selects the best format for a layer.
 *
 * Selection priority:
 * 1. Preferred formats in order (defaults to ["image/png", "image/jpeg"])
 * 2. First available format
 *
 * @param layer - WMTS layer from capabilities
 * @param options - Selection options
 * @returns Selected format, or undefined if none found
 */
export function selectFormat(
	layer: WmtsCapabilityLayer,
	options: WmtsFormatSelectionOptions = {},
): string | undefined {
	const { preferredFormats = ["image/png", "image/jpeg"] } = options;

	if (layer.formats.length === 0) {
		return undefined;
	}

	// Try preferred formats in order
	for (const preferred of preferredFormats) {
		const match = layer.formats.find(
			(format) => format.toLowerCase() === preferred.toLowerCase() || format.includes(preferred),
		);
		if (match) {
			return match;
		}
	}

	// Fallback to first available
	return layer.formats[0];
}

// =============================================================================
// Style Selection
// =============================================================================

/**
 * Selects the best style for a layer.
 *
 * Selection priority:
 * 1. Default style (marked as isDefault)
 * 2. First available style
 *
 * @param layer - WMTS layer from capabilities
 * @param preferredStyleId - Optional preferred style identifier
 * @returns Selected style identifier, or undefined if none found
 */
export function selectStyle(
	layer: WmtsCapabilityLayer,
	preferredStyleId?: string,
): string | undefined {
	if (layer.styles.length === 0) {
		return undefined;
	}

	// If preferred style is specified, try to find it
	if (preferredStyleId) {
		const match = layer.styles.find((style) => style.identifier === preferredStyleId);
		if (match) {
			return match.identifier;
		}
	}

	// Try to find default style
	const defaultStyle = layer.styles.find((style) => style.isDefault);
	if (defaultStyle) {
		return defaultStyle.identifier;
	}

	// Fallback to first available
	return layer.styles[0]?.identifier;
}

// =============================================================================
// Resource URL Selection
// =============================================================================

/**
 * Selects the best resource URL template for a layer.
 *
 * @param layer - WMTS layer from capabilities
 * @param resourceType - Resource type (defaults to "tile")
 * @returns Resource URL template, or undefined if none found
 */
export function selectResourceUrl(
	layer: WmtsCapabilityLayer,
	resourceType = "tile",
): string | undefined {
	if (!layer.resourceURLs || layer.resourceURLs.length === 0) {
		return undefined;
	}

	// Try to find exact match
	const exactMatch = layer.resourceURLs.find((url) => url.resourceType === resourceType);
	if (exactMatch) {
		return exactMatch.template;
	}

	// Fallback to first tile resource URL
	const tileMatch = layer.resourceURLs.find((url) => url.resourceType === "tile");
	if (tileMatch) {
		return tileMatch.template;
	}

	// Fallback to first available
	return layer.resourceURLs[0]?.template;
}
