import { distanceMetersLine, areaSqMeters } from "../shared/geometry";

export type MeasureMode = "idle" | "distance" | "area";

export interface MeasureResult {
	value: number;
	unit: string;
}

export interface MeasureState {
	mode: MeasureMode;
	points: [number, number][]; // [lng, lat]
	result: MeasureResult | null;
	isFinished: boolean;
}

export type MeasureStoreListener = (state: MeasureState) => void;

/**
 * Store for managing measurement state and calculations.
 */
export class MeasureStore {
	private state: MeasureState = {
		mode: "idle",
		points: [],
		result: null,
		isFinished: false,
	};
	private listeners: Set<MeasureStoreListener> = new Set();

	/**
	 * Subscribe to state changes.
	 */
	subscribe(listener: MeasureStoreListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Get current state.
	 */
	getState(): MeasureState {
		return { ...this.state };
	}

	/**
	 * Set measurement mode.
	 */
	setMode(mode: MeasureMode): void {
		if (this.state.mode === mode) {
			return;
		}

		// Reset when switching modes
		this.reset();
		this.state.mode = mode;
		this.notify();
	}

	/**
	 * Add a point to the measurement.
	 */
	addPoint(lngLat: [number, number]): void {
		if (this.state.mode === "idle" || this.state.isFinished) {
			// If finished, reset and start new measurement
			if (this.state.isFinished && this.state.mode !== "idle") {
				this.resetKeepMode();
				this.state.points.push(lngLat);
				this.notify();
				return;
			}
			return;
		}

		this.state.points.push(lngLat);
		this.calculateResult();
		this.notify();
	}

	/**
	 * Finish the measurement.
	 */
	finish(): void {
		if (this.state.mode === "idle") {
			return;
		}

		// For area, we need at least 3 points.
		if (this.state.mode === "area" && this.state.points.length < 3) {
			// Close the polygon if we have enough points, or just finish?
			// Usually area tools auto-close visually.
		}

		this.state.isFinished = true;
		this.calculateResult();
		this.notify();
	}

	/**
	 * Cancel the measurement.
	 */
	cancel(): void {
		this.reset();
		this.notify();
	}

	/**
	 * Clear all measurements.
	 */
	clear(): void {
		this.reset();
		this.notify();
	}

	/**
	 * Reset state but keep mode.
	 */
	private resetKeepMode(): void {
		this.state.points = [];
		this.state.result = null;
		this.state.isFinished = false;
	}

	private reset(): void {
		this.state.mode = "idle";
		this.resetKeepMode();
	}

	private calculateResult(): void {
		const { points, mode } = this.state;

		if (mode === "distance") {
			if (points.length < 2) {
				this.state.result = { value: 0, unit: "m" };
			} else {
				this.calculateDistance(points);
			}
		} else if (mode === "area") {
			if (points.length < 3) {
				this.state.result = { value: 0, unit: "sqm" };
			} else {
				this.calculateArea(points);
			}
		}
	}

	private calculateDistance(points: [number, number][]): void {
		const meters = distanceMetersLine(points);
		if (meters >= 1000) {
			this.state.result = { value: meters / 1000, unit: "km" };
		} else {
			this.state.result = { value: meters, unit: "m" };
		}
	}

	private calculateArea(points: [number, number][]): void {
		const ring = [...points];
		const start = ring[0];
		if (
			ring.length >= 3 &&
			start &&
			(start[0] !== ring[ring.length - 1][0] || start[1] !== ring[ring.length - 1][1])
		) {
			ring.push(start);
		}

		const sqMeters = areaSqMeters([ring]);
		if (sqMeters >= 1_000_000) {
			this.state.result = { value: sqMeters / 1_000_000, unit: "sqkm" };
		} else if (sqMeters >= 10_000) {
			this.state.result = { value: sqMeters / 10_000, unit: "ha" };
		} else {
			this.state.result = { value: sqMeters, unit: "sqm" };
		}
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener({ ...this.state });
		}
	}
}
