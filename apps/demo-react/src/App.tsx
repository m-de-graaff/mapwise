import { type MapController, type SetBasemapResult, createMap } from "@mapwise/core";
import { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

// Basemap options
const BASEMAPS = {
	osm: {
		name: "OpenStreetMap",
		url: "https://tiles.openfreemap.org/styles/liberty",
	},
	positron: {
		name: "Positron",
		url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
	},
	darkMatter: {
		name: "Dark Matter",
		url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
	},
	voyager: {
		name: "Voyager",
		url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
	},
} as const;

type BasemapKey = keyof typeof BASEMAPS;

interface EventLogItem {
	id: string;
	time: string;
	name: string;
	detail?: string;
}

interface Notification {
	id: string;
	type: "success" | "error";
	message: string;
}

export function App() {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const controllerRef = useRef<MapController | null>(null);

	const [mapState, setMapState] = useState<string>("uninitialized");
	const [currentBasemap, setCurrentBasemap] = useState<BasemapKey>("osm");
	const [isChangingStyle, setIsChangingStyle] = useState(false);
	const [eventLog, setEventLog] = useState<EventLogItem[]>([]);
	const [notification, setNotification] = useState<Notification | null>(null);

	// Demo layers state
	const [layersRegistered, setLayersRegistered] = useState(false);
	const [pointLayerVisible, setPointLayerVisible] = useState(true);

	// Add event to log
	const logEvent = useCallback((name: string, detail?: string) => {
		const now = new Date();
		const time = now.toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});

		const newEvent: EventLogItem = { id: `${Date.now()}-${Math.random()}`, time, name };
		if (detail !== undefined) {
			newEvent.detail = detail;
		}

		setEventLog((prev) => [newEvent, ...prev.slice(0, 49)]);
	}, []);

	// Show notification
	const showNotification = useCallback((type: "success" | "error", message: string) => {
		const id = `${Date.now()}`;
		setNotification({ id, type, message });
		setTimeout(() => setNotification(null), 3000);
	}, []);

	// Initialize map
	useEffect(() => {
		if (!mapContainerRef.current || controllerRef.current) {
			return;
		}

		const controller = createMap(mapContainerRef.current, {
			style: BASEMAPS.osm.url,
			center: [-74.006, 40.7128], // New York City
			zoom: 11,
		});

		controllerRef.current = controller;

		controller.awaitReady().then(() => {
			const map = controller.map;

			// Subscribe to style events through the map
			map.on("styledata", () => {
				logEvent("style:data", "Style data loaded");
			});

			setMapState("ready");
			logEvent("map:ready", `Map ID: ${controller.id}`);
		});

		// Poll state for demo purposes
		const stateInterval = setInterval(() => {
			if (controllerRef.current) {
				setMapState(controllerRef.current.state);
			}
		}, 500);

		logEvent("map:lifecycle", "creating");

		return () => {
			clearInterval(stateInterval);
			if (controllerRef.current) {
				controllerRef.current.destroy();
				controllerRef.current = null;
			}
		};
	}, [logEvent]);

	// Add demo layers
	const addDemoLayers = useCallback(() => {
		const controller = controllerRef.current;
		if (!controller?.isReady) {
			return;
		}

		// Register a GeoJSON source with some points
		controller.style.registerSource("demo-points", {
			type: "geojson",
			data: {
				type: "FeatureCollection",
				features: [
					{
						type: "Feature",
						properties: { name: "Central Park", type: "park" },
						geometry: { type: "Point", coordinates: [-73.9654, 40.7829] },
					},
					{
						type: "Feature",
						properties: { name: "Times Square", type: "landmark" },
						geometry: { type: "Point", coordinates: [-73.9855, 40.758] },
					},
					{
						type: "Feature",
						properties: { name: "Brooklyn Bridge", type: "landmark" },
						geometry: { type: "Point", coordinates: [-73.9969, 40.7061] },
					},
					{
						type: "Feature",
						properties: { name: "Statue of Liberty", type: "landmark" },
						geometry: { type: "Point", coordinates: [-74.0445, 40.6892] },
					},
					{
						type: "Feature",
						properties: { name: "Empire State Building", type: "landmark" },
						geometry: { type: "Point", coordinates: [-73.9857, 40.7484] },
					},
				],
			},
		});

		// Register circle layer
		controller.style.registerLayer("demo-points-layer", {
			id: "demo-points-layer",
			type: "circle",
			source: "demo-points",
			paint: {
				"circle-radius": 10,
				"circle-color": "#8b5cf6",
				"circle-stroke-color": "#22d3ee",
				"circle-stroke-width": 3,
				"circle-opacity": 0.9,
			},
		});

		// Register text labels
		controller.style.registerLayer("demo-labels-layer", {
			id: "demo-labels-layer",
			type: "symbol",
			source: "demo-points",
			layout: {
				"text-field": ["get", "name"],
				"text-offset": [0, 1.5],
				"text-anchor": "top",
				"text-size": 12,
			},
			paint: {
				"text-color": "#e4e4e7",
				"text-halo-color": "#0a0a0f",
				"text-halo-width": 2,
			},
		});

		setLayersRegistered(true);
		logEvent("layer:added", "demo-points-layer, demo-labels-layer");
		showNotification("success", "Demo layers added!");
	}, [logEvent, showNotification]);

	// Remove demo layers
	const removeDemoLayers = useCallback(() => {
		const controller = controllerRef.current;
		if (!controller?.isReady) {
			return;
		}

		controller.style.unregisterLayer("demo-labels-layer");
		controller.style.unregisterLayer("demo-points-layer");
		controller.style.unregisterSource("demo-points");

		setLayersRegistered(false);
		logEvent("layer:removed", "demo-points-layer, demo-labels-layer");
		showNotification("success", "Demo layers removed");
	}, [logEvent, showNotification]);

	// Toggle point layer visibility
	const togglePointLayer = useCallback(() => {
		const controller = controllerRef.current;
		if (!(controller?.isReady && layersRegistered)) {
			return;
		}

		const map = controller.map;
		const newVisibility = !pointLayerVisible;

		map.setLayoutProperty("demo-points-layer", "visibility", newVisibility ? "visible" : "none");
		map.setLayoutProperty("demo-labels-layer", "visibility", newVisibility ? "visible" : "none");

		setPointLayerVisible(newVisibility);
		logEvent("layer:visibility", `Points: ${newVisibility ? "visible" : "hidden"}`);
	}, [pointLayerVisible, layersRegistered, logEvent]);

	// Change basemap
	const changeBasemap = useCallback(
		async (key: BasemapKey) => {
			const controller = controllerRef.current;
			if (!controller?.isReady || isChangingStyle) {
				return;
			}

			if (key === currentBasemap) {
				return;
			}

			setIsChangingStyle(true);
			logEvent("style:changeStart", `Switching to ${BASEMAPS[key].name}`);

			try {
				const result: SetBasemapResult = await controller.setBasemap(BASEMAPS[key].url);

				if (result.success) {
					setCurrentBasemap(key);
					logEvent(
						"style:changeComplete",
						`${result.reappliedLayers} layers, ${result.reappliedSources} sources reapplied in ${result.durationMs.toFixed(0)}ms`,
					);
					showNotification(
						"success",
						`Switched to ${BASEMAPS[key].name} (${result.reappliedLayers} layers preserved)`,
					);
				} else {
					logEvent("style:changeError", result.error?.message ?? "Unknown error");
					showNotification("error", `Failed: ${result.error?.message}`);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unknown error";
				logEvent("style:changeError", message);
				showNotification("error", `Error: ${message}`);
			} finally {
				setIsChangingStyle(false);
			}
		},
		[currentBasemap, isChangingStyle, logEvent, showNotification],
	);

	// Reset view
	const resetView = useCallback(() => {
		const controller = controllerRef.current;
		if (!controller?.isReady) {
			return;
		}

		controller.map.flyTo({
			center: [-74.006, 40.7128],
			zoom: 11,
			duration: 1500,
		});
		logEvent("map:flyTo", "Reset to NYC");
	}, [logEvent]);

	const getStateClass = () => {
		if (mapState === "ready") {
			return "ready";
		}
		if (mapState === "error") {
			return "error";
		}
		if (mapState === "creating") {
			return "loading";
		}
		return "";
	};

	return (
		<div className="app">
			{/* Sidebar */}
			<aside className="sidebar">
				<header className="sidebar-header">
					<h1>MapWise Demo</h1>
					<p>React + Vite</p>
				</header>

				<div className="sidebar-content">
					{/* Status */}
					<section className="section">
						<h2 className="section-title">Status</h2>
						<div className="status-card">
							<div className="status-row">
								<span className="status-label">Map State</span>
								<span className={`status-value ${getStateClass()}`}>{mapState}</span>
							</div>
							<div className="status-row">
								<span className="status-label">Current Style</span>
								<span className="status-value">{BASEMAPS[currentBasemap].name}</span>
							</div>
							<div className="status-row">
								<span className="status-label">Registered Layers</span>
								<span className="status-value">{layersRegistered ? "2" : "0"}</span>
							</div>
						</div>
					</section>

					{/* Basemap Selection */}
					<section className="section">
						<h2 className="section-title">Basemap</h2>
						<div className="basemap-grid">
							{(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
								<button
									key={key}
									type="button"
									className={`btn basemap-btn ${currentBasemap === key ? "active" : ""}`}
									onClick={() => changeBasemap(key)}
									disabled={isChangingStyle || mapState !== "ready"}
								>
									{BASEMAPS[key].name}
								</button>
							))}
						</div>
					</section>

					{/* Layer Controls */}
					<section className="section">
						<h2 className="section-title">Demo Layers</h2>
						<div className="control-group">
							{layersRegistered ? (
								<>
									<button
										type="button"
										className="btn btn-danger"
										onClick={removeDemoLayers}
										disabled={mapState !== "ready"}
									>
										<span className="btn-icon">✕</span>
										Remove Layers
									</button>
									<div className="layer-item" style={{ padding: "12px 0" }}>
										<span className="layer-name">Points Visible</span>
										<div
											className={`toggle ${pointLayerVisible ? "active" : ""}`}
											onClick={togglePointLayer}
											onKeyDown={(e) => e.key === "Enter" && togglePointLayer()}
											role="switch"
											aria-checked={pointLayerVisible}
											tabIndex={0}
										/>
									</div>
								</>
							) : (
								<button
									type="button"
									className="btn btn-primary"
									onClick={addDemoLayers}
									disabled={mapState !== "ready"}
								>
									<span className="btn-icon">✦</span>
									Add NYC Landmarks
								</button>
							)}
						</div>
					</section>

					{/* Actions */}
					<section className="section">
						<h2 className="section-title">Actions</h2>
						<div className="control-group">
							<button
								type="button"
								className="btn"
								onClick={resetView}
								disabled={mapState !== "ready"}
							>
								<span className="btn-icon">↻</span>
								Reset View
							</button>
						</div>
					</section>

					{/* Event Log */}
					<section className="section">
						<h2 className="section-title">Event Log</h2>
						<div className="event-log">
							{eventLog.length === 0 ? (
								<div className="event-item">
									<span className="event-detail">No events yet...</span>
								</div>
							) : (
								eventLog.map((event) => (
									<div key={event.id} className="event-item">
										<span className="event-time">{event.time}</span>
										<span className="event-name">{event.name}</span>
										{event.detail && (
											<span className="event-detail" title={event.detail}>
												{event.detail}
											</span>
										)}
									</div>
								))
							)}
						</div>
					</section>
				</div>
			</aside>

			{/* Map */}
			<main className="map-container">
				<div ref={mapContainerRef} className="map-wrapper" />

				{/* Loading overlay */}
				{isChangingStyle && (
					<div className="loading-overlay">
						<div className="spinner" />
						<p className="loading-text">Switching basemap...</p>
					</div>
				)}

				{/* Notification */}
				{notification && (
					<div className={`notification ${notification.type}`}>{notification.message}</div>
				)}
			</main>
		</div>
	);
}
