/**
 * Assertion utilities for runtime validation.
 *
 * @module utils/assert
 */

/**
 * Assert a condition is true. Throws if false.
 *
 * Use at API boundaries for input validation.
 * Internal code should trust its inputs.
 */
export function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(`[@mapwise/core] ${message}`);
	}
}

/**
 * Assert a value is not null or undefined.
 */
export function assertDefined<T>(value: T | null | undefined, name: string): asserts value is T {
	if (value === null || value === undefined) {
		throw new Error(`[@mapwise/core] ${name} is required but was ${value}`);
	}
}

/**
 * Assert we're in a browser environment.
 */
export function assertBrowser(operation: string): void {
	if (typeof window === "undefined") {
		throw new Error(
			`[@mapwise/core] ${operation} requires a browser environment. This code should not run during SSR.`,
		);
	}
}

/**
 * Type guard for checking if a value is an HTMLElement.
 */
export function isHTMLElement(value: unknown): value is HTMLElement {
	return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}
