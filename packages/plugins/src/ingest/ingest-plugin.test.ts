import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PluginContext } from "@mapwise/core";
import { createLayerIngestionPlugin } from "./ingest-plugin";
import { fetchWmsCapabilities, fetchWmtsCapabilities } from "@mapwise/layers";

// Mock @mapwise/layers
vi.mock("@mapwise/layers", () => ({
	fetchWmsCapabilities: vi.fn(),
	fetchWmtsCapabilities: vi.fn(),
}));

describe("Ingest Plugin", () => {
	const mockEvents = {
		emit: vi.fn(),
		on: vi.fn((_event, _handler) => {
			// handlers[event] = handler;
		}),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should detect WMS by URL params and call fetchWmsCapabilities", async () => {
		const plugin = createLayerIngestionPlugin();
		// Cast to match expected context signature, though partial
		plugin.onRegister({ events: mockEvents } as unknown as PluginContext);

		const mockedOn = mockEvents.on as unknown as {
			mock: { calls: [string, (data: unknown) => void][] };
		};
		const requestHandler = mockedOn.mock.calls.find(
			(call) => call[0] === "plugin:@mapwise/ingest:request",
		)?.[1];

		if (!requestHandler) {
			throw new Error("Handler not found");
		}

		// Setup mock
		vi.mocked(fetchWmsCapabilities).mockResolvedValue({ version: "1.3.0" });

		await requestHandler({ url: "http://example.com/wms?service=WMS&request=GetCapabilities" });

		await vi.waitFor(() => {
			expect(fetchWmsCapabilities).toHaveBeenCalled();
			expect(mockEvents.emit).toHaveBeenCalledWith(
				"plugin:@mapwise/ingest:detected",
				expect.objectContaining({
					type: "wms",
					capabilities: { version: "1.3.0" },
				}),
			);
		});
	});

	it("should fallback probe for unknown URL", async () => {
		const plugin = createLayerIngestionPlugin();
		plugin.onRegister({ events: mockEvents } as unknown as PluginContext);

		const mockedOn = mockEvents.on as unknown as {
			mock: { calls: [string, (data: unknown) => void][] };
		};
		const requestHandler = mockedOn.mock.calls.find(
			(call) => call[0] === "plugin:@mapwise/ingest:request",
		)?.[1];

		if (!requestHandler) {
			throw new Error("Handler not found");
		}

		// Fail first (WMS), succeed second (WMTS)
		vi.mocked(fetchWmsCapabilities).mockRejectedValue(new Error("Not WMS"));
		vi.mocked(fetchWmtsCapabilities).mockResolvedValue({ version: "1.0.0" });

		await requestHandler({ url: "http://example.com/unknown-service" });

		await vi.waitFor(() => {
			expect(fetchWmsCapabilities).toHaveBeenCalled();
			expect(fetchWmtsCapabilities).toHaveBeenCalled();
			expect(mockEvents.emit).toHaveBeenCalledWith(
				"plugin:@mapwise/ingest:detected",
				expect.objectContaining({
					type: "wmts",
				}),
			);
		});
	});

	it("should emit error on failure", async () => {
		const plugin = createLayerIngestionPlugin();
		plugin.onRegister({ events: mockEvents } as unknown as PluginContext);

		const mockedOn = mockEvents.on as unknown as {
			mock: { calls: [string, (data: unknown) => void][] };
		};
		const requestHandler = mockedOn.mock.calls.find(
			(call) => call[0] === "plugin:@mapwise/ingest:request",
		)?.[1];

		if (!requestHandler) {
			throw new Error("Handler not found");
		}

		vi.mocked(fetchWmsCapabilities).mockRejectedValue(new Error("Fail"));
		vi.mocked(fetchWmtsCapabilities).mockRejectedValue(new Error("Fail"));

		await requestHandler({ url: "http://example.com/fail" });

		await vi.waitFor(() => {
			expect(mockEvents.emit).toHaveBeenCalledWith(
				"plugin:@mapwise/ingest:error",
				expect.objectContaining({
					url: "http://example.com/fail",
				}),
			);
		});
	});
});
