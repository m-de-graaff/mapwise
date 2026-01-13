/**
 * Authentication Manager for handling tokens.
 *
 * @module request/auth-manager
 */

import type { RequestParameters, RequestTransform, ResourceType, TokenProvider } from "./types.js";

export interface AuthManager extends RequestTransform {
	/**
	 * Register a token provider for a specific domain pattern.
	 * @param pattern Regex to match URLs (e.g., /api\.mapbox\.com/)
	 * @param provider The token provider
	 */
	registerProvider(pattern: RegExp, provider: TokenProvider): void;

	/**
	 * Manually set a global token (simple use case).
	 */
	setGlobalToken(token: string | null): void;
}

export function createAuthManager(): AuthManager {
	const providers = new Map<RegExp, TokenProvider>();
	let globalToken: string | null = null;

	// Helper to find matching provider
	function findProvider(url: string): TokenProvider | undefined {
		for (const [pattern, provider] of Array.from(providers)) {
			if (pattern.test(url)) {
				return provider;
			}
		}
		return undefined;
	}

	return {
		id: "core-auth-manager",

		registerProvider(pattern: RegExp, provider: TokenProvider) {
			providers.set(pattern, provider);
		},

		setGlobalToken(token: string | null) {
			globalToken = token;
		},

		async transformFetch(
			url: string,
			init?: RequestInit,
		): Promise<{ url: string; init?: RequestInit }> {
			const provider = findProvider(url);
			const token = provider ? await provider.getToken() : globalToken;

			if (!token) {
				return { url, ...(init ? { init } : {}) };
			}

			const initParams = init ? { ...init } : {};
			const headers = new Headers(initParams.headers);
			if (!headers.has("Authorization")) {
				headers.set("Authorization", `Bearer ${token}`);
			}

			return {
				url,
				init: {
					...initParams,
					headers,
				},
			};
		},

		transformMapRequest(url: string, _resourceType: ResourceType): RequestParameters | undefined {
			const provider = findProvider(url);
			// Note: This relies on getTokenSync for synchronous map requests
			const token = provider?.getTokenSync ? provider.getTokenSync() : globalToken;

			if (!token) {
				return undefined;
			}

			return {
				url,
				headers: {
					Authorization: `Bearer ${token}`,
				},
			};
		},
	};
}
