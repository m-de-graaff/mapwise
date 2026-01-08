import { describe, expect, it } from "vitest";
import {
	isPersistedMapState,
	parsePersistedState,
	stringifyPersistedState,
	validateState,
} from "./hydrate";
import type { PersistedMapState } from "./persistence-types";
import { SCHEMA_VERSION } from "./persistence-types";

describe("persistence validation", () => {
	describe("isPersistedMapState", () => {
		it("should return true for valid state", () => {
			const state: PersistedMapState = {
				version: SCHEMA_VERSION,
				timestamp: Date.now(),
				basemap: "test-style",
				viewport: {
					center: [0, 0],
					zoom: 2,
					bearing: 0,
					pitch: 0,
				},
				layers: [],
				plugins: [],
			};

			expect(isPersistedMapState(state)).toBe(true);
		});

		it("should return false for invalid state", () => {
			expect(isPersistedMapState(null)).toBe(false);
			expect(isPersistedMapState({})).toBe(false);
			expect(isPersistedMapState({ version: 999 })).toBe(false);
		});
	});

	describe("validateState", () => {
		it("should validate correct state", () => {
			const state: PersistedMapState = {
				version: SCHEMA_VERSION,
				timestamp: Date.now(),
				basemap: "test-style",
				viewport: {
					center: [0, 0],
					zoom: 2,
					bearing: 0,
					pitch: 0,
				},
				layers: [],
				plugins: [],
			};

			const result = validateState(state);
			expect(result.valid).toBe(true);
		});

		it("should reject state with invalid version", () => {
			const state = {
				version: 999,
				timestamp: Date.now(),
				basemap: "test-style",
				viewport: {
					center: [0, 0],
					zoom: 2,
					bearing: 0,
					pitch: 0,
				},
			};

			const result = validateState(state);
			expect(result.valid).toBe(false);
		});

		it("should reject state with invalid viewport", () => {
			const state = {
				version: SCHEMA_VERSION,
				timestamp: Date.now(),
				basemap: "test-style",
				viewport: {
					center: [0], // Invalid - should be [lng, lat]
					zoom: 2,
					bearing: 0,
					pitch: 0,
				},
			};

			const result = validateState(state);
			expect(result.valid).toBe(false);
		});
	});

	describe("parsePersistedState", () => {
		it("should parse valid JSON", () => {
			const state: PersistedMapState = {
				version: SCHEMA_VERSION,
				timestamp: Date.now(),
				basemap: "test-style",
				viewport: {
					center: [0, 0],
					zoom: 2,
					bearing: 0,
					pitch: 0,
				},
				layers: [],
				plugins: [],
			};

			const json = JSON.stringify(state);
			const parsed = parsePersistedState(json);

			expect(parsed.version).toBe(SCHEMA_VERSION);
		});

		it("should throw on invalid JSON", () => {
			expect(() => {
				parsePersistedState("invalid json");
			}).toThrow();
		});
	});

	describe("stringifyPersistedState", () => {
		it("should stringify state", () => {
			const state: PersistedMapState = {
				version: SCHEMA_VERSION,
				timestamp: Date.now(),
				basemap: "test-style",
				viewport: {
					center: [0, 0],
					zoom: 2,
					bearing: 0,
					pitch: 0,
				},
				layers: [],
				plugins: [],
			};

			const json = stringifyPersistedState(state);
			expect(typeof json).toBe("string");

			const parsed = JSON.parse(json);
			expect(parsed.version).toBe(SCHEMA_VERSION);
		});
	});
});
