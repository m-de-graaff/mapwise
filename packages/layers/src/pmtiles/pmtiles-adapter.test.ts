import { describe, expect, it } from "vitest";
import { PmtilesNotInstalledError, isPmtilesAvailable, toPmtilesUrl } from "./pmtiles-adapter";

describe("PMTiles Adapter", () => {
	describe("PmtilesNotInstalledError", () => {
		it("should have correct error message", () => {
			const error = new PmtilesNotInstalledError();
			expect(error).toBeInstanceOf(Error);
			expect(error.name).toBe("PmtilesNotInstalledError");
			expect(error.message).toContain("@protomaps/pmtiles");
			expect(error.message).toContain("pnpm add");
		});
	});

	describe("toPmtilesUrl", () => {
		it("should convert http URL to pmtiles protocol", () => {
			const url = "http://example.com/tiles.pmtiles";
			expect(toPmtilesUrl(url)).toBe("pmtiles://example.com/tiles.pmtiles");
		});

		it("should convert https URL to pmtiles protocol", () => {
			const url = "https://example.com/tiles.pmtiles";
			expect(toPmtilesUrl(url)).toBe("pmtiles://example.com/tiles.pmtiles");
		});

		it("should leave pmtiles:// URL unchanged", () => {
			const url = "pmtiles://example.com/tiles.pmtiles";
			expect(toPmtilesUrl(url)).toBe("pmtiles://example.com/tiles.pmtiles");
		});

		it("should prepend pmtiles:// to URLs without protocol", () => {
			const url = "example.com/tiles.pmtiles";
			expect(toPmtilesUrl(url)).toBe("pmtiles://example.com/tiles.pmtiles");
		});
	});

	describe("isPmtilesAvailable", () => {
		it("should return false in test environment (no window)", () => {
			// In Node.js/test environment, window is undefined
			expect(isPmtilesAvailable()).toBe(false);
		});
	});
});
