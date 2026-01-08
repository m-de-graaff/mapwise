/**
 * URL and query parameter utilities for layer implementations.
 *
 * @module shared/url
 */

// =============================================================================
// Types
// =============================================================================

export interface UrlError {
	code: "INVALID_URL" | "UNSAFE_URL" | "INVALID_PARAMS";
	message: string;
	url?: string;
	context?: Record<string, unknown>;
}

// =============================================================================
// Query Parameter Helpers
// =============================================================================

/**
 * Adds or updates query parameters in a URL.
 *
 * @param url - Base URL
 * @param params - Query parameters to add/update
 * @returns URL with updated query parameters
 */
export function withQuery(
	url: string,
	params: Record<string, string | number | boolean | undefined>,
): string {
	// Get base URL for relative URLs (use a dummy base in Node.js)
	const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
	const parsed = new URL(url, base);

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null) {
			parsed.searchParams.delete(key);
		} else {
			parsed.searchParams.set(key, String(value));
		}
	}
	return parsed.toString();
}

/**
 * Normalizes a URL by stripping fragments and trimming whitespace.
 *
 * @param url - URL to normalize
 * @returns Normalized URL
 */
export function normalizeUrl(url: string): string {
	const trimmed = url.trim();

	// If it looks like an absolute URL, try to parse it
	if (trimmed.includes("://")) {
		try {
			const parsed = new URL(trimmed);
			parsed.hash = ""; // Remove fragment
			return parsed.toString();
		} catch {
			// If parsing fails, return trimmed string
			return trimmed;
		}
	}

	// For relative URLs or invalid URLs, just trim
	return trimmed;
}

/**
 * Validates that a URL is safe to use (not javascript:, data:, etc.).
 *
 * @param url - URL to validate
 * @returns Error object if URL is unsafe, null if safe
 */
export function validateSafeUrl(url: string): UrlError | null {
	if (typeof url !== "string" || url.length === 0) {
		return {
			code: "INVALID_URL",
			message: "URL must be a non-empty string",
			url,
		};
	}

	const trimmed = url.trim().toLowerCase();

	// Block dangerous protocols
	const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
	for (const protocol of dangerousProtocols) {
		if (trimmed.startsWith(protocol)) {
			return {
				code: "UNSAFE_URL",
				message: `URL with protocol "${protocol}" is not allowed`,
				url: url.trim(),
				context: { protocol },
			};
		}
	}

	// Block URLs starting with // (protocol-relative URLs might be OK, but let's be strict)
	if (trimmed.startsWith("//")) {
		// Allow // for protocol-relative URLs (http/https)
		// But block //javascript:, //data:, etc.
		const withoutProtocol = trimmed.slice(2).toLowerCase();
		for (const protocol of dangerousProtocols) {
			if (withoutProtocol.startsWith(protocol.slice(0, -1))) {
				return {
					code: "UNSAFE_URL",
					message: "Protocol-relative URL with unsafe protocol is not allowed",
					url: url.trim(),
				};
			}
		}
	}

	// Validate URL can be parsed (for relative URLs, use a base)
	try {
		// Get base URL for relative URLs (use a dummy base in Node.js)
		const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
		new URL(url, base);
	} catch {
		// If parsing fails, it might still be a valid relative URL
		// Check if it looks reasonable
		if (!/^[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%\-]+$/.test(url.trim())) {
			return {
				code: "INVALID_URL",
				message: "URL contains invalid characters",
				url: url.trim(),
			};
		}
	}

	return null;
}

/**
 * Validates and normalizes a URL, ensuring it's safe to use.
 *
 * @param url - URL to validate and normalize
 * @returns Normalized URL if valid, throws error if invalid
 */
export function safeUrl(url: string): string {
	const error = validateSafeUrl(url);
	if (error) {
		const err = new Error(error.message) as Error & { code: string; url?: string };
		err.code = error.code;
		if (error.url !== undefined) {
			err.url = error.url;
		}
		throw err;
	}
	return normalizeUrl(url);
}
