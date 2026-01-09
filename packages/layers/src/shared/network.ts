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
	/**
	 * Request transform callback for modifying URL and RequestInit before fetch.
	 * Used for authentication, signing, or other request modifications.
	 */
	requestTransform?: (
		url: string,
		init?: RequestInit,
	) => Promise<{ url: string; init?: RequestInit }> | { url: string; init?: RequestInit };
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
	const { timeout = 30000, signal: userSignal, headers = {}, requestTransform } = options;

	const { finalUrl, finalInit } = await applyRequestTransform(
		url,
		{ signal: userSignal, headers },
		requestTransform,
	);
	const { finalSignal, timeoutId } = setupAbortSignals(
		timeout,
		finalInit.signal as AbortSignal | undefined,
	);

	try {
		return await executeFetch(finalUrl, finalInit, finalSignal);
	} catch (error) {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		throw handleFetchError(error, finalUrl, timeout, userSignal);
	}
}

async function applyRequestTransform(
	url: string,
	init: RequestInit,
	requestTransform?: FetchOptions["requestTransform"],
): Promise<{ finalUrl: string; finalInit: RequestInit }> {
	if (!requestTransform) {
		return { finalUrl: url, finalInit: init };
	}

	const transformed = await requestTransform(url, init);
	return {
		finalUrl: transformed.url,
		finalInit: transformed.init ?? init,
	};
}

function setupAbortSignals(
	timeout: number,
	userSignalAfterTransform?: AbortSignal,
): { finalSignal: AbortSignal; timeoutId: ReturnType<typeof setTimeout> | null } {
	const controller = new AbortController();
	const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;

	if (!userSignalAfterTransform) {
		return { finalSignal: controller.signal, timeoutId };
	}

	const combinedController = new AbortController();
	const finalSignal = combinedController.signal;

	controller.signal.addEventListener("abort", () => {
		combinedController.abort();
	});
	userSignalAfterTransform.addEventListener("abort", () => {
		combinedController.abort();
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});

	return { finalSignal, timeoutId };
}

async function executeFetch(url: string, init: RequestInit, signal: AbortSignal): Promise<string> {
	const response = await fetch(url, {
		...init,
		signal,
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

	return response.text();
}

function handleFetchError(
	error: unknown,
	url: string,
	timeout: number,
	userSignal?: AbortSignal,
): NetworkError {
	if (error instanceof Error && error.name === "AbortError") {
		return createAbortError(error, url, timeout, userSignal);
	}

	if (error instanceof TypeError && error.message.includes("fetch")) {
		return {
			code: "NETWORK_ERROR",
			message: `Network error: ${error.message}`,
			url,
			cause: error,
		};
	}

	if (isStructuredError(error)) {
		throw error;
	}

	return {
		code: "NETWORK_ERROR",
		message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		url,
		cause: error,
	};
}

function createAbortError(
	error: Error,
	url: string,
	timeout: number,
	userSignal?: AbortSignal,
): NetworkError {
	const wasTimeout = !userSignal?.aborted;
	return {
		code: wasTimeout ? "TIMEOUT" : "ABORTED",
		message: wasTimeout ? `Request timeout after ${timeout}ms` : "Request aborted",
		url,
		context: { timeout },
		cause: error,
	};
}

function isStructuredError(error: unknown): error is NetworkError {
	return typeof error === "object" && error !== null && "code" in error && "message" in error;
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
		Accept: "application/xml, text/xml, */*",
		...options.headers,
	};

	return fetchText(url, { ...options, headers: xmlHeaders });
}
