import { describe, expect, it } from "vitest";
import { selectFormat, selectStyle, selectTileMatrixSet } from "./selection";
import type { WmtsCapabilities, WmtsCapabilityLayer } from "./types";

describe("WMTS Selection", () => {
	describe("selectTileMatrixSet", () => {
		const mockCapabilities: WmtsCapabilities = {
			version: "1.0.0",
			layers: [],
			tileMatrixSets: [
				{
					identifier: "EPSG:3857",
					supportedCRS: "EPSG:3857",
					tileMatrix: [],
				},
				{
					identifier: "EPSG:4326",
					supportedCRS: "EPSG:4326",
					tileMatrix: [],
				},
				{
					identifier: "EPSG:900913",
					supportedCRS: "EPSG:900913",
					tileMatrix: [],
					wellKnownScaleSet: "urn:ogc:def:wkss:OGC:1.0:GoogleMapsCompatible",
				},
			],
		};

		it("should select preferred CRS", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png"],
				tileMatrixSetLinks: ["EPSG:3857", "EPSG:4326"],
				styles: [],
			};

			const selected = selectTileMatrixSet(layer, mockCapabilities, {
				preferredCRS: "EPSG:4326",
			});

			expect(selected).toBe("EPSG:4326");
		});

		it("should default to Web Mercator (EPSG:3857)", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png"],
				tileMatrixSetLinks: ["EPSG:3857", "EPSG:4326"],
				styles: [],
			};

			const selected = selectTileMatrixSet(layer, mockCapabilities);

			expect(selected).toBe("EPSG:3857");
		});

		it("should prefer well-known scale set when CRS matches", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png"],
				tileMatrixSetLinks: ["EPSG:900913", "EPSG:3857"],
				styles: [],
			};

			const selected = selectTileMatrixSet(layer, mockCapabilities, {
				preferredCRS: "EPSG:900913", // Use the CRS that matches the well-known scale set
				preferredWellKnownScaleSet: "urn:ogc:def:wkss:OGC:1.0:GoogleMapsCompatible",
			});

			expect(selected).toBe("EPSG:900913");
		});

		it("should fallback to Web Mercator variants", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png"],
				tileMatrixSetLinks: ["EPSG:900913"],
				styles: [],
			};

			const selected = selectTileMatrixSet(layer, mockCapabilities);

			expect(selected).toBe("EPSG:900913");
		});

		it("should return undefined if no matrix sets available", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png"],
				tileMatrixSetLinks: [],
				styles: [],
			};

			const selected = selectTileMatrixSet(layer, mockCapabilities);

			expect(selected).toBeUndefined();
		});

		it("should fallback to first available if preferred not found", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png"],
				tileMatrixSetLinks: ["EPSG:4326"],
				styles: [],
			};

			const selected = selectTileMatrixSet(layer, mockCapabilities, {
				preferredCRS: "EPSG:3857",
			});

			expect(selected).toBe("EPSG:4326");
		});
	});

	describe("selectFormat", () => {
		it("should select preferred format", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png", "image/jpeg", "image/gif"],
				tileMatrixSetLinks: [],
				styles: [],
			};

			const selected = selectFormat(layer, {
				preferredFormats: ["image/jpeg", "image/png"],
			});

			expect(selected).toBe("image/jpeg");
		});

		it("should default to PNG", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png", "image/jpeg"],
				tileMatrixSetLinks: [],
				styles: [],
			};

			const selected = selectFormat(layer);

			expect(selected).toBe("image/png");
		});

		it("should fallback to first available if preferred not found", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/gif"],
				tileMatrixSetLinks: [],
				styles: [],
			};

			const selected = selectFormat(layer, {
				preferredFormats: ["image/png", "image/jpeg"],
			});

			expect(selected).toBe("image/gif");
		});

		it("should return undefined if no formats available", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: [],
				tileMatrixSetLinks: [],
				styles: [],
			};

			const selected = selectFormat(layer);

			expect(selected).toBeUndefined();
		});

		it("should handle case-insensitive matching", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["IMAGE/PNG"],
				tileMatrixSetLinks: [],
				styles: [],
			};

			const selected = selectFormat(layer, {
				preferredFormats: ["image/png"],
			});

			expect(selected).toBe("IMAGE/PNG");
		});
	});

	describe("selectStyle", () => {
		it("should select preferred style", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png"],
				tileMatrixSetLinks: [],
				styles: [{ identifier: "default" }, { identifier: "custom" }],
			};

			const selected = selectStyle(layer, "custom");

			expect(selected).toBe("custom");
		});

		it("should select default style if available", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png"],
				tileMatrixSetLinks: [],
				styles: [{ identifier: "default", isDefault: true }, { identifier: "custom" }],
			};

			const selected = selectStyle(layer);

			expect(selected).toBe("default");
		});

		it("should fallback to first available if no default", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png"],
				tileMatrixSetLinks: [],
				styles: [{ identifier: "style1" }, { identifier: "style2" }],
			};

			const selected = selectStyle(layer);

			expect(selected).toBe("style1");
		});

		it("should return undefined if no styles available", () => {
			const layer: WmtsCapabilityLayer = {
				identifier: "testLayer",
				formats: ["image/png"],
				tileMatrixSetLinks: [],
				styles: [],
			};

			const selected = selectStyle(layer);

			expect(selected).toBeUndefined();
		});
	});
});
