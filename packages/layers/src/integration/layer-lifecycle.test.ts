/**
 * Integration tests for layer lifecycle and persistence.
 * These tests verify that layers conform to the LayerDefinition contract
 * and support persistence.
 *
 * @module integration/layer-lifecycle
 */

/**
 * Integration tests for layer lifecycle and persistence.
 * These tests verify that layers conform to the LayerDefinition contract
 * and support persistence without requiring a full map instance.
 *
 * @module integration/layer-lifecycle
 */

import { describe, expect, it } from "vitest";
import {
	type ArcGisRestRasterLayerConfig,
	createArcGisRestRasterLayer,
} from "../arcgis/arcgis-raster-layer";
import { deserializeLayer, getLayerPersistedConfig } from "../persistence";
import { type WmsRasterLayerConfig, createWmsRasterLayer } from "../wms/wms-layer";
import { type XyzRasterLayerConfig, createXyzRasterLayer } from "../xyz/xyz-layer";

describe("Layer Definition Contract", () => {
	it("should create valid LayerDefinition for WMS", () => {
		const config: WmsRasterLayerConfig = {
			id: "wms-test",
			baseUrl: "https://example.com/wms",
			layers: "testLayer",
		};

		const layer = createWmsRasterLayer(config);

		expect(layer.id).toBe("wms-test");
		expect(layer.type).toBe("wms-raster");
		expect(layer.source).toBeDefined();
		expect(layer.source?.id).toBe("wms-test-source");
		expect(layer.layers).toBeDefined();
		expect(Array.isArray(layer.layers)).toBe(true);
		expect(layer.layers.length).toBeGreaterThan(0);
		expect(layer.layers[0]?.id).toBe("wms-test-layer");
	});

	it("should create valid LayerDefinition for XYZ", () => {
		const config: XyzRasterLayerConfig = {
			id: "xyz-test",
			tiles: "https://example.com/{z}/{x}/{y}.png",
		};

		const layer = createXyzRasterLayer(config);

		expect(layer.id).toBe("xyz-test");
		expect(layer.type).toBe("xyz-raster");
		expect(layer.source).toBeDefined();
		expect(layer.source?.id).toBe("xyz-test-source");
		expect(layer.layers).toBeDefined();
		expect(layer.layers[0]?.id).toBe("xyz-test-layer");
	});

	it("should create valid LayerDefinition for ArcGIS", () => {
		const config: ArcGisRestRasterLayerConfig = {
			id: "arcgis-test",
			serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
		};

		const layer = createArcGisRestRasterLayer(config);

		expect(layer.id).toBe("arcgis-test");
		expect(layer.type).toBe("arcgis-raster");
		expect(layer.source).toBeDefined();
		expect(layer.layers).toBeDefined();
	});
});

describe("Persistence Round-trip", () => {
	it("should serialize and deserialize WMS layer", () => {
		const originalConfig: WmsRasterLayerConfig = {
			id: "wms-persistence-test",
			baseUrl: "https://example.com/wms",
			layers: "testLayer",
			format: "image/png",
			version: "1.3.0",
			transparent: true,
		};

		const layer = createWmsRasterLayer(originalConfig);
		const persisted = getLayerPersistedConfig(layer);

		expect(persisted).toBeDefined();
		expect((persisted as { _type: string })._type).toBe("wms-raster");

		// Deserialize
		const deserializedLayer = deserializeLayer(persisted as Parameters<typeof deserializeLayer>[0]);

		expect(deserializedLayer.id).toBe("wms-persistence-test");
		expect(deserializedLayer.type).toBe("wms-raster");

		// Verify persisted config matches
		const deserializedPersisted = getLayerPersistedConfig(deserializedLayer);
		expect((deserializedPersisted as { baseUrl: string }).baseUrl).toBe(originalConfig.baseUrl);
		expect((deserializedPersisted as { layers: string }).layers).toBe(originalConfig.layers);
	});

	it("should serialize and deserialize XYZ layer", () => {
		const originalConfig: XyzRasterLayerConfig = {
			id: "xyz-persistence-test",
			tiles: "https://example.com/{z}/{x}/{y}.png",
			tileSize: 512,
			maxzoom: 18,
		};

		const layer = createXyzRasterLayer(originalConfig);
		const persisted = getLayerPersistedConfig(layer);

		expect(persisted).toBeDefined();

		const deserializedLayer = deserializeLayer(persisted as Parameters<typeof deserializeLayer>[0]);

		expect(deserializedLayer.id).toBe("xyz-persistence-test");
		expect(deserializedLayer.type).toBe("xyz-raster");
	});
});

describe("Layer Source and Layer Specs", () => {
	it("should create source with correct ID pattern", () => {
		const config: WmsRasterLayerConfig = {
			id: "source-test",
			baseUrl: "https://example.com/wms",
			layers: "testLayer",
		};

		const layer = createWmsRasterLayer(config);

		expect(layer.source?.id).toBe("source-test-source");
		expect(layer.source?.spec.type).toBe("raster");
	});

	it("should create layers with correct ID pattern", () => {
		const config: WmsRasterLayerConfig = {
			id: "layer-test",
			baseUrl: "https://example.com/wms",
			layers: "testLayer",
		};

		const layer = createWmsRasterLayer(config);

		expect(layer.layers[0]?.id).toBe("layer-test-layer");
		expect(layer.layers[0]?.type).toBe("raster");
		expect(layer.layers[0]?.source).toBe("layer-test-source");
	});

	it("should have stable source and layer IDs", () => {
		// IDs should not change between calls - this ensures no re-adding on updates
		const config: WmsRasterLayerConfig = {
			id: "stable-test",
			baseUrl: "https://example.com/wms",
			layers: "testLayer",
		};

		const layer1 = createWmsRasterLayer(config);
		const layer2 = createWmsRasterLayer(config);

		expect(layer1.source?.id).toBe(layer2.source?.id);
		expect(layer1.layers[0]?.id).toBe(layer2.layers[0]?.id);
	});
});

describe("Opacity Support", () => {
	it("should apply opacity in paint properties", () => {
		const config: WmsRasterLayerConfig = {
			id: "opacity-test",
			baseUrl: "https://example.com/wms",
			layers: "testLayer",
			opacity: 0.75,
		};

		const layer = createWmsRasterLayer(config);
		const layerSpec = layer.layers[0];

		expect(layerSpec?.paint?.["raster-opacity"]).toBe(0.75);
	});

	it("should use default opacity of 1", () => {
		const config: WmsRasterLayerConfig = {
			id: "opacity-default-test",
			baseUrl: "https://example.com/wms",
			layers: "testLayer",
		};

		const layer = createWmsRasterLayer(config);
		const layerSpec = layer.layers[0];

		expect(layerSpec?.paint?.["raster-opacity"]).toBe(1);
	});
});

describe("Visibility Support", () => {
	it("should create layer that supports visibility", () => {
		// Visibility is handled by core registry, but layer should be structured correctly
		const config: WmsRasterLayerConfig = {
			id: "visibility-test",
			baseUrl: "https://example.com/wms",
			layers: "testLayer",
			visible: false, // Initial visibility
		};

		const layer = createWmsRasterLayer(config);

		// Layer definition should exist - visibility is managed by registry
		expect(layer.id).toBe("visibility-test");
		expect(layer.layers.length).toBeGreaterThan(0);
	});
});
