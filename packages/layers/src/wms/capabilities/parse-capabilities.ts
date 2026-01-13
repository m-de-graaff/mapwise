/**
 * WMS capabilities XML parsing utilities.
 *
 * @module wms/capabilities/parse-capabilities
 */

import { getXmlText } from "../../shared/parse.js";
import type { WmsCapabilities, WmsCapabilityLayer } from "../types.js";

// =============================================================================
// Version Detection
// =============================================================================

/**
 * Detects WMS version from capabilities document.
 */
function detectWmsVersion(doc: Document): "1.1.1" | "1.3.0" {
	// Check for version in root element or Capability element
	const root = doc.documentElement;
	const version =
		root.getAttribute("version") ||
		getXmlText(doc, "WMT_MS_Capabilities/@version") ||
		getXmlText(doc, "WMS_Capabilities/@version");

	if (version === "1.1.1" || version?.startsWith("1.1")) {
		return "1.1.1";
	}

	// Default to 1.3.0
	return "1.3.0";
}

// =============================================================================
// Service Metadata Parsing
// =============================================================================

/**
 * Parses service metadata (title, abstract, keywords).
 */
function parseServiceMetadata(
	doc: Document,
	version: "1.1.1" | "1.3.0",
): {
	title?: string;
	abstract?: string;
	keywords?: string[];
} {
	const servicePath =
		version === "1.3.0" ? "WMS_Capabilities/Service" : "WMT_MS_Capabilities/Service";

	const title = getXmlText(doc, `${servicePath}/Title`);
	const abstract = getXmlText(doc, `${servicePath}/Abstract`);
	const keywords = parseKeywords(doc, `${servicePath}/KeywordList`);

	const result: { title?: string; abstract?: string; keywords?: string[] } = {};

	if (title) {
		result.title = title;
	}
	if (abstract) {
		result.abstract = abstract;
	}
	if (keywords) {
		result.keywords = keywords;
	}

	return result;
}

/**
 * Parses keywords from KeywordList element.
 */
function parseKeywords(doc: Document, path: string): string[] | undefined {
	// Find KeywordList element
	const keywords: string[] = [];
	const parts = path.split("/").filter(Boolean);
	let current: Node | null = doc;

	for (const part of parts) {
		if (!current) {
			return undefined;
		}

		const children: Element[] = Array.from(current.childNodes).filter(
			(child: Node): child is Element => child.nodeType === Node.ELEMENT_NODE,
		);

		const found: Element | undefined = children.find(
			(child: Element) =>
				child instanceof Element && (child.tagName === part || child.tagName.includes("Keyword")),
		);

		if (!found) {
			return undefined;
		}

		current = found;
	}

	if (!current) {
		return undefined;
	}

	// Find all Keyword elements
	const keywordElements: Element[] = Array.from(current.childNodes).filter(
		(child: Node): child is Element =>
			child.nodeType === Node.ELEMENT_NODE &&
			child instanceof Element &&
			(child.tagName === "Keyword" || child.tagName.includes("Keyword")),
	);

	for (const keywordEl of keywordElements) {
		const keyword = keywordEl.textContent?.trim();
		if (keyword) {
			keywords.push(keyword);
		}
	}

	return keywords.length > 0 ? keywords : undefined;
}

// =============================================================================
// Formats Parsing
// =============================================================================

/**
 * Parses supported formats from capabilities.
 */
function parseFormats(doc: Document, version: "1.1.1" | "1.3.0"): string[] | undefined {
	const capabilityPath =
		version === "1.3.0" ? "WMS_Capabilities/Capability" : "WMT_MS_Capabilities/Capability";
	const formatPath =
		version === "1.3.0"
			? `${capabilityPath}/Request/GetMap/Format`
			: `${capabilityPath}/Request/GetMap/Format`;

	// Try to find Format elements
	const formats: string[] = [];
	const parts = formatPath.split("/").filter(Boolean);
	let current: Node | null = doc;

	for (const part of parts) {
		if (!current) {
			break;
		}

		const children = getChildElements(current);

		if (part === "Format" || part.includes("Format")) {
			collectFormats(children, formats);
			break;
		}

		current = findChildElement(children, part) || null;
	}

	return formats.length > 0 ? formats : undefined;
}

function getChildElements(node: Node): Element[] {
	return Array.from(node.childNodes).filter(
		(child: Node): child is Element => child.nodeType === Node.ELEMENT_NODE,
	);
}

function collectFormats(children: Element[], formats: string[]): void {
	for (const child of children) {
		if (
			child instanceof Element &&
			(child.tagName === "Format" || child.tagName.includes("Format"))
		) {
			const format = child.textContent?.trim();
			if (format) {
				formats.push(format);
			}
		}
	}
}

function findChildElement(children: Element[], tagName: string): Element | undefined {
	return children.find(
		(child: Element) =>
			child instanceof Element && (child.tagName === tagName || child.tagName.includes(tagName)),
	);
}

// =============================================================================
// CRS/SRS Parsing
// =============================================================================

/**
 * Parses supported CRS/SRS codes from capabilities.
 */
