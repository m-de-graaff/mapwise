import { describe, expect, it } from "vitest";
import { createRequestManager } from "../src/request/request-manager";
import type { RequestTransform } from "../src/request/types";

describe("RequestManager", () => {
	it("should chain transformFetch", async () => {
		const manager = createRequestManager();

		const t1: RequestTransform = {
			id: "t1",
			transformFetch: async (url, init) => ({
				url: `${url}?t1=true`,
				init: { ...init, headers: { ...init?.headers, "x-t1": "1" } },
			}),
		};

		const t2: RequestTransform = {
			id: "t2",
			transformFetch: async (url, init) => ({
				url: `${url}&t2=true`,
				init: { ...init, headers: { ...init?.headers, "x-t2": "2" } },
			}),
		};

		manager.register(t1);
		manager.register(t2);

		const result = await manager.transformFetch("https://example.com");

		expect(result.url).toBe("https://example.com?t1=true&t2=true");
		// @ts-ignore
		expect(result.init?.headers?.["x-t1"]).toBe("1");
		// @ts-ignore
		expect(result.init?.headers?.["x-t2"]).toBe("2");
	});

	it("should chain transformMapRequest", () => {
		const manager = createRequestManager();

		const t1: RequestTransform = {
			id: "t1",
			transformMapRequest: (url) => ({
				url: `${url}?t1=true`,
				headers: { "x-t1": "1" },
			}),
		};

		// This one returns undefined (no change)
		const t2: RequestTransform = {
			id: "t2",
			transformMapRequest: () => undefined,
		};

		const t3: RequestTransform = {
			id: "t3",
			transformMapRequest: (url) => ({
				url: `${url}&t3=true`,
			}),
		};

		manager.register(t1);
		manager.register(t2);
		manager.register(t3);

		const result = manager.transformMapRequest("https://example.com", "Tile");

		expect(result.url).toBe("https://example.com?t1=true&t3=true");
		expect(result.headers?.["x-t1"]).toBe("1");
	});
});
