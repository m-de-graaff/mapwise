/**
 * Shared utility functions
 * @module shared/utils
 */

/**
 * Creates a throttled function that only invokes `func` at most once per every `limit` milliseconds.
 *
 * @param func - The function to throttle
 * @param limit - The throttle wait time in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
	func: T,
	limit: number,
): (...args: Parameters<T>) => void {
	let lastFunc: ReturnType<typeof setTimeout> | undefined;
	let lastRan: number | undefined;

	return function (this: unknown, ...args: Parameters<T>) {
		if (lastRan) {
			if (lastFunc) {
				clearTimeout(lastFunc);
			}
			lastFunc = setTimeout(
				() => {
					if (Date.now() - (lastRan as number) >= limit) {
						func.apply(this, args);
						lastRan = Date.now();
					}
				},
				limit - (Date.now() - lastRan),
			);
		} else {
			func.apply(this, args);
			lastRan = Date.now();
		}
	};
}