function parseCrsList(
	doc: Document,
	version: "1.1.1" | "1.3.0",
): {
	crs?: string[];
	srs?: string[];
} {
	const result: { crs?: string[]; srs?: string[] } = {};

	if (version === "1.3.0") {
		// WMS 1.3.0 uses CRS
		const crsList = parseCrsFromLayer(doc, "WMS_Capabilities/Capability/Layer");
		if (crsList && crsList.length > 0) {
			result.crs = crsList;
		}
	} else {
		// WMS 1.1.1 uses SRS
		const srsList = parseSrsFromLayer(doc, "WMT_MS_Capabilities/Capability/Layer");
		if (srsList && srsList.length > 0) {
			result.srs = srsList;
		}
	}

	return result;
}

/**
 * Parses CRS codes from a layer element (recursive).
 */
function parseCrsFromLayer(doc: Document, layerPath: string): string[] {
	const crsSet = new Set<string>();
	const layer = findElementByPath(doc, layerPath);

	if (!layer) {
		return [];
	}

	// Recursively find all CRS elements
	findCrsRecursive(layer, crsSet);

	return Array.from(crsSet);
}

function findCrsRecursive(element: Element, crsSet: Set<string>): void {
	const children: Element[] = Array.from(element.childNodes).filter(
		(child: Node): child is Element => child.nodeType === Node.ELEMENT_NODE,
	);

	for (const child of children) {
		if (child instanceof Element && (child.tagName === "CRS" || child.tagName.includes("CRS"))) {
			const crs = child.textContent?.trim();
			if (crs) {
				crsSet.add(crs);
			}
		}

		// Recurse into Layer elements
		if (
			child instanceof Element &&
			(child.tagName === "Layer" || child.tagName.includes("Layer"))
		) {
			findCrsRecursive(child, crsSet);
		}
	}
}

/**
 * Parses SRS codes from a layer element (recursive).
 */
function parseSrsFromLayer(doc: Document, layerPath: string): string[] {
	const srsSet = new Set<string>();
	const layer = findElementByPath(doc, layerPath);

	if (!layer) {
		return [];
	}

	// Recursively find all SRS elements
	findSrsRecursive(layer, srsSet);

	return Array.from(srsSet);
}

function findSrsRecursive(element: Element, srsSet: Set<string>): void {
	const children: Element[] = Array.from(element.childNodes).filter(
		(child: Node): child is Element => child.nodeType === Node.ELEMENT_NODE,
	);

	for (const child of children) {
		if (child instanceof Element && (child.tagName === "SRS" || child.tagName.includes("SRS"))) {
			const srs = child.textContent?.trim();
			if (srs) {
				srsSet.add(srs);
			}
		}

		// Recurse into Layer elements
		if (
			child instanceof Element &&
			(child.tagName === "Layer" || child.tagName.includes("Layer"))
		) {
			findSrsRecursive(child, srsSet);
		}
	}
}

// =============================================================================
// Layer Tree Parsing
// =============================================================================

/**
 * Parses the layer tree from capabilities.
 */
function parseLayerTree(doc: Document, version: "1.1.1" | "1.3.0"): WmsCapabilityLayer | undefined {
	const layerPath =
		version === "1.3.0"
			? "WMS_Capabilities/Capability/Layer"
			: "WMT_MS_Capabilities/Capability/Layer";
	const rootLayer = findElementByPath(doc, layerPath);

	if (!rootLayer) {
		return undefined;
	}

	return parseLayerElement(rootLayer, version);
}

/**
 * Parses a single layer element (recursive).
 */
function parseLayerElement(element: Element, version: "1.1.1" | "1.3.0"): WmsCapabilityLayer {
	const layer: WmsCapabilityLayer = {};

	// Parse basic properties
	parseLayerBasicProps(element, layer);

	// Parse CRS/SRS
	parseLayerCrsSrs(element, layer, version);

	// Parse styles
	const styleElements = getChildElementsByTagName(element, "Style");
	if (styleElements.length > 0) {
		layer.styles = parseStyles(styleElements);
	}

	// Parse bounding boxes
	const bboxElements = getChildElementsByTagName(element, "BoundingBox");
	const latLonBBox = getChildElementsByTagName(element, "LatLonBoundingBox");
	bboxElements.push(...latLonBBox);

	if (bboxElements.length > 0) {
		layer.bbox = parseBoundingBoxes(bboxElements);
	}

	// Parse child layers
	const childLayerElements = getChildElementsByTagName(element, "Layer");

	if (childLayerElements.length > 0) {
		layer.layers = childLayerElements.map((childEl) => parseLayerElement(childEl, version));
	}

	return layer;
}

function parseLayerBasicProps(element: Element, layer: WmsCapabilityLayer): void {
	const name = getXmlText(element, "Name");
	const title = getXmlText(element, "Title");
	const abstract = getXmlText(element, "Abstract");

	if (name) {
		layer.name = name;
	}
	if (title) {
		layer.title = title;
	}
	if (abstract) {
		layer.abstract = abstract;
	}
}

