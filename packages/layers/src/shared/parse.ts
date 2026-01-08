/**
 * XML parsing utilities for layer implementations.
 *
 * @module shared/parse
 */

// =============================================================================
// Types
// =============================================================================

export interface ParseError {
	code: "PARSE_ERROR" | "INVALID_XML" | "NODE_NOT_FOUND";
	message: string;
	context?: Record<string, unknown>;
	cause?: unknown;
}

// =============================================================================
// Parsing Helpers
// =============================================================================

/**
 * Parses an XML string into a DOM Document.
 *
 * @param xmlString - XML string to parse
 * @returns Parsed XML Document
 * @throws ParseError if parsing fails
 */
export function parseXml(xmlString: string): Document {
	if (typeof xmlString !== "string" || xmlString.length === 0) {
		const error: ParseError = {
			code: "INVALID_XML",
			message: "XML string must be a non-empty string",
		};
		throw error;
	}

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(xmlString, "text/xml");

		// Check for parsing errors
		const parserError = doc.querySelector("parsererror");
		if (parserError) {
			const errorText = parserError.textContent ?? "Unknown parsing error";
			const error: ParseError = {
				code: "PARSE_ERROR",
				message: `XML parsing failed: ${errorText}`,
				context: { errorText },
			};
			throw error;
		}

		return doc;
	} catch (error) {
		// Re-throw structured errors
		if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
			throw error;
		}

		// Wrap unexpected errors
		const parseError: ParseError = {
			code: "PARSE_ERROR",
			message: `Failed to parse XML: ${error instanceof Error ? error.message : String(error)}`,
			cause: error,
		};
		throw parseError;
	}
}

/**
 * Gets text content from an XML node at the specified path.
 *
 * @param node - Root XML node to search
 * @param path - XPath-like path (e.g., "Layer/LayerName" or "Service/Title")
 * @returns Text content of the found node, or null if not found
 */
export function getXmlText(node: Node | Document, path: string): string | null {
	if (!path || typeof path !== "string") {
		return null;
	}

	const parts = path.split("/").filter(Boolean);
	let current: Node | null = node;

	for (const part of parts) {
		if (!current) {
			return null;
		}

		// Try to find child element with matching tag name
		const children: Element[] = Array.from(current.childNodes).filter(
			(child: Node): child is Element => child.nodeType === Node.ELEMENT_NODE,
		);

		const found: Element | undefined = children.find((child: Element) => child.tagName === part);

		if (!found) {
			return null;
		}

		current = found;
	}

	if (!current) {
		return null;
	}

	// Get text content
	const textContent = current.textContent?.trim() ?? null;
	return textContent || null;
}
