import { describe, expect, it } from "vitest";
import {
	validateBaseLayerConfig,
	validateId,
	validateLayerId,
	validateOpacity,
	validateZoom,
	validateZoomRange,
} from "./validation";

describe("Validation Utilities", () => {
	describe("validateId / validateLayerId", () => {
		it("should return null for valid IDs", () => {
			expect(validateId("valid-id")).toBeNull();
			expect(validateId("valid_id")).toBeNull();
			expect(validateId("valid123")).toBeNull();
			expect(validateLayerId("valid-id")).toBeNull();
		});

		it("should reject empty strings", () => {
			const result = validateId("");
			expect(result).not.toBeNull();
			expect(result?.code).toBe("INVALID_ID");
			expect(result?.field).toBe("id");
		});

		it("should reject non-string values", () => {
			const result = validateId(null);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("INVALID_ID");
		});

		it("should reject IDs with invalid characters", () => {
			const result = validateId("invalid id");
			expect(result).not.toBeNull();
			expect(result?.code).toBe("INVALID_ID_FORMAT");
		});

		it("should reject IDs with special characters", () => {
			expect(validateId("invalid@id")).not.toBeNull();
			expect(validateId("invalid.id")).not.toBeNull();
			expect(validateId("invalid#id")).not.toBeNull();
		});

		it("should allow alphanumeric, hyphens, and underscores", () => {
			expect(validateId("a1b2c3")).toBeNull();
			expect(validateId("a-b-c")).toBeNull();
			expect(validateId("a_b_c")).toBeNull();
			expect(validateId("a1-b2_c3")).toBeNull();
		});
	});

	describe("validateOpacity", () => {
		it("should return null for valid opacity values", () => {
			expect(validateOpacity(0)).toBeNull();
			expect(validateOpacity(0.5)).toBeNull();
			expect(validateOpacity(1)).toBeNull();
		});

		it("should return null for undefined/null (optional field)", () => {
			expect(validateOpacity(undefined)).toBeNull();
			expect(validateOpacity(null)).toBeNull();
		});

		it("should reject non-number values", () => {
			const result = validateOpacity("0.5");
			expect(result).not.toBeNull();
			expect(result?.code).toBe("INVALID_OPACITY");
		});

		it("should reject NaN", () => {
			const result = validateOpacity(Number.NaN);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("INVALID_OPACITY");
		});

		it("should reject values less than 0", () => {
			const result = validateOpacity(-0.1);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("OPACITY_OUT_OF_RANGE");
			expect(result?.context?.value).toBe(-0.1);
		});

		it("should reject values greater than 1", () => {
			const result = validateOpacity(1.1);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("OPACITY_OUT_OF_RANGE");
			expect(result?.context?.value).toBe(1.1);
		});
	});

	describe("validateZoom", () => {
		it("should return null for valid zoom values", () => {
			expect(validateZoom(0, "minzoom")).toBeNull();
			expect(validateZoom(12, "minzoom")).toBeNull();
			expect(validateZoom(24, "maxzoom")).toBeNull();
		});

		it("should return null for undefined/null (optional field)", () => {
			expect(validateZoom(undefined, "minzoom")).toBeNull();
			expect(validateZoom(null, "maxzoom")).toBeNull();
		});

		it("should reject non-number values", () => {
			const result = validateZoom("12", "minzoom");
			expect(result).not.toBeNull();
			expect(result?.code).toBe("INVALID_ZOOM");
			expect(result?.field).toBe("minzoom");
		});

		it("should reject NaN", () => {
			const result = validateZoom(Number.NaN, "maxzoom");
			expect(result).not.toBeNull();
			expect(result?.code).toBe("INVALID_ZOOM");
		});

		it("should reject values less than 0", () => {
			const result = validateZoom(-1, "minzoom");
			expect(result).not.toBeNull();
			expect(result?.code).toBe("ZOOM_OUT_OF_RANGE");
			expect(result?.context?.value).toBe(-1);
		});

		it("should reject values greater than 24", () => {
			const result = validateZoom(25, "maxzoom");
			expect(result).not.toBeNull();
			expect(result?.code).toBe("ZOOM_OUT_OF_RANGE");
			expect(result?.context?.value).toBe(25);
		});
	});

	describe("validateZoomRange", () => {
		it("should return null when both values are undefined", () => {
			expect(validateZoomRange(undefined, undefined)).toBeNull();
		});

		it("should return null when only minzoom is defined", () => {
			expect(validateZoomRange(0, undefined)).toBeNull();
		});

		it("should return null when only maxzoom is defined", () => {
			expect(validateZoomRange(undefined, 24)).toBeNull();
		});

		it("should return null when minzoom <= maxzoom", () => {
			expect(validateZoomRange(0, 24)).toBeNull();
			expect(validateZoomRange(12, 12)).toBeNull();
			expect(validateZoomRange(5, 15)).toBeNull();
		});

		it("should return error when minzoom > maxzoom", () => {
			const result = validateZoomRange(15, 5);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("INVALID_ZOOM_RANGE");
			expect(result?.field).toBe("minzoom");
			expect(result?.context?.minzoom).toBe(15);
			expect(result?.context?.maxzoom).toBe(5);
		});
	});

	describe("validateBaseLayerConfig", () => {
		it("should return valid for correct config", () => {
			const config = {
				id: "valid-layer",
				title: "Valid Layer",
				opacity: 0.5,
				minzoom: 0,
				maxzoom: 24,
			};
			const result = validateBaseLayerConfig(config);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should return invalid for non-object config", () => {
			const result = validateBaseLayerConfig(null);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]?.code).toBe("INVALID_CONFIG");
		});

		it("should return invalid for missing ID", () => {
			const config = {
				title: "No ID",
			};
			const result = validateBaseLayerConfig(config);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === "INVALID_ID")).toBe(true);
		});

		it("should return invalid for invalid opacity", () => {
			const config = {
				id: "valid-layer",
				opacity: 1.5,
			};
			const result = validateBaseLayerConfig(config);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === "OPACITY_OUT_OF_RANGE")).toBe(true);
		});

		it("should return invalid when minzoom > maxzoom", () => {
			const config = {
				id: "valid-layer",
				minzoom: 15,
				maxzoom: 5,
			};
			const result = validateBaseLayerConfig(config);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.code === "INVALID_ZOOM_RANGE")).toBe(true);
		});

		it("should accumulate multiple errors", () => {
			const config = {
				id: "",
				opacity: -1,
				minzoom: 30,
				maxzoom: 5,
			};
			const result = validateBaseLayerConfig(config);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
		});
	});
});
