import { describe, expect, it } from "vitest";
import { parseXml } from "../../shared/parse";
import { parseWmtsCapabilities } from "./parse-capabilities";

describe("WMTS Capabilities Parsing", () => {
	const wmtsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Capabilities version="1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
	<ServiceIdentification>
		<Title>Test WMTS Service</Title>
		<Abstract>Test service abstract</Abstract>
		<Keywords>
			<Keyword>test</Keyword>
			<Keyword>wmts</Keyword>
		</Keywords>
	</ServiceIdentification>
	<Contents>
		<Layer>
			<ows:Identifier>testLayer</ows:Identifier>
			<ows:Title>Test Layer</ows:Title>
			<ows:Abstract>Test layer description</ows:Abstract>
			<Format>image/png</Format>
			<Format>image/jpeg</Format>
			<TileMatrixSetLink>
				<TileMatrixSet>EPSG:3857</TileMatrixSet>
			</TileMatrixSetLink>
			<Style>
				<ows:Identifier>default</ows:Identifier>
				<ows:Title>Default Style</ows:Title>
				<LegendURL>
					<OnlineResource xlink:href="https://example.com/legend.png"/>
				</LegendURL>
			</Style>
			<ResourceURL resourceType="tile" format="image/png" template="https://example.com/wmts/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png"/>
			<Dimension>
				<ows:Identifier>time</ows:Identifier>
				<Default>2024-01-01</Default>
				<Value>2024-01-01</Value>
				<Value>2024-01-02</Value>
			</Dimension>
			<ows:BoundingBox crs="EPSG:4326">
				<ows:LowerCorner>-180 -90</ows:LowerCorner>
				<ows:UpperCorner>180 90</ows:UpperCorner>
			</ows:BoundingBox>
		</Layer>
		<TileMatrixSet>
			<ows:Identifier>EPSG:3857</ows:Identifier>
			<ows:SupportedCRS>EPSG:3857</ows:SupportedCRS>
			<TileMatrix>
				<ows:Identifier>0</ows:Identifier>
				<ScaleDenominator>559082264.029</ScaleDenominator>
				<TopLeftCorner>-20037508.34 20037508.34</TopLeftCorner>
				<TileWidth>256</TileWidth>
				<TileHeight>256</TileHeight>
				<MatrixWidth>1</MatrixWidth>
				<MatrixHeight>1</MatrixHeight>
			</TileMatrix>
			<TileMatrix>
				<ows:Identifier>1</ows:Identifier>
				<ScaleDenominator>279541132.015</ScaleDenominator>
				<TopLeftCorner>-20037508.34 20037508.34</TopLeftCorner>
				<TileWidth>256</TileWidth>
				<TileHeight>256</TileHeight>
				<MatrixWidth>2</MatrixWidth>
				<MatrixHeight>2</MatrixHeight>
			</TileMatrix>
		</TileMatrixSet>
	</Contents>
</Capabilities>`;

	describe("parseWmtsCapabilities", () => {
		it("should parse WMTS capabilities", () => {
			const doc = parseXml(wmtsXml);
			const caps = parseWmtsCapabilities(doc);

			expect(caps.version).toBe("1.0.0");
			expect(caps.title).toBe("Test WMTS Service");
			expect(caps.abstract).toBe("Test service abstract");
			expect(caps.keywords).toEqual(["test", "wmts"]);
			expect(caps.layers.length).toBe(1);
			expect(caps.tileMatrixSets.length).toBe(1);
		});

		it("should parse layer information", () => {
			const doc = parseXml(wmtsXml);
			const caps = parseWmtsCapabilities(doc);

			const layer = caps.layers[0];
			expect(layer?.identifier).toBe("testLayer");
			expect(layer?.title).toBe("Test Layer");
			expect(layer?.abstract).toBe("Test layer description");
			expect(layer?.formats).toContain("image/png");
			expect(layer?.formats).toContain("image/jpeg");
			expect(layer?.tileMatrixSetLinks).toContain("EPSG:3857");
		});

		it("should parse styles", () => {
			const doc = parseXml(wmtsXml);
			const caps = parseWmtsCapabilities(doc);

			const layer = caps.layers[0];
			expect(layer?.styles.length).toBeGreaterThan(0);
			expect(layer?.styles[0]?.identifier).toBe("default");
			expect(layer?.styles[0]?.title).toBe("Default Style");
			expect(layer?.styles[0]?.legendURL).toBe("https://example.com/legend.png");
		});

		it("should parse resource URLs", () => {
			const doc = parseXml(wmtsXml);
			const caps = parseWmtsCapabilities(doc);

			const layer = caps.layers[0];
			expect(layer?.resourceURLs).toBeDefined();
			expect(layer?.resourceURLs?.length).toBeGreaterThan(0);
			expect(layer?.resourceURLs?.[0]?.resourceType).toBe("tile");
			expect(layer?.resourceURLs?.[0]?.template).toContain("{TileMatrixSet}");
		});

		it("should parse dimensions", () => {
			const doc = parseXml(wmtsXml);
			const caps = parseWmtsCapabilities(doc);

			const layer = caps.layers[0];
			expect(layer?.dimensions).toBeDefined();
			expect(layer?.dimensions?.length).toBeGreaterThan(0);
			expect(layer?.dimensions?.[0]?.identifier).toBe("time");
			expect(layer?.dimensions?.[0]?.default).toBe("2024-01-01");
			expect(layer?.dimensions?.[0]?.values).toContain("2024-01-01");
		});

		it("should parse tile matrix sets", () => {
			const doc = parseXml(wmtsXml);
			const caps = parseWmtsCapabilities(doc);

			const matrixSet = caps.tileMatrixSets[0];
			expect(matrixSet?.identifier).toBe("EPSG:3857");
			expect(matrixSet?.supportedCRS).toBe("EPSG:3857");
			expect(matrixSet?.tileMatrix.length).toBe(2);
		});

		it("should parse tile matrices in order (zoom 0 to max)", () => {
			const doc = parseXml(wmtsXml);
			const caps = parseWmtsCapabilities(doc);

			const matrixSet = caps.tileMatrixSets[0];
			// Zoom 0 should have higher scale denominator than zoom 1
			expect(matrixSet?.tileMatrix[0]?.scaleDenominator).toBeGreaterThan(
				matrixSet?.tileMatrix[1]?.scaleDenominator,
			);
		});

		it("should parse bounding box", () => {
			const doc = parseXml(wmtsXml);
			const caps = parseWmtsCapabilities(doc);

			const layer = caps.layers[0];
			expect(layer?.bbox).toBeDefined();
			expect(layer?.bbox?.crs).toBe("EPSG:4326");
			expect(layer?.bbox?.minX).toBe(-180);
			expect(layer?.bbox?.minY).toBe(-90);
			expect(layer?.bbox?.maxX).toBe(180);
			expect(layer?.bbox?.maxY).toBe(90);
		});

		it("should handle missing optional fields gracefully", () => {
			const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<Capabilities version="1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1">
	<ServiceIdentification>
		<Title>Minimal Service</Title>
	</ServiceIdentification>
	<Contents>
		<Layer>
			<ows:Identifier>minimalLayer</ows:Identifier>
			<Format>image/png</Format>
			<TileMatrixSetLink>
				<TileMatrixSet>EPSG:3857</TileMatrixSet>
			</TileMatrixSetLink>
		</Layer>
	</Contents>
</Capabilities>`;

			const doc = parseXml(minimalXml);
			const caps = parseWmtsCapabilities(doc);

			expect(caps.version).toBe("1.0.0");
			expect(caps.title).toBe("Minimal Service");
			expect(caps.abstract).toBeUndefined();
			expect(caps.layers.length).toBe(1);
			expect(caps.layers[0]?.styles).toEqual([]);
		});
	});
});
