import { describe, expect, it } from "vitest";
import { buildWmsLegendUrl, buildWmsTileUrl } from "./url-builder";

describe("WMS URL Builder", () => {
	describe("buildWmsTileUrl", () => {
		it("should build basic WMS 1.3.0 GetMap URL", () => {
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				bbox: [-180, -90, 180, 90],
				width: 256,
				height: 256,
				version: "1.3.0",
				crs: "EPSG:3857",
			});

			expect(url).toContain("SERVICE=WMS");
			expect(url).toContain("VERSION=1.3.0");
			expect(url).toContain("REQUEST=GetMap");
			expect(url).toContain("LAYERS=myLayer");
			expect(url).toContain("CRS=EPSG%3A3857");
			expect(url).toContain("BBOX=-180%2C-90%2C180%2C90");
			expect(url).toContain("WIDTH=256");
			expect(url).toContain("HEIGHT=256");
		});

		it("should build WMS 1.1.1 GetMap URL with SRS", () => {
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				bbox: [-180, -90, 180, 90],
				width: 256,
				height: 256,
				version: "1.1.1",
				srs: "EPSG:3857",
			});

			expect(url).toContain("VERSION=1.1.1");
			expect(url).toContain("SRS=EPSG%3A3857");
			expect(url).not.toContain("CRS=");
		});

		it("should handle multiple layers", () => {
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: ["layer1", "layer2"],
				bbox: [-180, -90, 180, 90],
				width: 256,
				height: 256,
				version: "1.3.0",
				crs: "EPSG:3857",
			});

			expect(url).toContain("LAYERS=layer1%2Clayer2");
		});

		it("should handle styles", () => {
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				bbox: [-180, -90, 180, 90],
				width: 256,
				height: 256,
				version: "1.3.0",
				crs: "EPSG:3857",
				styles: "default",
			});

			expect(url).toContain("STYLES=default");
		});

		it("should handle multiple styles", () => {
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: ["layer1", "layer2"],
				bbox: [-180, -90, 180, 90],
				width: 256,
				height: 256,
				version: "1.3.0",
				crs: "EPSG:3857",
				styles: ["style1", "style2"],
			});

			expect(url).toContain("STYLES=style1%2Cstyle2");
		});

		it("should add TRANSPARENT parameter for PNG format", () => {
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				bbox: [-180, -90, 180, 90],
				width: 256,
				height: 256,
				version: "1.3.0",
				crs: "EPSG:3857",
				format: "image/png",
				transparent: true,
			});

			expect(url).toContain("TRANSPARENT=TRUE");
		});

		it("should not add TRANSPARENT for JPEG format", () => {
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				bbox: [-180, -90, 180, 90],
				width: 256,
				height: 256,
				version: "1.3.0",
				crs: "EPSG:3857",
				format: "image/jpeg",
				transparent: true,
			});

			expect(url).not.toContain("TRANSPARENT");
		});

		it("should handle extra parameters", () => {
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				bbox: [-180, -90, 180, 90],
				width: 256,
				height: 256,
				version: "1.3.0",
				crs: "EPSG:3857",
				extraParams: {
					time: "2024-01-01",
					elevation: "0",
				},
			});

			expect(url).toContain("time=2024-01-01");
			expect(url).toContain("elevation=0");
		});

		it("should use default values", () => {
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				bbox: [-180, -90, 180, 90],
			});

			expect(url).toContain("VERSION=1.3.0");
			expect(url).toContain("FORMAT=image%2Fpng");
			expect(url).toContain("WIDTH=256");
			expect(url).toContain("HEIGHT=256");
		});

		it("should handle EPSG:4326 axis order for WMS 1.3.0", () => {
			// WMS 1.3.0 EPSG:4326 should use lon,lat order
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				bbox: [-180, -90, 180, 90], // [minLon, minLat, maxLon, maxLat]
				width: 256,
				height: 256,
				version: "1.3.0",
				crs: "EPSG:4326",
			});

			// BBOX should be in lon,lat order for 1.3.0
			expect(url).toContain("BBOX=-180%2C-90%2C180%2C90");
			expect(url).toContain("CRS=EPSG%3A4326");
		});

		it("should handle EPSG:4326 axis order for WMS 1.1.1", () => {
			// WMS 1.1.1 EPSG:4326 uses lat,lon order
			// But buildWmsTileUrl receives bbox in standard [minX, minY, maxX, maxY] format
			// The caller should provide bbox in the correct order for the version
			const url = buildWmsTileUrl({
				baseUrl: "https://example.com/wms",
				layers: "myLayer",
				bbox: [-90, -180, 90, 180], // [minLat, minLon, maxLat, maxLon] for 1.1.1
				width: 256,
				height: 256,
				version: "1.1.1",
				srs: "EPSG:4326",
			});

			expect(url).toContain("BBOX=-90%2C-180%2C90%2C180");
			expect(url).toContain("SRS=EPSG%3A4326");
		});
	});

	describe("buildWmsLegendUrl", () => {
		it("should build basic GetLegendGraphic URL", () => {
			const url = buildWmsLegendUrl({
				baseUrl: "https://example.com/wms",
				layer: "myLayer",
			});

			expect(url).toContain("SERVICE=WMS");
			expect(url).toContain("REQUEST=GetLegendGraphic");
			expect(url).toContain("LAYER=myLayer");
			expect(url).toContain("VERSION=1.3.0");
			expect(url).toContain("FORMAT=image%2Fpng");
		});

		it("should include style if provided", () => {
			const url = buildWmsLegendUrl({
				baseUrl: "https://example.com/wms",
				layer: "myLayer",
				style: "default",
			});

			expect(url).toContain("STYLE=default");
		});

		it("should handle custom format", () => {
			const url = buildWmsLegendUrl({
				baseUrl: "https://example.com/wms",
				layer: "myLayer",
				format: "image/jpeg",
			});

			expect(url).toContain("FORMAT=image%2Fjpeg");
		});

		it("should handle WMS 1.1.1 version", () => {
			const url = buildWmsLegendUrl({
				baseUrl: "https://example.com/wms",
				layer: "myLayer",
				version: "1.1.1",
			});

			expect(url).toContain("VERSION=1.1.1");
		});

		it("should handle extra parameters", () => {
			const url = buildWmsLegendUrl({
				baseUrl: "https://example.com/wms",
				layer: "myLayer",
				extraParams: {
					WIDTH: "20",
					HEIGHT: "20",
				},
			});

			expect(url).toContain("WIDTH=20");
			expect(url).toContain("HEIGHT=20");
		});
	});
});
