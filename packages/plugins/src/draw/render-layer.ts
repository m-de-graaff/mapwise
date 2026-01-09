import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection } from "geojson";

const SOURCE_ID = "mapwise-draw-source";
const LAYER_POLYGON_FILL = "mapwise-draw-polygon-fill";
const LAYER_POLYGON_STROKE = "mapwise-draw-polygon-stroke";
const LAYER_LINE = "mapwise-draw-line";
const LAYER_POINT = "mapwise-draw-point";
const _LAYER_VERTEX = "mapwise-draw-vertex"; // Coordinates for editing

/**
 * Manages MapLibre layers for rendering drawn features.
 */
export class RenderLayer {
	constructor(private map: MapLibreMap) {}

	mount(): void {
		if (this.map.getSource(SOURCE_ID)) {
			return;
		}

		this.map.addSource(SOURCE_ID, {
			type: "geojson",
			data: { type: "FeatureCollection", features: [] },
		});

		// Polygon Fill
		this.map.addLayer({
			id: LAYER_POLYGON_FILL,
			type: "fill",
			source: SOURCE_ID,
			filter: ["==", "$type", "Polygon"],
			paint: {
				"fill-color": "#3bb2d0",
				"fill-opacity": 0.2, // 0.1
			},
		});

		// Polygon Stroke
		this.map.addLayer({
			id: LAYER_POLYGON_STROKE,
			type: "line",
			source: SOURCE_ID,
			filter: ["==", "$type", "Polygon"],
			paint: {
				"line-color": "#3bb2d0",
				"line-width": 2,
			},
		});

		// Lines
		this.map.addLayer({
			id: LAYER_LINE,
			type: "line",
			source: SOURCE_ID,
			filter: ["==", "$type", "LineString"],
			paint: {
				"line-color": "#3bb2d0",
				"line-width": 2,
			},
		});

		// Points
		this.map.addLayer({
			id: LAYER_POINT,
			type: "circle",
			source: SOURCE_ID,
			filter: ["==", "$type", "Point"],
			paint: {
				"circle-radius": 5,
				"circle-color": "#3bb2d0",
				"circle-stroke-width": 1,
				"circle-stroke-color": "#fff",
			},
		});
	}

	update(geojson: FeatureCollection): void {
		const source = this.map.getSource(SOURCE_ID) as GeoJSONSource;
		if (source) {
			source.setData(geojson);
		}
	}

	unmount(): void {
		// Remove layers in reverse order of addition
		if (this.map.getLayer(LAYER_POINT)) {
			this.map.removeLayer(LAYER_POINT);
		}
		if (this.map.getLayer(LAYER_LINE)) {
			this.map.removeLayer(LAYER_LINE);
		}
		if (this.map.getLayer(LAYER_POLYGON_STROKE)) {
			this.map.removeLayer(LAYER_POLYGON_STROKE);
		}
		if (this.map.getLayer(LAYER_POLYGON_FILL)) {
			this.map.removeLayer(LAYER_POLYGON_FILL);
		}

		if (this.map.getSource(SOURCE_ID)) {
			this.map.removeSource(SOURCE_ID);
		}
	}
}
