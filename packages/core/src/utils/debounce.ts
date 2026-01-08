/**
 * Debounce utility.
 *
 * @module utils/debounce
 */

/**
 * Creates a debounced version of a function.
 *
 * The debounced function delays invoking `fn` until after `wait` milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param fn - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function with a cancel method
 */
export function debounce<T extends (...args: unknown[]) => void>(
	fn: T,
	wait: number,
): T & { cancel: () => void } {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	const debounced = function (this: unknown, ...args: Parameters<T>) {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			timeoutId = null;
			fn.apply(this, args);
		}, wait);
	} as T & { cancel: () => void };

	debounced.cancel = () => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};

	return debounced;
}
