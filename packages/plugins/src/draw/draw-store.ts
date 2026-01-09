import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";

export type DrawMode = "static" | "draw_point" | "draw_line" | "draw_polygon" | "select";

export interface DrawState {
	mode: DrawMode;
	features: Feature[];
	currentFeature: Feature | null;
	currentFeatureId: string | null;
	selectedFeatureId: string | null;
}

export type DrawStoreListener = (state: DrawState) => void;

/**
 * Store for managing drawing state and features.
 */
export class DrawStore {
	private state: DrawState = {
		mode: "static",
		features: [],
		currentFeature: null, // The temporary feature being drawn
		currentFeatureId: null, // ID will be assigned when committed
		selectedFeatureId: null,
	};
	private listeners: Set<DrawStoreListener> = new Set();
	private idCounter = 0;

	/**
	 * Subscribe to state changes.
	 */
	subscribe(listener: DrawStoreListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Get current state.
	 */
	getState(): DrawState {
		return { ...this.state };
	}

	/**
	 * Set drawing mode.
	 */
	setMode(mode: DrawMode): void {
		if (this.state.mode === mode) {
			return;
		}

		// Reset current drawing if switching away from a draw mode
		if (this.isDrawingMode(this.state.mode) && !this.isDrawingMode(mode)) {
			this.cancelDrawing();
		}

		this.state.selectedFeatureId = null;
		this.state.mode = mode;
		this.notify();
	}

	/**
	 * Add a vertex to the current feature.
	 */
	addVertex(lngLat: [number, number]): void {
		if (!this.isDrawingMode(this.state.mode)) {
			return;
		}

		if (this.state.mode === "draw_point") {
			// Point is instant
			const feature: Feature = {
				type: "Feature",
				id: this.generateId(),
				properties: {},
				geometry: {
					type: "Point",
					coordinates: lngLat,
				},
			};
			this.addFeature(feature);
			// We stay in draw_point mode to add more points?
			// Usually draw point tools let you drop multiple points.
		} else if (this.state.mode === "draw_line") {
			if (this.state.currentFeature) {
				// Append to existing line
				const geom = this.state.currentFeature.geometry as LineString;
				geom.coordinates.push(lngLat);
			} else {
				// Start new line
				this.state.currentFeature = {
					type: "Feature",
					properties: {},
					geometry: {
						type: "LineString",
						coordinates: [lngLat],
					},
				};
			}
		} else if (this.state.mode === "draw_polygon") {
			if (this.state.currentFeature) {
				// Append to outer ring
				const geom = this.state.currentFeature.geometry as Polygon;
				if (geom.coordinates[0]) {
					geom.coordinates[0].push(lngLat);
				}
			} else {
				// Start new polygon
				this.state.currentFeature = {
					type: "Feature",
					properties: {},
					geometry: {
						type: "Polygon",
						coordinates: [[lngLat]], // Outer ring
					},
				};
			}
		}
		this.notify();
	}

	/**
	 * Update the last vertex (preview).
	 * Used for showing the line following the mouse cursor.
	 */
	updateLastVertex(_lngLat: [number, number]): void {
		if (!this.state.currentFeature) {
			return;
		}

		const geom = this.state.currentFeature.geometry;
		if (geom.type === "LineString") {
			const coords = geom.coordinates;
			if (coords.length > 0) {
				// If we want a "ghost" line segment, we actually add a temporary vertex
				// But for now, let's assume the UI handles preview or we handle it by *adding* a temporary point?
				// Standard approach: The currentFeature contains committed points.
				// We typically render the "current" feature + a dynamic segment to the mouse.
				// For simplicity here, let's assume we don't mutate the store for mouse move preview
				// unless we want to render it via the same layer source.
				// Let's Skip implementing "rubber band" effect in the store for now to keep it simple,
				// or we can add a transient "cursorVertex".
			}
		}
	}

	/**
	 * Finish the current drawing.
	 */
	finishDrawing(): void {
		if (!this.state.currentFeature) {
			return;
		}

		const feature = this.state.currentFeature;

		// Validate geometry
		if (feature.geometry.type === "LineString") {
			const geom = feature.geometry as LineString;
			if (geom.coordinates.length < 2) {
				this.cancelDrawing();
				return;
			}
		}
		if (feature.geometry.type === "Polygon") {
			const geom = feature.geometry as Polygon;
			const ring = geom.coordinates[0];
			if (!ring || ring.length < 3) {
				this.cancelDrawing();
				return;
			}
			const start = ring[0];
			const end = ring[ring.length - 1];
			// Close the ring if not closed
			if (start && end && (start[0] !== end[0] || start[1] !== end[1])) {
				ring.push(start);
			}
		}

		feature.id = this.generateId();
		this.addFeature(feature);
		this.state.currentFeature = null;
		this.notify();
	}

	/**
	 * Cancel the current drawing.
	 */
	cancelDrawing(): void {
		this.state.currentFeature = null;
		this.notify();
	}

	/**
	 * Delete selected feature.
	 */
	deleteSelected(): void {
		if (!this.state.selectedFeatureId) {
			return;
		}
		this.state.features = this.state.features.filter((f) => f.id !== this.state.selectedFeatureId);
		this.state.selectedFeatureId = null;
		this.notify();
	}

	/**
	 * Select a feature.
	 */
	select(id: string | null): void {
		this.state.selectedFeatureId = id;
		this.notify();
	}

	/**
	 * Get all features as a FeatureCollection.
	 */
	getGeoJSON(): FeatureCollection {
		const features = [...this.state.features];
		if (this.state.currentFeature) {
			features.push(this.state.currentFeature);
		}
		return {
			type: "FeatureCollection",
			features: features,
		};
	}

	/**
	 * Import GeoJSON.
	 */
	setGeoJSON(fc: FeatureCollection): void {
		this.state.features = fc.features.map((f) => ({
			...f,
			id: f.id || this.generateId(),
		}));
		this.state.currentFeature = null;
		this.notify();
	}

	private addFeature(feature: Feature): void {
		this.state.features = [...this.state.features, feature];
	}

	private isDrawingMode(mode: DrawMode): boolean {
		return ["draw_point", "draw_line", "draw_polygon"].includes(mode);
	}

	private generateId(): string {
		this.idCounter++;
		return `draw-${Date.now()}-${this.idCounter}`;
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener({ ...this.state });
		}
	}
}
