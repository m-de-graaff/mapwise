import { describe, expect, it } from "vitest";
import { createCategoricalStyle, createChoroplethStyle } from "./style-helpers";

describe("Vector Tile Style Helpers", () => {
	describe("createChoroplethStyle", () => {
		it("should create color expression from color stops", () => {
			const style = createChoroplethStyle({
				property: "population",
				colorStops: [
					{ value: 0, result: "#fee5d9" },
					{ value: 10000, result: "#de2d26" },
				],
			});

			expect(style.color).toBeDefined();
			expect(Array.isArray(style.color)).toBe(true);
			const colorExpr = style.color as unknown[];
			expect(colorExpr[0]).toBe("interpolate");
			expect(colorExpr[1]).toEqual(["linear"]);
			expect(colorExpr[2]).toEqual(["get", "population"]);
		});

		it("should create opacity expression from opacity stops", () => {
			const style = createChoroplethStyle({
				property: "density",
				opacityStops: [
					{ value: 0, result: 0.3 },
					{ value: 100, result: 1.0 },
				],
			});

			expect(style.opacity).toBeDefined();
			expect(Array.isArray(style.opacity)).toBe(true);
			const opacityExpr = style.opacity as unknown[];
			expect(opacityExpr[0]).toBe("interpolate");
			expect(opacityExpr[2]).toEqual(["get", "density"]);
		});

		it("should create both color and opacity expressions", () => {
			const style = createChoroplethStyle({
				property: "population",
				colorStops: [
					{ value: 0, result: "#fee5d9" },
					{ value: 10000, result: "#de2d26" },
				],
				opacityStops: [
					{ value: 0, result: 0.3 },
					{ value: 10000, result: 1.0 },
				],
			});

			expect(style.color).toBeDefined();
			expect(style.opacity).toBeDefined();
		});

		it("should handle default color when property is missing", () => {
			const style = createChoroplethStyle({
				property: "population",
				colorStops: [
					{ value: 0, result: "#fee5d9" },
					{ value: 10000, result: "#de2d26" },
				],
				defaultColor: "#cccccc",
			});

			expect(style.color).toBeDefined();
			const colorExpr = style.color as unknown[];
			expect(colorExpr[0]).toBe("case");
			expect(colorExpr[1]).toEqual(["has", "population"]);
		});

		it("should handle default opacity when property is missing", () => {
			const style = createChoroplethStyle({
				property: "density",
				opacityStops: [
					{ value: 0, result: 0.3 },
					{ value: 100, result: 1.0 },
				],
				defaultOpacity: 0.5,
			});

			expect(style.opacity).toBeDefined();
			const opacityExpr = style.opacity as unknown[];
			expect(opacityExpr[0]).toBe("case");
			expect(opacityExpr[1]).toEqual(["has", "density"]);
		});

		it("should handle single color stop", () => {
			const style = createChoroplethStyle({
				property: "population",
				colorStops: [{ value: 0, result: "#ff0000" }],
			});

			expect(style.color).toBeDefined();
			const colorExpr = style.color as unknown[];
			expect(colorExpr[0]).toBe("literal");
			expect(colorExpr[1]).toBe("#ff0000");
		});

		it("should not return color when color stops are empty", () => {
			const style = createChoroplethStyle({
				property: "population",
				colorStops: [],
			});

			// When colorStops is empty, color should not be set
			expect(style.color).toBeUndefined();
		});
	});

	describe("createCategoricalStyle", () => {
		it("should create match expression from categories", () => {
			const expr = createCategoricalStyle({
				property: "type",
				categories: [
					{ value: "residential", result: "#ff0000" },
					{ value: "commercial", result: "#00ff00" },
					{ value: "industrial", result: "#0000ff" },
				],
			});

			expect(Array.isArray(expr)).toBe(true);
			expect(expr[0]).toBe("match");
			expect(expr[1]).toEqual(["get", "type"]);
			expect(expr[2]).toBe("residential");
			expect(expr[3]).toBe("#ff0000");
			expect(expr[4]).toBe("commercial");
			expect(expr[5]).toBe("#00ff00");
		});

		it("should include default value", () => {
			const expr = createCategoricalStyle({
				property: "type",
				categories: [
					{ value: "residential", result: "#ff0000" },
					{ value: "commercial", result: "#00ff00" },
				],
				default: "#cccccc",
			});

			expect(expr[expr.length - 1]).toBe("#cccccc");
		});

		it("should use default color if no default specified", () => {
			const expr = createCategoricalStyle({
				property: "type",
				categories: [{ value: "residential", result: "#ff0000" }],
			});

			expect(expr[expr.length - 1]).toBe("#000000");
		});

		it("should handle numeric category values", () => {
			const expr = createCategoricalStyle({
				property: "status",
				categories: [
					{ value: 0, result: "#ff0000" },
					{ value: 1, result: "#00ff00" },
				],
			});

			expect(expr[2]).toBe(0);
			expect(expr[3]).toBe("#ff0000");
			expect(expr[4]).toBe(1);
			expect(expr[5]).toBe("#00ff00");
		});

		it("should handle boolean category values", () => {
			const expr = createCategoricalStyle({
				property: "active",
				categories: [
					{ value: true, result: "#00ff00" },
					{ value: false, result: "#ff0000" },
				],
			});

			expect(expr[2]).toBe(true);
			expect(expr[3]).toBe("#00ff00");
			expect(expr[4]).toBe(false);
			expect(expr[5]).toBe("#ff0000");
		});

		it("should handle empty categories", () => {
			const expr = createCategoricalStyle({
				property: "type",
				categories: [],
				default: "#aaaaaa",
			});

			expect(expr[0]).toBe("literal");
			expect(expr[1]).toBe("#aaaaaa");
		});
	});
});
