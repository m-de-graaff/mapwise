import { describe, expect, it } from "vitest";
import { buildArcGisExportUrl } from "./url-builder";

describe("ArcGIS Export URL Builder", () => {
	it("should build basic export URL", () => {
		const url = buildArcGisExportUrl({
			serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
			bbox: [-180, -85, 180, 85],
			width: 256,
			height: 256,
		});

		expect(url).toContain("https://example.com/arcgis/rest/services/MyLayer/MapServer/export");
		expect(url).toContain("bbox=-180%2C-85%2C180%2C85"); // URL-encoded comma
		expect(url).toContain("size=256%2C256"); // URL-encoded comma
		expect(url).toContain("format=png32");
		expect(url).toContain("f=image");
	});

	it("should handle service URL ending with /export", () => {
		const url = buildArcGisExportUrl({
			serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer/export",
			bbox: [0, 0, 1, 1],
			width: 256,
			height: 256,
		});

		expect(url).toContain("/export");
		expect(url).not.toContain("/export/export");
	});

	it("should include layer ID when provided", () => {
		const url = buildArcGisExportUrl({
			serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
			bbox: [0, 0, 1, 1],
			width: 256,
			height: 256,
			layerId: 5,
		});

		expect(url).toContain("layers=show%3A5"); // URL-encoded colon
	});

	it("should use custom format when provided", () => {
		const url = buildArcGisExportUrl({
			serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
			bbox: [0, 0, 1, 1],
			width: 256,
			height: 256,
			format: "jpg",
		});

		expect(url).toContain("format=jpg");
	});

	it("should include transparency for PNG formats", () => {
		const url = buildArcGisExportUrl({
			serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
			bbox: [0, 0, 1, 1],
			width: 256,
			height: 256,
			format: "png32",
			transparent: true,
		});

		expect(url).toContain("transparent=true");
	});

	it("should not include transparency for non-PNG formats", () => {
		const url = buildArcGisExportUrl({
			serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
			bbox: [0, 0, 1, 1],
			width: 256,
			height: 256,
			format: "jpg",
			transparent: true,
		});

		expect(url).not.toContain("transparent=true");
	});

	it("should include CRS in bboxSR and imageSR", () => {
		const url = buildArcGisExportUrl({
			serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
			bbox: [0, 0, 1, 1],
			width: 256,
			height: 256,
			crs: "EPSG:4326",
		});

		expect(url).toContain("bboxSR=EPSG%3A4326"); // URL-encoded colon
		expect(url).toContain("imageSR=EPSG%3A4326"); // URL-encoded colon
	});

	it("should include extra parameters", () => {
		const url = buildArcGisExportUrl({
			serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
			bbox: [0, 0, 1, 1],
			width: 256,
			height: 256,
			extraParams: {
				time: "2024-01-01",
				dpi: "96",
			},
		});

		expect(url).toContain("time=2024-01-01");
		expect(url).toContain("dpi=96");
	});
});
