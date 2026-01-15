import { describe, expect, it, vi, beforeEach } from "vitest";
import { registerWmtsProtocol } from "./wmts-protocol.js";

// Mock maplibregl
vi.mock("maplibre-gl", () => ({
	default: {
		addProtocol: vi.fn(),
	},
}));

import maplibregl from "maplibre-gl";

describe("WMTS Protocol", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("should register protocol with MapLibre", () => {
		registerWmtsProtocol();
		expect(maplibregl.addProtocol).toHaveBeenCalledWith("wmts", expect.any(Function));
	});

	// Note: We cannot easily test the usage of the protocol fully without full MapLibre mock,
	// but we can test the registry and parsing logic if we exported them or via integration.
	// For now, testing registration is a good sanity check.
});