function parseLayerCrsSrs(
	element: Element,
	layer: WmsCapabilityLayer,
	version: "1.1.1" | "1.3.0",
): void {
	if (version === "1.3.0") {
		const crsElements = getChildElementsByTagName(element, "CRS");
		if (crsElements.length > 0) {
			const crsList = crsElements.map((el) => el.textContent?.trim() || "").filter(Boolean);
			if (crsList.length > 0) {
				layer.crs = crsList;
			}
		}
	} else {
		const srsElements = getChildElementsByTagName(element, "SRS");
		if (srsElements.length > 0) {
			const srsList = srsElements.map((el) => el.textContent?.trim() || "").filter(Boolean);
			if (srsList.length > 0) {
				layer.srs = srsList;
			}
		}
	}
}

function getChildElementsByTagName(element: Element, tagName: string): Element[] {
	return Array.from(element.childNodes).filter(
		(child: Node): child is Element =>
			child.nodeType === Node.ELEMENT_NODE &&
			child instanceof Element &&
			(child.tagName === tagName || child.tagName.includes(tagName)),
	);
}

function parseStyles(
	styleElements: Element[],
): { name: string; title?: string; abstract?: string }[] {
	return styleElements.map((styleEl) => {
		const name = getXmlText(styleEl, "Name") || "";
		const title = getXmlText(styleEl, "Title");
		const abstract = getXmlText(styleEl, "Abstract");
		const style: { name: string; title?: string; abstract?: string } = { name };
		if (title) {
			style.title = title;
		}
		if (abstract) {
			style.abstract = abstract;
		}
		return style;
	});
}

function parseBoundingBoxes(
	bboxElements: Element[],
): { crs: string; minX: number; minY: number; maxX: number; maxY: number }[] {
	return bboxElements.map((bboxEl) => {
		const crs =
			bboxEl.getAttribute("CRS") ||
			bboxEl.getAttribute("SRS") ||
			bboxEl.getAttribute("crs") ||
			"EPSG:4326";
		const minX = Number.parseFloat(
			bboxEl.getAttribute("minx") ||
				bboxEl.getAttribute("minX") ||
				getXmlText(bboxEl, "west") ||
				"0",
		);
		const minY = Number.parseFloat(
			bboxEl.getAttribute("miny") ||
				bboxEl.getAttribute("minY") ||
				getXmlText(bboxEl, "south") ||
				"0",
		);
		const maxX = Number.parseFloat(
			bboxEl.getAttribute("maxx") ||
				bboxEl.getAttribute("maxX") ||
				getXmlText(bboxEl, "east") ||
				"0",
		);
		const maxY = Number.parseFloat(
			bboxEl.getAttribute("maxy") ||
				bboxEl.getAttribute("maxY") ||
				getXmlText(bboxEl, "north") ||
				"0",
		);

		return { crs, minX, minY, maxX, maxY };
	});
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Finds an element by XPath-like path.
 */
function findElementByPath(node: Node | Document, path: string): Element | null {
	const parts = path.split("/").filter(Boolean);
	let current: Node | null = node;

	for (const part of parts) {
		if (!current) {
			return null;
		}

		const children: Element[] = Array.from(current.childNodes).filter(
			(child: Node): child is Element => child.nodeType === Node.ELEMENT_NODE,
		);

		// Try exact match first
		let found: Element | undefined = children.find(
			(child: Element) => child instanceof Element && child.tagName === part,
		);

		// Try case-insensitive match
		if (!found) {
			found = children.find(
				(child: Element) =>
					child instanceof Element && child.tagName.toLowerCase() === part.toLowerCase(),
			);
		}

		// Try partial match (e.g., "WMT_MS_Capabilities" matches "Capabilities")
		if (!found) {
			found = children.find(
				(child: Element) =>
					child instanceof Element &&
					(child.tagName.includes(part) || part.includes(child.tagName)),
			);
		}

		if (!found) {
			return null;
		}

		current = found;
	}

	if (current && current.nodeType === Node.ELEMENT_NODE) {
		return current as Element;
	}

	return null;
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parses a WMS capabilities XML document.
 *
 * Handles both WMS 1.1.1 and 1.3.0 formats, gracefully handling missing fields.
 *
 * @param xmlDoc - Parsed XML Document from parseXml()
 * @returns Parsed WMS capabilities
 */
export function parseWmsCapabilities(xmlDoc: Document): WmsCapabilities {
	const version = detectWmsVersion(xmlDoc);
	const serviceMeta = parseServiceMetadata(xmlDoc, version);
	const formats = parseFormats(xmlDoc, version);
	const crsInfo = parseCrsList(xmlDoc, version);
	const layer = parseLayerTree(xmlDoc, version);

	const capabilities: WmsCapabilities = {
		version: version,
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
	if (formats) {
		capabilities.formats = formats;
	}
	if (crsInfo.crs) {
		capabilities.crs = crsInfo.crs;
	}
	if (crsInfo.srs) {
		capabilities.srs = crsInfo.srs;
	}
	if (layer) {
		capabilities.layer = layer;
	}

	return capabilities;
}
