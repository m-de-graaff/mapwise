/**
 * WMTS capabilities XML parsing utilities.
 *
 * @module wmts/capabilities/parse-capabilities
 */

import { getXmlText } from "../../shared/parse";
import type {
	WmtsCapabilities,
	WmtsCapabilityLayer,
	WmtsDimension,
	WmtsResourceUrl,
	WmtsStyle,
	WmtsTileMatrixDefinition,
	WmtsTileMatrixSet,
} from "../types";

// =============================================================================
// Version Detection
// =============================================================================

/**
 * Detects WMTS version from capabilities document.
 */
function detectWmtsVersion(doc: Document): string {
	const root = doc.documentElement;
	const version =
		root.getAttribute("version") || getXmlText(doc, "Capabilities/@version") || "1.0.0";
	return version;
}

// =============================================================================
// Service Metadata Parsing
// =============================================================================

/**
 * Parses service metadata (title, abstract, keywords).
 */
function parseServiceMetadata(doc: Document): {
	title?: string;
	abstract?: string;
	keywords?: string[];
} {
	const title = getXmlText(doc, "Capabilities/ServiceIdentification/Title");
	const abstract = getXmlText(doc, "Capabilities/ServiceIdentification/Abstract");
	const keywords: string[] = [];

	// Parse keywords
	const keywordElements = Array.from(doc.getElementsByTagName("Keyword"));
	for (const keywordEl of keywordElements) {
		const keyword = keywordEl.textContent?.trim();
		if (keyword) {
			keywords.push(keyword);
		}
	}

	const result: { title?: string; abstract?: string; keywords?: string[] } = {};

	if (title) {
		result.title = title;
	}
	if (abstract) {
		result.abstract = abstract;
	}
	if (keywords.length > 0) {
		result.keywords = keywords;
	}

	return result;
}

// =============================================================================
// Tile Matrix Set Parsing
// =============================================================================

/**
 * Parses tile matrix sets from capabilities.
 */
function parseTileMatrixSets(doc: Document): WmtsTileMatrixSet[] {
	const matrixSets: WmtsTileMatrixSet[] = [];
	const matrixSetElements = doc.getElementsByTagName("TileMatrixSet");

	for (const matrixSetEl of matrixSetElements) {
		if (!(matrixSetEl instanceof Element)) {
			continue;
		}

		const identifier =
			getXmlText(matrixSetEl, "ows:Identifier") || getXmlText(matrixSetEl, "Identifier");
		const supportedCRS =
			getXmlText(matrixSetEl, "ows:SupportedCRS") || getXmlText(matrixSetEl, "SupportedCRS");
		const wellKnownScaleSet =
			getXmlText(matrixSetEl, "ows:WellKnownScaleSet") ||
			getXmlText(matrixSetEl, "WellKnownScaleSet");

		if (!(identifier && supportedCRS)) {
			continue;
		}

		// Parse tile matrices
		const tileMatrices = parseTileMatrices(matrixSetEl);

		const matrixSet: WmtsTileMatrixSet = {
			identifier,
			supportedCRS,
			tileMatrix: tileMatrices,
		};

		if (wellKnownScaleSet) {
			matrixSet.wellKnownScaleSet = wellKnownScaleSet;
		}

		matrixSets.push(matrixSet);
	}

	return matrixSets;
}

function parseTileMatrices(matrixSetEl: Element): WmtsTileMatrixDefinition[] {
	const tileMatrices: WmtsTileMatrixDefinition[] = [];
	const matrixElements = matrixSetEl.getElementsByTagName("TileMatrix");

	for (const matrixEl of matrixElements) {
		if (!(matrixEl instanceof Element)) {
			continue;
		}

		const def = parseTileMatrixDefinition(matrixEl);
		if (def) {
			tileMatrices.push(def);
		}
	}

	// Sort matrices by scale denominator (descending = zoom 0 has highest scale)
	tileMatrices.sort((a, b) => b.scaleDenominator - a.scaleDenominator);

	return tileMatrices;
}

