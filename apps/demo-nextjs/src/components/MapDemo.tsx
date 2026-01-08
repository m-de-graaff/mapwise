"use client";

import { type MapController, type SetBasemapResult, createMap } from "@mapwise/core";
import { useCallback, useEffect, useRef, useState } from "react";

// Basemap options
const BASEMAPS = {
	positron: {
		name: "Positron",
		url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
	},
	voyager: {
		name: "Voyager",
		url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
	},
	darkMatter: {
		name: "Dark Matter",
		url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
	},
	osm: {
		name: "OpenStreetMap",
		url: "https://tiles.openfreemap.org/styles/liberty",
	},
} as const;

type BasemapKey = keyof typeof BASEMAPS;

interface EventLogItem {
	id: string;
	time: string;
	name: string;
	detail?: string;
}

interface Toast {
	id: string;
	type: "success" | "error";
	message: string;
}

// Sample GeoJSON data - European capitals
const SAMPLE_DATA = {
	type: "FeatureCollection" as const,
	features: [
		{
			type: "Feature" as const,
			properties: { name: "London", country: "UK" },
			geometry: { type: "Point" as const, coordinates: [-0.1276, 51.5074] },
		},
		{
			type: "Feature" as const,
			properties: { name: "Paris", country: "France" },
			geometry: { type: "Point" as const, coordinates: [2.3522, 48.8566] },
		},
		{
			type: "Feature" as const,
			properties: { name: "Berlin", country: "Germany" },
			geometry: { type: "Point" as const, coordinates: [13.405, 52.52] },
		},
		{
			type: "Feature" as const,
			properties: { name: "Madrid", country: "Spain" },
			geometry: { type: "Point" as const, coordinates: [-3.7038, 40.4168] },
		},
		{
			type: "Feature" as const,
			properties: { name: "Rome", country: "Italy" },
			geometry: { type: "Point" as const, coordinates: [12.4964, 41.9028] },
		},
		{
			type: "Feature" as const,
			properties: { name: "Amsterdam", country: "Netherlands" },
			geometry: { type: "Point" as const, coordinates: [4.9041, 52.3676] },
		},
	],
};

