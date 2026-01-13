import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import type { MeasureState } from "./measure-store.js";
import type { Feature } from "geojson";

const SOURCE_ID = "mapwise-measure-source";
const LAYER_FILL = "mapwise-measure-fill";
const LAYER_LINE = "mapwise-measure-line";
const LAYER_POINT = "mapwise-measure-point";
const LAYER_LABEL = "mapwise-measure-label";

/**
 * Manages MapLibre layers for rendering measurements.
 */
export class MeasureRender {
	constructor(private map: MapLibreMap) {}

	mount(): void {
		if (this.map.getSource(SOURCE_ID)) {
			return;
		}

		this.map.addSource(SOURCE_ID, {
			type: "geojson",
			data: { type: "FeatureCollection", features: [] },
		});

		// Fill (for area)
		this.map.addLayer({
			id: LAYER_FILL,
			type: "fill",
			source: SOURCE_ID,
			filter: ["==", "$type", "Polygon"],
			paint: {
				"fill-color": "#fbb03b",
				"fill-opacity": 0.1,
			},
		});

		// Line (for distance and area outline)
		this.map.addLayer({
			id: LAYER_LINE,
			type: "line",
			source: SOURCE_ID,
			layout: {
				"line-cap": "round",
				"line-join": "round",
			},
			paint: {
				"line-color": "#fbb03b",
				"line-width": 2,
				"line-dasharray": [2, 2],
			},
		});

		// Points
		this.map.addLayer({
			id: LAYER_POINT,
			type: "circle",
			source: SOURCE_ID,
			filter: ["==", "$type", "Point"],
			paint: {
				"circle-radius": 3.5,
				"circle-color": "#fff",
				"circle-stroke-color": "#fbb03b",
				"circle-stroke-width": 2,
			},
		});

		// Labels
		this.map.addLayer({
			id: LAYER_LABEL,
			type: "symbol",
			source: SOURCE_ID,
			filter: ["has", "label"],
			layout: {
				"text-field": ["get", "label"],
				"text-font": ["Noto Sans Regular"],
				"text-offset": [0, 1.5],
				"text-anchor": "top",
				"text-size": 14,
			},
			paint: {
				"text-color": "#ffffff",
				"text-halo-color": "#000000",
				"text-halo-width": 2,
			},
		});
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Render logic is inherently complex
	update(state: MeasureState): void {
		const source = this.map.getSource(SOURCE_ID) as GeoJSONSource;
		if (!source) {
			return;
		}

		const features: Feature[] = [];

		if (state.points.length > 0) {
			// Add points
			for (const point of state.points) {
				features.push({
					type: "Feature",
					properties: {},
					geometry: {
						type: "Point",
						coordinates: point,
					},
				});
			}

			// Add line or polygon
			if (state.points.length >= 2) {
				if (state.mode === "area") {
					// Closed loop for area
					const ring = [...state.points];
					if (state.points.length >= 3) {
						features.push({
							type: "Feature",
							properties: {},
							geometry: {
								type: "Polygon",
								coordinates: [ring],
							},
						});
					}
					// Also add the line for the outline
					features.push({
						type: "Feature",
						properties: {},
						geometry: {
							type: "LineString",
							coordinates: state.points,
						},
					});
				} else {
					features.push({
						type: "Feature",
						properties: {},
						geometry: {
							type: "LineString",
							coordinates: state.points,
						},
					});
				}
			}

			// Add label if we have a result
			if (state.result && state.points.length > 0) {
				const lastPoint = state.points[state.points.length - 1];
				if (lastPoint) {
					const labelText = `${state.result.value.toFixed(2)} ${state.result.unit}`;
					features.push({
						type: "Feature",
						properties: {
							label: labelText,
						},
						geometry: {
							type: "Point",
							coordinates: lastPoint,
						},
					});
				}
			}
		}

		source.setData({
			type: "FeatureCollection",
			features,
		});
	}

	unmount(): void {
		if (this.map.getLayer(LAYER_LABEL)) {
			this.map.removeLayer(LAYER_LABEL);
		}
		if (this.map.getLayer(LAYER_POINT)) {
			this.map.removeLayer(LAYER_POINT);
		}
		if (this.map.getLayer(LAYER_LINE)) {
			this.map.removeLayer(LAYER_LINE);
		}
		if (this.map.getLayer(LAYER_FILL)) {
			this.map.removeLayer(LAYER_FILL);
		}

		if (this.map.getSource(SOURCE_ID)) {
			this.map.removeSource(SOURCE_ID);
		}
	}
}
