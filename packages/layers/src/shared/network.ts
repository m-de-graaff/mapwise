/**
 * Network utilities for layer implementations.
 *
 * @module shared/network
 */

// =============================================================================
// Types
// =============================================================================

export interface NetworkError {
	code: "NETWORK_ERROR" | "TIMEOUT" | "ABORTED" | "INVALID_URL" | "HTTP_ERROR" | "PARSE_ERROR";
	message: string;
	url?: string;
	status?: number;
	statusText?: string;
	context?: Record<string, unknown>;
	cause?: unknown;
}

export interface FetchOptions {
	timeout?: number;
	signal?: AbortSignal;
	headers?: Record<string, string>;
}

// =============================================================================
// Network Helpers
// =============================================================================

/**
 * Fetches text content from a URL with timeout and abort support.
 *
 * @param url - URL to fetch
 * @param options - Fetch options (timeout, signal, headers)
 * @returns Promise resolving to text content
 * @throws NetworkError if fetch fails
 */
export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
	const { timeout = 30000, signal: userSignal, headers = {} } = options;

	// Create abort controller for timeout
	const controller = new AbortController();
	const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;

	// Combine signals if user provided one
	let finalSignal = controller.signal;
	if (userSignal) {
		const combinedController = new AbortController();
		finalSignal = combinedController.signal;

		// Abort combined signal if either aborts
		controller.signal.addEventListener("abort", () => {
			combinedController.abort();
		});
		userSignal.addEventListener("abort", () => {
			combinedController.abort();
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		});
	}

	try {
		const response = await fetch(url, {
			signal: finalSignal,
			headers,
		});

		if (!response.ok) {
			const error: NetworkError = {
				code: "HTTP_ERROR",
				message: `HTTP ${response.status}: ${response.statusText}`,
				url,
				status: response.status,
				statusText: response.statusText,
			};
			throw error;
		}

		const text = await response.text();
		return text;
	} catch (error) {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		// Handle abort
		if (error instanceof Error && error.name === "AbortError") {
			// Check if it was a timeout or user abort
			const wasTimeout = !userSignal?.aborted;
			const networkError: NetworkError = {
				code: wasTimeout ? "TIMEOUT" : "ABORTED",
				message: wasTimeout ? `Request timeout after ${timeout}ms` : "Request aborted",
				url,
				context: { timeout },
				cause: error,
			};
			throw networkError;
		}

		// Handle network errors
		if (error instanceof TypeError && error.message.includes("fetch")) {
			const networkError: NetworkError = {
				code: "NETWORK_ERROR",
				message: `Network error: ${error.message}`,
				url,
				cause: error,
			};
			throw networkError;
		}

		// Re-throw structured errors
		if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
			throw error;
		}

		// Wrap unexpected errors
		const networkError: NetworkError = {
			code: "NETWORK_ERROR",
			message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
			url,
			cause: error,
		};
		throw networkError;
	}
}

/**
 * Fetches XML content from a URL.
 * Returns the XML as a string - parsing is handled separately.
 *
 * @param url - URL to fetch
 * @param options - Fetch options (timeout, signal, headers)
 * @returns Promise resolving to XML string
 * @throws NetworkError if fetch fails
 */
export async function fetchXml(url: string, options: FetchOptions = {}): Promise<string> {
	const xmlHeaders = {
		// biome-ignore lint/style/useNamingConvention: HTTP header names are uppercase by convention
		Accept: "application/xml, text/xml, */*",
		...options.headers,
	};

	return fetchText(url, { ...options, headers: xmlHeaders });
}
