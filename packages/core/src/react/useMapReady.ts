/**
 * Hook to track map ready state.
 *
 * @module react/useMapReady
 */

import { useCallback, useSyncExternalStore } from "react";
import { useMap } from "./useMap";

/**
 * Hook to track when the map becomes ready.
 *
 * Uses useSyncExternalStore for efficient subscription without causing
 * unnecessary re-renders.
 *
 * @returns Whether the map is ready for operations
 *
 * @example
 * ```tsx
 * function MapStatus() {
 *   const isReady = useMapReady();
 *
 *   return (
 *     <div className={isReady ? 'status-ready' : 'status-loading'}>
 *       {isReady ? '✓ Map Ready' : '⏳ Loading...'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMapReady(): boolean {
	const { controller } = useMap();

	// Subscribe to ready state changes
	const subscribe = useCallback(
		(callback: () => void) => {
			if (!controller) {
				// No controller yet - return no-op cleanup
				return () => {
					/* intentionally empty */
				};
			}

			// Set up subscription via awaitReady
			let cancelled = false;

			controller
				.awaitReady()
				.then(() => {
					if (!cancelled) {
						callback();
					}
				})
				.catch(() => {
					// Ignore - controller may have been destroyed
				});

			return () => {
				cancelled = true;
			};
		},
		[controller],
	);

	const getSnapshot = useCallback(() => {
		return controller?.isReady ?? false;
	}, [controller]);

	const getServerSnapshot = useCallback(() => {
		return false;
	}, []);

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook that returns a promise that resolves when the map is ready.
 *
 * Useful for async operations that need to wait for the map.
 *
 * @returns Promise that resolves when map is ready
 *
 * @example
 * ```tsx
 * function AsyncMapOperation() {
 *   const { controller } = useMap();
 *   const awaitReady = useAwaitMapReady();
 *
 *   const handleClick = async () => {
 *     await awaitReady();
 *     // Now safe to use controller.map
 *     controller?.map.flyTo({ center: [0, 0], zoom: 10 });
 *   };
 *
 *   return <button onClick={handleClick}>Fly to Origin</button>;
 * }
 * ```
 */
export function useAwaitMapReady(): () => Promise<void> {
	const { controller } = useMap();

	return useCallback(async () => {
		if (!controller) {
			throw new Error("[@mapwise/core] No MapController available");
		}
		return controller.awaitReady();
	}, [controller]);
}
