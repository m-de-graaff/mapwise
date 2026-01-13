import { describe, expect, it } from "vitest";
import { parseXml } from "../../shared/parse.js";
import { parseWmsCapabilities } from "./parse-capabilities.js";

describe("WMS Capabilities Parsing", () => {
	const wms130Xml = `<?xml version="1.0" encoding="UTF-8"?>
<WMS_Capabilities version="1.3.0">
	<Service>
		<Title>Test WMS Service</Title>
		<Abstract>Test service abstract</Abstract>
		<KeywordList>
			<Keyword>test</Keyword>
			<Keyword>wms</Keyword>
		</KeywordList>
	</Service>
	<Capability>
		<Request>
			<GetMap>
				<Format>image/png</Format>
				<Format>image/jpeg</Format>
				<Format>image/gif</Format>
			</GetMap>
		</Request>
		<Layer>
			<Title>Root Layer</Title>
			<CRS>EPSG:3857</CRS>
			<CRS>EPSG:4326</CRS>
			<Layer>
				<Name>testLayer</Name>
				<Title>Test Layer</Title>
				<Abstract>Test layer description</Abstract>
				<CRS>EPSG:3857</CRS>
				<Style>
					<Name>default</Name>
					<Title>Default Style</Title>
				</Style>
			</Layer>
		</Layer>
	</Capability>
</WMS_Capabilities>`;

	const wms111Xml = `<?xml version="1.0" encoding="UTF-8"?>
<WMT_MS_Capabilities version="1.1.1">
	<Service>
		<Title>Test WMS Service 1.1.1</Title>
		<Abstract>Test service abstract 1.1.1</Abstract>
	</Service>
	<Capability>
		<Request>
			<GetMap>
				<Format>image/png</Format>
			</GetMap>
		</Request>
		<Layer>
			<Title>Root Layer</Title>
			<SRS>EPSG:3857</SRS>
			<SRS>EPSG:4326</SRS>
			<Layer>
				<Name>testLayer</Name>
				<Title>Test Layer</Title>
				<SRS>EPSG:3857</SRS>
			</Layer>
		</Layer>
	</Capability>
</WMT_MS_Capabilities>`;

	describe("parseWmsCapabilities", () => {
		it("should parse WMS 1.3.0 capabilities", () => {
			const doc = parseXml(wms130Xml);
			const caps = parseWmsCapabilities(doc);

			expect(caps.version).toBe("1.3.0");
			expect(caps.title).toBe("Test WMS Service");
			expect(caps.abstract).toBe("Test service abstract");
			expect(caps.keywords).toEqual(["test", "wms"]);
			expect(caps.formats).toContain("image/png");
			expect(caps.formats).toContain("image/jpeg");
			expect(caps.formats).toContain("image/gif");
			expect(caps.crs).toContain("EPSG:3857");
			expect(caps.crs).toContain("EPSG:4326");
			expect(caps.layer).toBeDefined();
			expect(caps.layer?.title).toBe("Root Layer");
		});

		it("should parse WMS 1.1.1 capabilities", () => {
			const doc = parseXml(wms111Xml);
			const caps = parseWmsCapabilities(doc);

			expect(caps.version).toBe("1.1.1");
			expect(caps.title).toBe("Test WMS Service 1.1.1");
			expect(caps.abstract).toBe("Test service abstract 1.1.1");
			expect(caps.srs).toContain("EPSG:3857");
			expect(caps.srs).toContain("EPSG:4326");
			expect(caps.layer).toBeDefined();
		});

		it("should parse layer tree", () => {
			const doc = parseXml(wms130Xml);
			const caps = parseWmsCapabilities(doc);

			expect(caps.layer?.layers).toBeDefined();
			expect(caps.layer?.layers?.length).toBeGreaterThan(0);
			const testLayer = caps.layer?.layers?.[0];
			expect(testLayer?.name).toBe("testLayer");
			expect(testLayer?.title).toBe("Test Layer");
			expect(testLayer?.abstract).toBe("Test layer description");
			expect(testLayer?.crs).toContain("EPSG:3857");
		});

		it("should parse styles", () => {
			const doc = parseXml(wms130Xml);
			const caps = parseWmsCapabilities(doc);

			const testLayer = caps.layer?.layers?.[0];
			expect(testLayer?.styles).toBeDefined();
			expect(testLayer?.styles?.length).toBeGreaterThan(0);
			expect(testLayer?.styles?.[0]?.name).toBe("default");
			expect(testLayer?.styles?.[0]?.title).toBe("Default Style");
		});

		it("should handle missing optional fields gracefully", () => {
			const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<WMS_Capabilities version="1.3.0">
	<Service>
		<Title>Minimal Service</Title>
	</Service>
	<Capability>
		<Layer>
		</Layer>
	</Capability>
</WMS_Capabilities>`;

			const doc = parseXml(minimalXml);
			const caps = parseWmsCapabilities(doc);

			expect(caps.version).toBe("1.3.0");
			expect(caps.title).toBe("Minimal Service");
			expect(caps.abstract).toBeUndefined();
			expect(caps.keywords).toBeUndefined();
			expect(caps.layer).toBeDefined();
		});

		it("should detect version from XML", () => {
			const doc130 = parseXml(wms130Xml);
			const caps130 = parseWmsCapabilities(doc130);
			expect(caps130.version).toBe("1.3.0");

			const doc111 = parseXml(wms111Xml);
			const caps111 = parseWmsCapabilities(doc111);
			expect(caps111.version).toBe("1.1.1");
		});
	});
});
