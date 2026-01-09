import type { EventBus } from "@mapwise/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safePluginCall, safePluginCallAsync } from "./error-handler";

describe("Error Handler", () => {
	describe("safePluginCall", () => {
		beforeEach(() => {
			vi.spyOn(console, "error").mockImplementation(() => {
				// No-op
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should execute function and return result", () => {
			const result = safePluginCall(() => 42, { pluginId: "test", context: "test" });

			expect(result).toBe(42);
		});

		it("should catch errors and return undefined", () => {
			const result = safePluginCall(
				() => {
					throw new Error("Test error");
				},
				{ pluginId: "test", context: "test" },
			);

			expect(result).toBeUndefined();
		});

		it("should emit error event when eventBus provided", () => {
			const emit = vi.fn();
			const eventBus = { emit } as unknown as EventBus;

			safePluginCall(
				() => {
					throw new Error("Test error");
				},
				{ pluginId: "@mapwise/test", context: "test-context" },
				eventBus,
			);

			expect(emit).toHaveBeenCalledWith("plugin:error", {
				pluginId: "@mapwise/test",
				hook: "test-context",
				message: "Test error",
				recoverable: true,
			});
		});

		it("should include metadata in error", () => {
			safePluginCall(
				() => {
					throw new Error("Test error");
				},
				{
					pluginId: "test",
					context: "test",
					metadata: { foo: "bar" },
				},
			);

			expect(console.error).toHaveBeenCalled();
			// biome-ignore lint/suspicious/noExplicitAny: accessing mock internal state
			const call = (console.error as any).mock.calls[0];
			expect(call?.[0]).toContain("test");
			expect(String(call)).toContain("foo");
		});

		it("should handle non-Error throwables", () => {
			const result = safePluginCall(
				() => {
					throw "String error";
				},
				{ pluginId: "test", context: "test" },
			);

			expect(result).toBeUndefined();
		});
	});

	describe("safePluginCallAsync", () => {
		it("should execute async function and return result", async () => {
			const result = await safePluginCallAsync(async () => Promise.resolve(42), {
				pluginId: "test",
				context: "test",
			});

			expect(result).toBe(42);
		});

		it("should catch async errors and return undefined", async () => {
			const result = await safePluginCallAsync(
				async () => {
					throw new Error("Test error");
				},
				{ pluginId: "test", context: "test" },
			);

			expect(result).toBeUndefined();
		});

		it("should emit error event for async errors", async () => {
			const emit = vi.fn();
			const eventBus = { emit } as unknown as EventBus;

			await safePluginCallAsync(
				async () => {
					throw new Error("Async error");
				},
				{ pluginId: "@mapwise/test", context: "async-test" },
				eventBus,
			);

			expect(emit).toHaveBeenCalledWith("plugin:error", {
				pluginId: "@mapwise/test",
				hook: "async-test",
				message: "Async error",
				recoverable: true,
			});
		});
	});
});
