/**
 * React provider for MapController.
 *
 * Owns the MapController lifecycle and provides it to child components.
 * Handles StrictMode double-mounting correctly.
 *
 * @module react/MapProvider
 */

import type { JSX } from "react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import type { MapOptions } from "../map/create-map";
import { createMap } from "../map/create-map";
import { MapContext, type MapContextValue } from "./MapContext";

/**
 * Props for MapProvider.
 */
export interface MapProviderProps {
	/**
	 * Children to render inside the provider.
	 */
	children: ReactNode;

	/**
	 * Map configuration options.
	 * Changes to options will not recreate the map (use key prop for that).
	 */
	options?: MapOptions;

	/**
	 * Callback when map becomes ready.
	 */
	onReady?: () => void;

	/**
	 * Callback when map encounters an error.
	 * Note: Currently not implemented - reserved for future event bus integration.
	 */
	onError?: (error: { code: string; message: string; recoverable: boolean }) => void;

	/**
	 * CSS class name for the map container.
	 */
	className?: string;

	/**
	 * Inline styles for the map container.
	 */
	style?: React.CSSProperties;

	/**
	 * ID for the map container element.
	 */
	id?: string;
}

/**
 * Default container styles to ensure the map is visible.
 */
const DEFAULT_CONTAINER_STYLE: React.CSSProperties = {
	width: "100%",
	height: "100%",
	position: "relative",
};

/**
 * React provider that owns a MapController and provides it to child components.
 *
 * This component:
 * - Creates and destroys the MapController
 * - Handles React StrictMode double-mounting correctly
 * - Provides the controller via context
 * - Renders the map container element
 *
 * @example
 * ```tsx
 * import { MapProvider, useMap } from '@mapwise/core/react';
 *
 * function App() {
 *   return (
 *     <MapProvider
 *       options={{
 *         style: 'https://demotiles.maplibre.org/style.json',
 *         center: [0, 0],
 *         zoom: 2,
 *       }}
 *       onReady={() => console.log('Map ready!')}
 *       style={{ width: '100vw', height: '100vh' }}
 *     >
 *       <MapControls />
 *     </MapProvider>
 *   );
 * }
 *
 * function MapControls() {
 *   const { controller, isReady } = useMap();
 *
 *   if (!isReady) return <div>Loading...</div>;
 *
 *   return (
 *     <button onClick={() => controller.setBasemap(newStyle)}>
 *       Change Basemap
 *     </button>
 *   );
 * }
 * ```
 */
export function MapProvider(props: MapProviderProps): JSX.Element {
	const { children, options, onReady, className, style, id } = props;
	// Note: onError is reserved for future event bus integration
	// Container ref for the map
	const containerRef = useRef<HTMLDivElement>(null);

	// Track the controller in a ref to handle StrictMode
	const controllerRef = useRef<ReturnType<typeof createMap> | null>(null);

	// Track if we've been unmounted (for StrictMode)
	const unmountedRef = useRef(false);

	// Stable callback refs to avoid dependency issues
	const onReadyRef = useRef(onReady);
	onReadyRef.current = onReady;

	// State version for triggering re-renders on ready state changes
	const [, forceUpdate] = useState(0);

	// Stable options ref to avoid recreating on every render
	const optionsRef = useRef(options);
	optionsRef.current = options;

	// Create the map on mount
	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		// Reset unmounted flag
		unmountedRef.current = false;

		// Clean up any existing controller (for hot reload scenarios)
		const existingController = controllerRef.current;
		if (existingController) {
			// Destroy existing controller to prevent memory leaks on hot reload
			existingController.destroy().catch((error) => {
				console.warn("[@mapwise/core] Error destroying existing controller:", error);
			});
			controllerRef.current = null;
		}

		// Create the controller
		const controller = createMap(container, optionsRef.current);
		controllerRef.current = controller;

		// Force a re-render so children can access the controller
		forceUpdate((v) => v + 1);

		// Set up ready listener with proper cleanup
		let readyCancelled = false;
		controller
			.awaitReady()
			.then(() => {
				// Don't update if unmounted or cancelled (StrictMode cleanup / hot reload)
				if (unmountedRef.current || readyCancelled) {
					return;
				}
				forceUpdate((v) => v + 1);
				onReadyRef.current?.();
			})
			.catch((error) => {
				// Only log if not cancelled (expected during cleanup)
				if (!(readyCancelled || unmountedRef.current)) {
					console.warn("[@mapwise/core] Map ready promise rejected:", error);
				}
			});

		// Cleanup on unmount
		return () => {
			unmountedRef.current = true;
			readyCancelled = true;

			// Destroy controller and clean up all resources
			if (controllerRef.current) {
				controller.destroy().catch((error) => {
					console.warn("[@mapwise/core] Error destroying controller:", error);
				});
				controllerRef.current = null;
			}
		};
	}, []);

	// Subscribe to ready state changes using the stable controller ref
	const subscribe = useCallback((callback: () => void) => {
		const controller = controllerRef.current;
		if (!controller) {
			// No controller yet - return no-op cleanup
			return () => {
				/* intentionally empty */
			};
		}

		// We need access to the event bus to subscribe
		// Since controller doesn't expose it directly, we'll check ready state
		// and set up a polling mechanism as fallback
		let cleanup: (() => void) | undefined;

		// Try to await ready and call back
		controller
			.awaitReady()
			.then(() => {
				if (!unmountedRef.current) {
					callback();
				}
			})
			.catch(() => {
				// Ignore - map may have been destroyed
			});

		return () => {
			cleanup?.();
		};
	}, []);

	const getSnapshot = useCallback(() => {
		return controllerRef.current?.isReady ?? false;
	}, []);

	const getServerSnapshot = useCallback(() => {
		return false; // Never ready on server
	}, []);

	const isReady = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	// Memoize context value
	const contextValue = useMemo<MapContextValue>(
		() => ({
			controller: controllerRef.current,
			isReady,
		}),
		[isReady],
	);

	// Merge styles
	const containerStyle = useMemo(
		() => ({
			...DEFAULT_CONTAINER_STYLE,
			...style,
		}),
		[style],
	);

	return (
		<MapContext.Provider value={contextValue}>
			<div ref={containerRef} className={className} style={containerStyle} id={id} />
			{children}
		</MapContext.Provider>
	);
}
