import { describe, expect, it, vi } from "vitest";
import { createAuthManager } from "../src/request/auth-manager";
import type { TokenProvider } from "../src/request/types";

describe("AuthManager", () => {
	it("should inject tokens for registered providers", async () => {
		const auth = createAuthManager();
		const provider: TokenProvider = {
			getToken: vi.fn().mockResolvedValue("secret-token"),
			getTokenSync: vi.fn().mockReturnValue("secret-token"),
		};

		auth.registerProvider(/api\.example\.com/, provider);

		// Fetch transform
		const result = await auth.transformFetch("https://api.example.com/data");
		// @ts-ignore
		expect(result.init?.headers?.get("Authorization")).toBe("Bearer secret-token");

		// Map request transform
		const mapResult = auth.transformMapRequest("https://api.example.com/tile", "Tile");
		expect(mapResult?.headers?.["Authorization"]).toBe("Bearer secret-token");
	});

	it("should use global token if no provider matches", async () => {
		const auth = createAuthManager();
		auth.setGlobalToken("global-token");

		// Fetch
		const result = await auth.transformFetch("https://anywhere.com/data");
		// @ts-ignore
		expect(result.init?.headers?.get("Authorization")).toBe("Bearer global-token");

		// Map (assumes global token is available sync)
		const mapResult = auth.transformMapRequest("https://anywhere.com/tile", "Tile");
		expect(mapResult?.headers?.["Authorization"]).toBe("Bearer global-token");
	});

	it("should ignore unprotected urls if no global token", async () => {
		const auth = createAuthManager();
		const result = await auth.transformFetch("https://public.com/data");
		expect(result.init?.headers).toBeUndefined();
	});
});