function parseTileMatrixDefinition(matrixEl: Element): WmtsTileMatrixDefinition | null {
	const matrixId = getXmlText(matrixEl, "ows:Identifier") || getXmlText(matrixEl, "Identifier");
	const scaleDenom = getXmlText(matrixEl, "ScaleDenominator");
	const topLeft = getXmlText(matrixEl, "TopLeftCorner");
	const tileWidth = getXmlText(matrixEl, "TileWidth");
	const tileHeight = getXmlText(matrixEl, "TileHeight");
	const matrixWidth = getXmlText(matrixEl, "MatrixWidth");
	const matrixHeight = getXmlText(matrixEl, "MatrixHeight");

	if (
		!(matrixId && scaleDenom && topLeft && tileWidth && tileHeight && matrixWidth && matrixHeight)
	) {
		return null;
	}

	// Parse top-left corner coordinates
	const topLeftParts = topLeft.trim().split(/\s+/);
	if (topLeftParts.length < 2) {
		return null;
	}

	const topLeftX = Number.parseFloat(topLeftParts[0] || "0");
	const topLeftY = Number.parseFloat(topLeftParts[1] || "0");

	if (Number.isNaN(topLeftX) || Number.isNaN(topLeftY)) {
		return null;
	}

	return {
		identifier: matrixId,
		scaleDenominator: Number.parseFloat(scaleDenom),
		topLeftCorner: [topLeftX, topLeftY],
		tileWidth: Number.parseInt(tileWidth, 10),
		tileHeight: Number.parseInt(tileHeight, 10),
		matrixWidth: Number.parseInt(matrixWidth, 10),
		matrixHeight: Number.parseInt(matrixHeight, 10),
	};
}

// =============================================================================
// Layer Parsing
// =============================================================================

/**
 * Parses layers from capabilities.
 */
function parseLayers(doc: Document): WmtsCapabilityLayer[] {
	const layers: WmtsCapabilityLayer[] = [];
	const layerElements = doc.getElementsByTagName("Layer");

	for (const layerEl of layerElements) {
		if (!(layerEl instanceof Element)) {
			continue;
		}

		const layer = parseLayer(layerEl);
		if (layer) {
			layers.push(layer);
		}
	}

	return layers;
}

function parseLayer(layerEl: Element): WmtsCapabilityLayer | null {
	const identifier = getXmlText(layerEl, "ows:Identifier") || getXmlText(layerEl, "Identifier");
	if (!identifier) {
		return null;
	}

	const layer: WmtsCapabilityLayer = {
		identifier,
		formats: parseLayerFormats(layerEl),
		tileMatrixSetLinks: parseLayerMatrixSetLinks(layerEl),
		styles: parseLayerStyles(layerEl),
	};

	// Parse optional properties
	const title = getXmlText(layerEl, "ows:Title") || getXmlText(layerEl, "Title");
	if (title) {
		layer.title = title;
	}

	const abstract = getXmlText(layerEl, "ows:Abstract") || getXmlText(layerEl, "Abstract");
	if (abstract) {
		layer.abstract = abstract;
	}

	const resourceURLs = parseLayerResourceURLs(layerEl);
	if (resourceURLs.length > 0) {
		layer.resourceURLs = resourceURLs;
	}

	const dimensions = parseLayerDimensions(layerEl);
	if (dimensions.length > 0) {
		layer.dimensions = dimensions;
	}

	const bbox = parseLayerBBox(layerEl);
	if (bbox) {
		layer.bbox = bbox;
	}

	return layer;
}

function parseLayerFormats(layerEl: Element): string[] {
	const formats: string[] = [];
	const formatElements = layerEl.getElementsByTagName("Format");
	for (const formatEl of formatElements) {
		const format = formatEl.textContent?.trim();
		if (format) {
			formats.push(format);
		}
	}
	return formats;
}

function parseLayerMatrixSetLinks(layerEl: Element): string[] {
	const links: string[] = [];
	const linkElements = layerEl.getElementsByTagName("TileMatrixSetLink");
	for (const linkEl of linkElements) {
		if (!(linkEl instanceof Element)) {
			continue;
		}
		const linkId =
			getXmlText(linkEl, "TileMatrixSet") ||
			getXmlText(linkEl, "TileMatrixSet/ows:Identifier") ||
			getXmlText(linkEl, "TileMatrixSet/Identifier");
		if (linkId) {
			links.push(linkId);
		}
	}
	return links;
}

function parseLayerStyles(layerEl: Element): WmtsStyle[] {
	const styles: WmtsStyle[] = [];
	const styleElements = layerEl.getElementsByTagName("Style");
	for (const styleEl of styleElements) {
		if (!(styleEl instanceof Element)) {
			continue;
		}
		const styleId = getXmlText(styleEl, "ows:Identifier") || getXmlText(styleEl, "Identifier");
		if (!styleId) {
			continue;
		}

		const style: WmtsStyle = { identifier: styleId };

		const styleTitle = getXmlText(styleEl, "ows:Title") || getXmlText(styleEl, "Title");
		if (styleTitle) {
			style.title = styleTitle;
		}

		if (styleEl.getAttribute("isDefault") === "true") {
			style.isDefault = true;
		}

		const legendURL = parseLegendURL(styleEl);
		if (legendURL) {
			style.legendURL = legendURL;
		}

		styles.push(style);
	}
	return styles;
}

function parseLegendURL(styleEl: Element): string | undefined {
	const legendEl = styleEl.getElementsByTagName("LegendURL")[0];
	if (!(legendEl && legendEl instanceof Element)) {
		return undefined;
	}

	const onlineResource = legendEl.getElementsByTagName("OnlineResource")[0];
	if (onlineResource instanceof Element) {
		return (
			onlineResource.getAttribute("xlink:href") || onlineResource.getAttribute("href") || undefined
		);
	}
	return legendEl.getAttribute("xlink:href") || legendEl.getAttribute("href") || undefined;
}

