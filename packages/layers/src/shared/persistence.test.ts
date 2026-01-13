import { describe, expect, it } from "vitest";
import {
	LAYER_CONFIG_SCHEMA_VERSION,
	type LayerValidationError,
	MIN_LAYER_CONFIG_SCHEMA_VERSION,
	type PersistedLayerConfigBase,
	migrateLayerConfig,
	validateArray,
	validateNumber,
	validateObject,
	validateRequiredString,
	validateSchemaVersion,
	validateUrl,
} from "./persistence.js";

describe("Shared Persistence Utilities", () => {
	describe("validateSchemaVersion", () => {
		it("should validate current version", () => {
			const errors: LayerValidationError[] = [];
			const warnings: LayerValidationError[] = [];
			const config = {
				_version: LAYER_CONFIG_SCHEMA_VERSION,
				_type: "test-layer",
				id: "test",
			};

			const result = validateSchemaVersion(config, errors, warnings);
			expect(result).toBe(true);
			expect(errors.length).toBe(0);
		});

		it("should reject version too old", () => {
			const errors: LayerValidationError[] = [];
			const warnings: LayerValidationError[] = [];
			// Use a version that's >= 1 but < MIN_LAYER_CONFIG_SCHEMA_VERSION
			const oldVersion = MIN_LAYER_CONFIG_SCHEMA_VERSION - 1;
			const config = {
				_version: oldVersion,
				_type: "test-layer",
				id: "test",
			};

			const result = validateSchemaVersion(config, errors, warnings);
			expect(result).toBe(false);
			expect(errors.length).toBeGreaterThan(0);
			// If MIN version is 1, then oldVersion would be 0, which fails with VALUE_TOO_SMALL
			// Otherwise, it should fail with VERSION_TOO_OLD
			if (oldVersion >= 1) {
				expect(errors.some((e) => e.code === "VERSION_TOO_OLD")).toBe(true);
			} else {
				expect(errors[0]?.code).toBe("VALUE_TOO_SMALL");
			}
		});

		it("should warn on newer version", () => {
			const errors: LayerValidationError[] = [];
			const warnings: LayerValidationError[] = [];
			const config = {
				_version: LAYER_CONFIG_SCHEMA_VERSION + 1,
				_type: "test-layer",
				id: "test",
			};

			const result = validateSchemaVersion(config, errors, warnings);
			expect(result).toBe(true);
			expect(warnings.length).toBeGreaterThan(0);
			expect(warnings[0]?.code).toBe("VERSION_NEWER");
		});

		it("should reject missing _version", () => {
			const errors: LayerValidationError[] = [];
			const warnings: LayerValidationError[] = [];
			const config = {
				_type: "test-layer",
				id: "test",
			};

			// validateSchemaVersion first checks if config is an object
			// Then it validates _version using validateNumber which adds errors
			const result = validateSchemaVersion(config, errors, warnings);
			expect(result).toBe(false);
			// validateNumber will add an error for missing _version
			expect(errors.some((e) => e.code === "MISSING_FIELD" || e.path === "_version")).toBe(true);
		});
	});

	describe("validateRequiredString", () => {
		it("should validate non-empty string", () => {
			const errors: LayerValidationError[] = [];
			const result = validateRequiredString("test", "path", "Field", errors);
			expect(result).toBe(true);
			expect(errors.length).toBe(0);
		});

		it("should reject empty string", () => {
			const errors: LayerValidationError[] = [];
			const result = validateRequiredString("", "path", "Field", errors);
			expect(result).toBe(false);
			expect(errors.length).toBe(1);
			expect(errors[0]?.code).toBe("INVALID_STRING");
		});

		it("should reject non-string", () => {
			const errors: LayerValidationError[] = [];
			const result = validateRequiredString(123, "path", "Field", errors);
			expect(result).toBe(false);
			expect(errors.length).toBe(1);
		});
	});

	describe("validateNumber", () => {
		it("should validate valid number", () => {
			const errors: LayerValidationError[] = [];
			const result = validateNumber(
				5,
				"path",
				"Field",
				{ min: 0, max: 10, required: true },
				errors,
			);
			expect(result).toBe(true);
			expect(errors.length).toBe(0);
		});

		it("should reject number below min", () => {
			const errors: LayerValidationError[] = [];
			const result = validateNumber(5, "path", "Field", { min: 10, required: true }, errors);
			expect(result).toBe(false);
			expect(errors.length).toBe(1);
			expect(errors[0]?.code).toBe("VALUE_TOO_SMALL");
		});

		it("should reject non-integer when required", () => {
			const errors: LayerValidationError[] = [];
			const result = validateNumber(
				5.5,
				"path",
				"Field",
				{ integer: true, required: true },
				errors,
			);
			expect(result).toBe(false);
			expect(errors.length).toBe(1);
			expect(errors[0]?.code).toBe("NOT_INTEGER");
		});
	});

	describe("validateUrl", () => {
		it("should validate absolute URL", () => {
			const errors: LayerValidationError[] = [];
			const result = validateUrl("https://example.com", "path", "Field", errors);
			expect(result).toBe(true);
			expect(errors.length).toBe(0);
		});

		it("should validate relative URL", () => {
			const errors: LayerValidationError[] = [];
			const result = validateUrl("/path/to/resource", "path", "Field", errors);
			expect(result).toBe(true);
			expect(errors.length).toBe(0);
		});

		it("should reject invalid URL", () => {
			const errors: LayerValidationError[] = [];
			// Use a string that definitely won't parse as a URL even with a base
			const result = validateUrl("http://example.com:999999", "path", "Field", errors);
			expect(result).toBe(false);
			expect(errors.length).toBe(1);
			expect(errors[0]?.code).toBe("INVALID_URL");
		});
	});

	describe("validateArray", () => {
		it("should validate array", () => {
			const errors: LayerValidationError[] = [];
			const result = validateArray<string>(
				["a", "b"],
				"path",
				"Field",
				errors,
				(item): item is string => typeof item === "string",
			);
			expect(result).toBe(true);
			expect(errors.length).toBe(0);
		});

		it("should reject non-array", () => {
			const errors: LayerValidationError[] = [];
			const result = validateArray<string>(
				"not array",
				"path",
				"Field",
				errors,
				(item): item is string => typeof item === "string",
			);
			expect(result).toBe(false);
			expect(errors.length).toBe(1);
		});
	});

	describe("validateObject", () => {
		it("should validate object", () => {
			const errors: LayerValidationError[] = [];
			const result = validateObject({ key: "value" }, "path", "Field", errors);
			expect(result).toBe(true);
			expect(errors.length).toBe(0);
		});

		it("should reject array", () => {
			const errors: LayerValidationError[] = [];
			const result = validateObject([1, 2, 3], "path", "Field", errors);
			expect(result).toBe(false);
			expect(errors.length).toBe(1);
		});
	});

	describe("migrateLayerConfig", () => {
		it("should pass through config at current version", () => {
			const config: PersistedLayerConfigBase = {
				_version: LAYER_CONFIG_SCHEMA_VERSION,
				_type: "test-layer",
				id: "test",
			};
			const migrations = new Map();

			const { config: migrated, info } = migrateLayerConfig(config, migrations);

			expect(migrated["_version"]).toBe(LAYER_CONFIG_SCHEMA_VERSION);
			// At current version, no migration steps are needed, so steps should be empty
			expect(info.steps.length).toBe(0);
			expect(info.fromVersion).toBe(LAYER_CONFIG_SCHEMA_VERSION);
			expect(info.toVersion).toBe(LAYER_CONFIG_SCHEMA_VERSION);
		});

		it("should apply migrations", () => {
			const config: PersistedLayerConfigBase = {
				_version: 1,
				_type: "test-layer",
				id: "test",
			};
			const migrations = new Map<
				number,
				(cfg: PersistedLayerConfigBase) => PersistedLayerConfigBase
			>();
			migrations.set(1, (cfg) => ({ ...cfg, migrated: true }));

			// Note: This test assumes we'll have migrations when schema version increases
			// For now, it should just update version
			const { info } = migrateLayerConfig(config, migrations);

			expect(info.fromVersion).toBe(1);
			expect(info.toVersion).toBe(LAYER_CONFIG_SCHEMA_VERSION);
		});
	});
});
