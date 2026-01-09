import { vi } from "vitest";

// Mock URL.createObjectURL (required for MapLibre worker blob)
if (typeof window !== "undefined") {
	if (!window.URL.createObjectURL) {
		window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
	}
	// Mock canvas getContext for MapLibre
	if (typeof HTMLCanvasElement !== "undefined") {
		// @ts-ignore
		HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
			if (contextType === "webgl" || contextType === "webgl2") {
				return {
					getParameter: vi.fn((p) => {
						// VERSION or SHADING_LANGUAGE_VERSION
						if (p === 0x1f02 || p === 0x8b8c) {
							return "WebGL 2.0 (OpenGL ES 3.0 Chromium)";
						}
						return 0;
					}),
					getExtension: vi.fn(() => ({})),
					enable: vi.fn(),
					blendFuncSeparate: vi.fn(),
					disable: vi.fn(),
					createTexture: vi.fn(),
					bindTexture: vi.fn(),
					texParameteri: vi.fn(),
					texImage2D: vi.fn(),
					clearColor: vi.fn(),
					clear: vi.fn(),
					depthFunc: vi.fn(),
					viewport: vi.fn(),
					// MapLibre 5+ specific
					canvas: {
						width: 100,
						height: 100,
						style: {},
					},
					drawingBufferWidth: 100,
					drawingBufferHeight: 100,
				};
			}
			return null;
		});
	}
}