export function MapDemo() {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const controllerRef = useRef<MapController | null>(null);

	const [mapState, setMapState] = useState<string>("uninitialized");
	const [currentBasemap, setCurrentBasemap] = useState<BasemapKey>("positron");
	const [isChangingStyle, setIsChangingStyle] = useState(false);
	const [eventLog, setEventLog] = useState<EventLogItem[]>([]);
	const [toast, setToast] = useState<Toast | null>(null);

	// Demo layers state
	const [layersRegistered, setLayersRegistered] = useState(false);
	const [layerVisible, setLayerVisible] = useState(true);

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

		setEventLog((prev) => [newEvent, ...prev.slice(0, 29)]);
	}, []);

	// Show toast
	const showToast = useCallback((type: "success" | "error", message: string) => {
		const id = `${Date.now()}`;
		setToast({ id, type, message });
		setTimeout(() => setToast(null), 4000);
	}, []);

	// Initialize map
	useEffect(() => {
		if (!mapContainerRef.current || controllerRef.current) {
			return;
		}

		const controller = createMap(mapContainerRef.current, {
			style: BASEMAPS.positron.url,
			center: [4.9, 50.85], // Brussels - center of Europe
			zoom: 4,
		});

		controllerRef.current = controller;

		controller.awaitReady().then(() => {
			setMapState("ready");
			logEvent("map:ready", `ID: ${controller.id}`);
		});

		// Poll state
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

		// Register GeoJSON source
		controller.style.registerSource("capitals", {
			type: "geojson",
			data: SAMPLE_DATA,
		});

		// Register circle layer
		controller.style.registerLayer("capitals-circles", {
			id: "capitals-circles",
			type: "circle",
			source: "capitals",
			paint: {
				"circle-radius": 12,
				"circle-color": "#0d9488",
				"circle-stroke-color": "#ffffff",
				"circle-stroke-width": 3,
				"circle-opacity": 0.9,
			},
		});

		// Register text layer
		controller.style.registerLayer("capitals-labels", {
			id: "capitals-labels",
			type: "symbol",
			source: "capitals",
			layout: {
				"text-field": ["get", "name"],
				"text-offset": [0, 1.8],
				"text-anchor": "top",
				"text-size": 13,
				"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
			},
			paint: {
				"text-color": "#1c1917",
				"text-halo-color": "#ffffff",
				"text-halo-width": 2,
			},
		});

		setLayersRegistered(true);
		setLayerVisible(true);
		logEvent("layer:added", "capitals-circles, capitals-labels");
		showToast("success", "European capitals layer added!");
	}, [logEvent, showToast]);

	// Remove demo layers
	const removeDemoLayers = useCallback(() => {
		const controller = controllerRef.current;
		if (!controller?.isReady) {
			return;
		}

		controller.style.unregisterLayer("capitals-labels");
		controller.style.unregisterLayer("capitals-circles");
		controller.style.unregisterSource("capitals");

		setLayersRegistered(false);
		logEvent("layer:removed", "All demo layers removed");
		showToast("success", "Layers removed");
	}, [logEvent, showToast]);

	// Toggle layer visibility
	const toggleLayerVisibility = useCallback(() => {
		const controller = controllerRef.current;
		if (!(controller?.isReady && layersRegistered)) {
			return;
		}

		const newVisibility = !layerVisible;
		const visibility = newVisibility ? "visible" : "none";

		controller.map.setLayoutProperty("capitals-circles", "visibility", visibility);
		controller.map.setLayoutProperty("capitals-labels", "visibility", visibility);

		setLayerVisible(newVisibility);
		logEvent("layer:visibility", newVisibility ? "visible" : "hidden");
	}, [layerVisible, layersRegistered, logEvent]);

	// Change basemap
	const changeBasemap = useCallback(
		async (key: BasemapKey) => {
			const controller = controllerRef.current;
			if (!controller?.isReady || isChangingStyle || key === currentBasemap) {
				return;
			}

			setIsChangingStyle(true);
			logEvent("style:changeStart", BASEMAPS[key].name);

			try {
				const result: SetBasemapResult = await controller.setBasemap(BASEMAPS[key].url);

				if (result.success) {
					setCurrentBasemap(key);
					logEvent(
						"style:changeComplete",
						`${result.reappliedLayers} layers in ${result.durationMs.toFixed(0)}ms`,
					);
					showToast(
						"success",
						`Switched to ${BASEMAPS[key].name} — ${result.reappliedLayers} layers preserved`,
					);
				} else {
					logEvent("style:changeError", result.error?.message ?? "Unknown error");
					showToast("error", `Failed: ${result.error?.message}`);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unknown error";
				logEvent("style:changeError", message);
				showToast("error", message);
			} finally {
				setIsChangingStyle(false);
			}
		},
		[currentBasemap, isChangingStyle, logEvent, showToast],
	);

	// Fly to Europe
	const flyToEurope = useCallback(() => {
		controllerRef.current?.map.flyTo({
			center: [4.9, 50.85],
			zoom: 4,
			duration: 1500,
		});
		logEvent("map:flyTo", "Europe view");
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
		<>
			{/* Map Section */}
			<section className="map-section">
				<div ref={mapContainerRef} className="map-wrapper" />

				{isChangingStyle && (
					<div className="loading-overlay">
						<div className="spinner" />
						<p className="loading-text">Changing basemap...</p>
					</div>
				)}
			</section>

			{/* Sidebar */}
			<aside className="sidebar">
				{/* Status Card */}
				<div className="card">
					<div className="card-header">
						<h2 className="card-title">
							<span className="card-icon">◉</span>
							Status
						</h2>
					</div>
					<div className="status-grid">
						<div className="status-item">
							<span className="status-label">Map State</span>
							<span className={`status-value ${getStateClass()}`}>{mapState}</span>
						</div>
						<div className="status-item">
							<span className="status-label">Basemap</span>
							<span className="status-value">{BASEMAPS[currentBasemap].name}</span>
						</div>
						<div className="status-item">
							<span className="status-label">Custom Layers</span>
							<span className="status-value">{layersRegistered ? "2" : "0"}</span>
						</div>
					</div>
				</div>

				{/* Basemap Card */}
				<div className="card">
					<div className="card-header">
						<h2 className="card-title">
							<span className="card-icon">◫</span>
							Basemap
						</h2>
					</div>
					<div className="basemap-list">
						{(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
							<button
								key={key}
								type="button"
								className={`basemap-option ${currentBasemap === key ? "active" : ""}`}
								onClick={() => changeBasemap(key)}
								disabled={isChangingStyle || mapState !== "ready"}
							>
								<span className="basemap-radio" />
								<span className="basemap-name">{BASEMAPS[key].name}</span>
							</button>
						))}
					</div>
				</div>

				{/* Layers Card */}
				<div className="card">
					<div className="card-header">
						<h2 className="card-title">
							<span className="card-icon">◈</span>
							Layers
						</h2>
					</div>
					{layersRegistered ? (
						<div className="layer-list">
							<div className="layer-item">
								<div className="layer-info">
									<span className="layer-dot" />
									<span className="layer-name">Capitals</span>
								</div>
								<div
									className={`toggle ${layerVisible ? "active" : ""}`}
									onClick={toggleLayerVisibility}
									onKeyDown={(e) => e.key === "Enter" && toggleLayerVisibility()}
									role="switch"
									aria-checked={layerVisible}
									tabIndex={0}
								/>
							</div>
							<button
								type="button"
								className="btn btn-danger btn-sm btn-block"
								onClick={removeDemoLayers}
								style={{ marginTop: 12 }}
							>
								Remove Layers
							</button>
						</div>
					) : (
						<button
							type="button"
							className="btn btn-primary btn-block"
							onClick={addDemoLayers}
							disabled={mapState !== "ready"}
						>
							<span className="btn-icon">+</span>
							Add European Capitals
						</button>
					)}
				</div>

				{/* Actions Card */}
				<div className="card">
					<div className="card-header">
						<h2 className="card-title">
							<span className="card-icon">⟳</span>
							Actions
						</h2>
					</div>
					<button
						type="button"
						className="btn btn-outline btn-block"
						onClick={flyToEurope}
						disabled={mapState !== "ready"}
					>
						Reset View
					</button>
				</div>

				{/* Event Log Card */}
				<div className="card">
					<div className="card-header">
						<h2 className="card-title">
							<span className="card-icon">≡</span>
							Events
						</h2>
					</div>
					<div className="event-log">
						{eventLog.length === 0 ? (
							<div className="empty-state">Waiting for events...</div>
						) : (
							eventLog.map((event) => (
								<div key={event.id} className="event-item">
									<span className="event-time">{event.time}</span>
									<span className="event-name">{event.name}</span>
									{event.detail && <span className="event-detail">{event.detail}</span>}
								</div>
							))
						)}
					</div>
				</div>
			</aside>

			{/* Toast */}
			{toast && (
				<div className={`toast ${toast.type}`}>
					<span className="toast-icon">{toast.type === "success" ? "✓" : "✕"}</span>
					<span className="toast-message">{toast.message}</span>
				</div>
			)}
		</>
	);
}
