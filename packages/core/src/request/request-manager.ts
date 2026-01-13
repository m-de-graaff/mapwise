/**
 * Central manager for request transformations.
 *
 * @module request/request-manager
 */

import type { RequestParameters, RequestTransform, ResourceType } from "./types.js";

export interface RequestManager {
	/**
	 * Register a request transformer.
	 */
	register(transform: RequestTransform): void;

	/**
	 * Unregister a transformer by ID.
	 */
	unregister(id: string): void;

	/**
	 * Transform a standard fetch request.
	 */
	transformFetch(url: string, init?: RequestInit): Promise<{ url: string; init?: RequestInit }>;

	/**
	 * Transform a MapLibre request (synchronous).
	 */
	transformMapRequest(url: string, resourceType: ResourceType): RequestParameters;

	/**
	 * Enhanced fetch that applies transforms automatically.
	 */
	fetch(url: string, init?: RequestInit): Promise<Response>;
}

export function createRequestManager(): RequestManager {
	const modifiers = new Map<string, RequestTransform>();

	return {
		register(transform: RequestTransform) {
			modifiers.set(transform.id, transform);
		},

		unregister(id: string) {
			modifiers.delete(id);
		},

		async transformFetch(
			url: string,
			init?: RequestInit,
		): Promise<{ url: string; init?: RequestInit }> {
			let currentUrl = url;
			let currentInit = init || {};

			for (const mod of Array.from(modifiers.values())) {
				if (mod.transformFetch) {
					const result = await mod.transformFetch(currentUrl, currentInit);
					currentUrl = result.url;
					currentInit = result.init || {};
				}
			}

			return { url: currentUrl, init: currentInit };
		},

		transformMapRequest(url: string, resourceType: ResourceType): RequestParameters {
			let params: RequestParameters = { url };

			for (const mod of Array.from(modifiers.values())) {
				if (mod.transformMapRequest) {
					const result = mod.transformMapRequest(params.url, resourceType);
					if (result) {
						// Merge result into params
						params = {
							...params,
							...result,
							headers: { ...params.headers, ...result.headers },
						};
					}
				}
			}

			return params;
		},

		async fetch(url: string, init?: RequestInit): Promise<Response> {
			const { url: finalUrl, init: finalInit } = await this.transformFetch(url, init);
			return fetch(finalUrl, finalInit);
		},
	};
}
