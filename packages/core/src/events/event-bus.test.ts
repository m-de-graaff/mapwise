import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEventBus } from "./event-bus.js";
import type { EventBus } from "./event-bus.js";

describe("EventBus", () => {
	let bus: EventBus;

	beforeEach(() => {
		bus = createEventBus();
	});

	describe("on/emit", () => {
		it("should subscribe and emit events", () => {
			const handler = vi.fn();
			bus.on("map:ready", handler);

			bus.emit("map:ready", { timestamp: 123 });

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith({ timestamp: 123 });
		});

		it("should support multiple handlers for the same event", () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			bus.on("map:ready", handler1);
			bus.on("map:ready", handler2);

			bus.emit("map:ready", { timestamp: 123 });

			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).toHaveBeenCalledOnce();
		});

		it("should call handlers in registration order", () => {
			const calls: string[] = [];
			bus.on("map:ready", () => {
				calls.push("first");
			});
			bus.on("map:ready", () => {
				calls.push("second");
			});

			bus.emit("map:ready", { timestamp: 123 });

			expect(calls).toEqual(["first", "second"]);
		});

		it("should return unsubscribe function", () => {
			const handler = vi.fn();
			const unsubscribe = bus.on("map:ready", handler);

			bus.emit("map:ready", { timestamp: 123 });
			expect(handler).toHaveBeenCalledOnce();

			unsubscribe();
			bus.emit("map:ready", { timestamp: 456 });

			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe("once", () => {
		it("should call handler only once", () => {
			const handler = vi.fn();
			bus.once("map:ready", handler);

			bus.emit("map:ready", { timestamp: 123 });
			bus.emit("map:ready", { timestamp: 456 });

			expect(handler).toHaveBeenCalledOnce();
			expect(handler).toHaveBeenCalledWith({ timestamp: 123 });
		});

		it("should return unsubscribe function", () => {
			const handler = vi.fn();
			const unsubscribe = bus.once("map:ready", handler);

			unsubscribe();
			bus.emit("map:ready", { timestamp: 123 });

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe("off", () => {
		it("should remove all handlers for a specific event", () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			bus.on("map:ready", handler1);
			bus.on("map:error", handler2);

			bus.off("map:ready");

			bus.emit("map:ready", { timestamp: 123 });
			bus.emit("map:error", {
				code: "TEST",
				message: "test",
				recoverable: true,
				originalError: undefined,
			});

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).toHaveBeenCalledOnce();
		});

		it("should remove all handlers when no event specified", () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			bus.on("map:ready", handler1);
			bus.on("map:error", handler2);

			bus.off();

			bus.emit("map:ready", { timestamp: 123 });
			bus.emit("map:error", {
				code: "TEST",
				message: "test",
				recoverable: true,
				originalError: undefined,
			});

			expect(handler1).not.toHaveBeenCalled();
			expect(handler2).not.toHaveBeenCalled();
		});
	});

	describe("error isolation", () => {
		it("should isolate handler errors", () => {
			const handler1 = vi.fn(() => {
				throw new Error("Handler 1 error");
			});
			const handler2 = vi.fn();

			bus.on("map:ready", handler1);
			bus.on("map:ready", handler2);

			// Should not throw
			bus.emit("map:ready", { timestamp: 123 });

			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).toHaveBeenCalledOnce();
		});

		it("should emit error event when handler throws", () => {
			const errorHandler = vi.fn();
			bus.on("map:error", errorHandler);

			const handler = vi.fn(() => {
				throw new Error("Test error");
			});
			bus.on("map:ready", handler);

			bus.emit("map:ready", { timestamp: 123 });

			expect(errorHandler).toHaveBeenCalled();
			const errorPayload = errorHandler.mock.calls[0]?.[0];
			expect(errorPayload).toMatchObject({
				code: "EVENT_HANDLER_ERROR",
				recoverable: true,
			});
		});
	});

	describe("listenerCount", () => {
		it("should return correct count", () => {
			expect(bus.listenerCount("map:ready")).toBe(0);

			bus.on("map:ready", vi.fn());
			expect(bus.listenerCount("map:ready")).toBe(1);

			bus.on("map:ready", vi.fn());
			expect(bus.listenerCount("map:ready")).toBe(2);
		});
	});

	describe("hasListeners", () => {
		it("should return false when no listeners", () => {
			expect(bus.hasListeners("map:ready")).toBe(false);
		});

		it("should return true when listeners exist", () => {
			bus.on("map:ready", vi.fn());
			expect(bus.hasListeners("map:ready")).toBe(true);
		});
	});

	describe("eventNames", () => {
		it("should return all registered event names", () => {
			bus.on("map:ready", vi.fn());
			bus.on("map:error", vi.fn());
			bus.on("layer:added", vi.fn());

			const names = bus.eventNames();
			expect(names).toContain("map:ready");
			expect(names).toContain("map:error");
			expect(names).toContain("layer:added");
		});
	});

	describe("debug mode", () => {
		it("should track event history in debug mode", () => {
			const debugBus = createEventBus({ debug: true });
			const handler = vi.fn();

			debugBus.on("map:ready", handler);
			debugBus.emit("map:ready", { timestamp: 123 });

			const history = debugBus.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0]?.event).toBe("map:ready");
			expect(history[0]?.handlerCount).toBe(1);
		});

		it("should respect maxHistorySize", () => {
			const debugBus = createEventBus({ debug: true, maxHistorySize: 2 });

			debugBus.emit("map:ready", { timestamp: 1 });
			debugBus.emit("map:ready", { timestamp: 2 });
			debugBus.emit("map:ready", { timestamp: 3 });

			const history = debugBus.getHistory();
			expect(history).toHaveLength(2);
		});
	});
});
