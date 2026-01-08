import { describe, expect, it } from "vitest";
import { normalizeUrl, safeUrl, validateSafeUrl, withQuery } from "./url";

describe("URL Utilities", () => {
	describe("withQuery", () => {
		it("should add query parameters to a URL", () => {
			const url = "https://example.com/path";
			const params = { key1: "value1", key2: "value2" };
			const result = withQuery(url, params);
			expect(result).toContain("key1=value1");
			expect(result).toContain("key2=value2");
		});

		it("should update existing query parameters", () => {
			const url = "https://example.com/path?key1=old";
			const params = { key1: "new", key2: "value2" };
			const result = withQuery(url, params);
			expect(result).toContain("key1=new");
			expect(result).toContain("key2=value2");
		});

		it("should remove query parameters when value is undefined", () => {
			const url = "https://example.com/path?key1=value1&key2=value2";
			const params = { key1: undefined, key2: "value2" };
			const result = withQuery(url, params);
			expect(result).not.toContain("key1=");
			expect(result).toContain("key2=value2");
		});

		it("should handle relative URLs", () => {
			const url = "/path";
			const params = { key: "value" };
			const result = withQuery(url, params);
			expect(result).toContain("key=value");
		});

		it("should convert numbers and booleans to strings", () => {
			const url = "https://example.com/path";
			const params = { number: 123, bool: true };
			const result = withQuery(url, params);
			expect(result).toContain("number=123");
			expect(result).toContain("bool=true");
		});
	});

	describe("normalizeUrl", () => {
		it("should trim whitespace from URL", () => {
			const url = "  https://example.com/path  ";
			const result = normalizeUrl(url);
			expect(result).toBe("https://example.com/path");
		});

		it("should remove fragments from URL", () => {
			const url = "https://example.com/path#fragment";
			const result = normalizeUrl(url);
			expect(result).not.toContain("#fragment");
		});

		it("should handle URLs with query parameters", () => {
			const url = "https://example.com/path?key=value#fragment";
			const result = normalizeUrl(url);
			expect(result).toContain("?key=value");
			expect(result).not.toContain("#fragment");
		});

		it("should handle invalid URLs gracefully", () => {
			const url = "  not-a-url  ";
			const result = normalizeUrl(url);
			expect(result).toBe("not-a-url");
		});
	});

	describe("validateSafeUrl", () => {
		it("should return null for valid URLs", () => {
			const url = "https://example.com/path";
			const result = validateSafeUrl(url);
			expect(result).toBeNull();
		});

		it("should reject empty strings", () => {
			const url = "";
			const result = validateSafeUrl(url);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("INVALID_URL");
		});

		it("should reject non-string values", () => {
			const url = null as unknown as string;
			const result = validateSafeUrl(url);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("INVALID_URL");
		});

		it("should reject javascript: URLs", () => {
			const url = "javascript:alert('xss')";
			const result = validateSafeUrl(url);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("UNSAFE_URL");
			expect(result?.context?.protocol).toBe("javascript:");
		});

		it("should reject data: URLs", () => {
			const url = "data:text/html,<script>alert('xss')</script>";
			const result = validateSafeUrl(url);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("UNSAFE_URL");
		});

		it("should reject vbscript: URLs", () => {
			const url = "vbscript:msgbox('xss')";
			const result = validateSafeUrl(url);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("UNSAFE_URL");
		});

		it("should reject file: URLs", () => {
			const url = "file:///etc/passwd";
			const result = validateSafeUrl(url);
			expect(result).not.toBeNull();
			expect(result?.code).toBe("UNSAFE_URL");
		});

		it("should allow http and https URLs", () => {
			const httpUrl = "http://example.com";
			const httpsUrl = "https://example.com";
			expect(validateSafeUrl(httpUrl)).toBeNull();
			expect(validateSafeUrl(httpsUrl)).toBeNull();
		});
	});

	describe("safeUrl", () => {
		it("should return normalized URL for valid input", () => {
			const url = "https://example.com/path";
			const result = safeUrl(url);
			expect(result).toBe("https://example.com/path");
		});

		it("should throw error for unsafe URLs", () => {
			const url = "javascript:alert('xss')";
			expect(() => safeUrl(url)).toThrow();
		});

		it("should normalize and validate URL", () => {
			const url = "  https://example.com/path#fragment  ";
			const result = safeUrl(url);
			expect(result).not.toContain("#fragment");
			expect(result).not.toContain("  ");
		});
	});
});