function parseLayerResourceURLs(layerEl: Element): WmtsResourceUrl[] {
	const resourceURLs: WmtsResourceUrl[] = [];
	const resourceElements = layerEl.getElementsByTagName("ResourceURL");
	for (const resourceEl of resourceElements) {
		if (!(resourceEl instanceof Element)) {
			continue;
		}

		const resourceType = resourceEl.getAttribute("resourceType");
		const template = resourceEl.getAttribute("template");
		const format = resourceEl.getAttribute("format");

		if (resourceType && template) {
			const resourceUrl: WmtsResourceUrl = { resourceType, template };
			if (format) {
				resourceUrl.format = format;
			}
			resourceURLs.push(resourceUrl);
		}
	}
	return resourceURLs;
}

function parseLayerDimensions(layerEl: Element): WmtsDimension[] {
	const dimensions: WmtsDimension[] = [];
	const dimensionElements = layerEl.getElementsByTagName("Dimension");
	for (const dimEl of dimensionElements) {
		if (!(dimEl instanceof Element)) {
			continue;
		}

		const dimId = getXmlText(dimEl, "ows:Identifier") || getXmlText(dimEl, "Identifier");
		if (!dimId) {
			continue;
		}

		const dimension: WmtsDimension = { identifier: dimId };

		const defaultValue = getXmlText(dimEl, "Default");
		if (defaultValue) {
			dimension.default = defaultValue;
		}

		const unitOfMeasure = getXmlText(dimEl, "UOM");
		if (unitOfMeasure) {
			dimension.unitOfMeasure = unitOfMeasure;
		}

		const values = parseDimensionValues(dimEl);
		if (values.length > 0) {
			dimension.values = values;
		}

		dimensions.push(dimension);
	}
	return dimensions;
}

function parseDimensionValues(dimEl: Element): string[] {
	const values: string[] = [];
	const valueElements = dimEl.getElementsByTagName("Value");
	for (const valueEl of valueElements) {
		const value = valueEl.textContent?.trim();
		if (value) {
			values.push(value);
		}
	}
	return values;
}

function parseLayerBBox(
	layerEl: Element,
): { crs: string; minX: number; minY: number; maxX: number; maxY: number } | undefined {
	const bboxEl =
		layerEl.getElementsByTagName("ows:BoundingBox")[0] ||
		layerEl.getElementsByTagName("BoundingBox")[0];

	if (!(bboxEl instanceof Element)) {
		return undefined;
	}

	const crs = bboxEl.getAttribute("crs") || bboxEl.getAttribute("CRS") || "EPSG:4326";
	const lowerCorner = getXmlText(bboxEl, "ows:LowerCorner") || getXmlText(bboxEl, "LowerCorner");
	const upperCorner = getXmlText(bboxEl, "ows:UpperCorner") || getXmlText(bboxEl, "UpperCorner");

	if (!(lowerCorner && upperCorner)) {
		return undefined;
	}

	const lowerParts = lowerCorner.trim().split(/\s+/);
	const upperParts = upperCorner.trim().split(/\s+/);

	if (lowerParts.length < 2 || upperParts.length < 2) {
		return undefined;
	}

	const minX = Number.parseFloat(lowerParts[0] || "0");
	const minY = Number.parseFloat(lowerParts[1] || "0");
	const maxX = Number.parseFloat(upperParts[0] || "0");
	const maxY = Number.parseFloat(upperParts[1] || "0");

	if (Number.isNaN(minX) || Number.isNaN(minY) || Number.isNaN(maxX) || Number.isNaN(maxY)) {
		return undefined;
	}

	return { crs, minX, minY, maxX, maxY };
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parses a WMTS capabilities XML document.
 *
 * @param xmlDoc - Parsed XML Document from parseXml()
 * @returns Parsed WMTS capabilities
 */
export function parseWmtsCapabilities(xmlDoc: Document): WmtsCapabilities {
	const version = detectWmtsVersion(xmlDoc);
	const serviceMeta = parseServiceMetadata(xmlDoc);
	const layers = parseLayers(xmlDoc);
	const tileMatrixSets = parseTileMatrixSets(xmlDoc);

	const capabilities: WmtsCapabilities = {
		version,
		layers,
		tileMatrixSets,
	};

	if (serviceMeta.title) {
		capabilities.title = serviceMeta.title;
	}
	if (serviceMeta.abstract) {
		capabilities.abstract = serviceMeta.abstract;
	}
	if (serviceMeta.keywords) {
		capabilities.keywords = serviceMeta.keywords;
	}

	return capabilities;
}
