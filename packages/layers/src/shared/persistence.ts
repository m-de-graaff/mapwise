/**
 * Shared persistence utilities and types for layer configurations.
 *
 * @module shared/persistence
 */

// =============================================================================
// Schema Versioning
// =============================================================================

/**
 * Schema version for persisted layer configurations.
 * Increment when making breaking changes to a layer's persisted format.
 */
export const LAYER_CONFIG_SCHEMA_VERSION = 1;

/**
 * Minimum supported schema version for layer configs.
 * Configs with versions below this cannot be migrated.
 */
export const MIN_LAYER_CONFIG_SCHEMA_VERSION = 1;

// =============================================================================
// Persisted Layer Config Base
// =============================================================================

/**
 * Base structure for all persisted layer configurations.
 * Every layer's persisted config must extend this.
 */
export interface PersistedLayerConfigBase {
	/**
	 * Schema version for this layer config.
	 * Used for migration support.
	 */
	_version: number;

	/**
	 * Layer type identifier (e.g., "wms-raster", "geojson-points").
	 * Must match the layer's `type` field.
	 */
	_type: string;

	/**
	 * Layer ID (stable identifier).
	 */
	id: string;
}

// =============================================================================
// Validation Errors
// =============================================================================

/**
 * Structured validation error with field path and message.
 */
export interface LayerValidationError {
	/** Field path (e.g., "baseUrl", "layers[0]", "style.fill") */
	path: string;
	/** Error message */
	message: string;
	/** Error code for programmatic handling */
	code: string;
	/** Actual value that failed validation (if available) */
	value?: unknown;
}

/**
 * Result of persisted layer config validation.
 */
export interface PersistedConfigValidationResult {
	/** Whether the config is valid */
	valid: boolean;
	/** Validation errors (if any) */
	errors: LayerValidationError[];
	/** Validation warnings (non-fatal issues) */
	warnings: LayerValidationError[];
}

// =============================================================================
// Migration Types
// =============================================================================

/**
 * Migration function that transforms a persisted config from one version to another.
 */
export type LayerConfigMigration = (config: PersistedLayerConfigBase) => PersistedLayerConfigBase;

/**
 * Migration information for a layer config.
 */
export interface LayerConfigMigrationInfo {
	/** Original schema version */
	fromVersion: number;
	/** Target schema version */
	toVersion: number;
	/** Migration steps applied */
	steps: string[];
	/** Warnings during migration */
	warnings: string[];
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Create a validation error.
 */
export function createValidationError(
	path: string,
	message: string,
	code: string,
	value?: unknown,
): LayerValidationError {
	return { path, message, code, value };
}

/**
 * Create a validation warning.
 */
export function createValidationWarning(
	path: string,
	message: string,
	code: string,
	value?: unknown,
): LayerValidationError {
	return { path, message, code, value };
}

/**
 * Validate that a value is a non-empty string.
 */
export function validateRequiredString(
	value: unknown,
	path: string,
	fieldName: string,
	errors: LayerValidationError[],
): value is string {
	if (typeof value !== "string" || value.trim().length === 0) {
		errors.push(
			createValidationError(
				path,
				`${fieldName} must be a non-empty string`,
				"INVALID_STRING",
				value,
			),
		);
		return false;
	}
	return true;
}

/**
 * Validate that a value is a number within a range.
 */
export function validateNumber(
	value: unknown,
	path: string,
	fieldName: string,
	options: {
		min?: number;
		max?: number;
		integer?: boolean;
		required?: boolean;
	},
	errors: LayerValidationError[],
): value is number {
	const { min, max, integer = false, required = false } = options;

	if (value === undefined || value === null) {
		if (required) {
			errors.push(createValidationError(path, `${fieldName} is required`, "MISSING_FIELD", value));
		}
		return false;
	}

	if (typeof value !== "number" || Number.isNaN(value)) {
		errors.push(
			createValidationError(path, `${fieldName} must be a number`, "INVALID_NUMBER", value),
		);
		return false;
	}

	if (integer && !Number.isInteger(value)) {
		errors.push(
			createValidationError(path, `${fieldName} must be an integer`, "NOT_INTEGER", value),
		);
		return false;
	}

	if (min !== undefined && value < min) {
		errors.push(
			createValidationError(path, `${fieldName} must be >= ${min}`, "VALUE_TOO_SMALL", value),
		);
		return false;
	}

	if (max !== undefined && value > max) {
		errors.push(
			createValidationError(path, `${fieldName} must be <= ${max}`, "VALUE_TOO_LARGE", value),
		);
		return false;
	}

	return true;
}

/**
 * Validate that a value is a valid URL.
 */
export function validateUrl(
	value: unknown,
	path: string,
	fieldName: string,
	errors: LayerValidationError[],
	required = true,
): value is string {
	if (value === undefined || value === null) {
		if (required) {
			errors.push(createValidationError(path, `${fieldName} is required`, "MISSING_FIELD", value));
		}
		return false;
	}

	if (typeof value !== "string") {
		errors.push(
			createValidationError(path, `${fieldName} must be a string`, "INVALID_TYPE", value),
		);
		return false;
	}

	try {
		new URL(value);
		return true;
	} catch {
		// Try with a base URL for relative URLs
		try {
			new URL(value, "http://localhost");
			return true;
		} catch {
			errors.push(
				createValidationError(path, `${fieldName} must be a valid URL`, "INVALID_URL", value),
			);
			return false;
		}
	}
}

/**
 * Validate that a value is an array.
 */
export function validateArray<T>(
	value: unknown,
	path: string,
	fieldName: string,
	errors: LayerValidationError[],
	itemValidator?: (item: unknown, itemPath: string, errors: LayerValidationError[]) => item is T,
	required = true,
): value is T[] {
	if (value === undefined || value === null) {
		if (required) {
			errors.push(createValidationError(path, `${fieldName} is required`, "MISSING_FIELD", value));
		}
		return false;
	}

	if (!Array.isArray(value)) {
		errors.push(
			createValidationError(path, `${fieldName} must be an array`, "INVALID_TYPE", value),
		);
		return false;
	}

	if (itemValidator) {
		for (let i = 0; i < value.length; i++) {
			const itemPath = `${path}[${i}]`;
			if (!itemValidator(value[i], itemPath, errors)) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Validate that a value is an object.
 */
export function validateObject(
	value: unknown,
	path: string,
	fieldName: string,
	errors: LayerValidationError[],
	required = true,
): value is Record<string, unknown> {
	if (value === undefined || value === null) {
		if (required) {
			errors.push(createValidationError(path, `${fieldName} is required`, "MISSING_FIELD", value));
		}
		return false;
	}

	if (typeof value !== "object" || Array.isArray(value) || value === null) {
		errors.push(
			createValidationError(path, `${fieldName} must be an object`, "INVALID_TYPE", value),
		);
		return false;
	}

	return true;
}

/**
 * Validate schema version for migration support.
 */
export function validateSchemaVersion(
	config: unknown,
	errors: LayerValidationError[],
	warnings: LayerValidationError[],
): config is PersistedLayerConfigBase {
	if (!validateObject(config, "", "config", errors)) {
		return false;
	}

	const cfg = config as Record<string, unknown>;

	// Check _version
	if (
		!validateNumber(
			cfg["_version"],
			"_version",
			"Schema version",
			{ integer: true, min: 1, required: true },
			errors,
		)
	) {
		return false;
	}

	const version = cfg["_version"] as number;

	if (version < MIN_LAYER_CONFIG_SCHEMA_VERSION) {
		errors.push(
			createValidationError(
				"_version",
				`Schema version ${version} is too old (minimum: ${MIN_LAYER_CONFIG_SCHEMA_VERSION})`,
				"VERSION_TOO_OLD",
				version,
			),
		);
		return false;
	}

	if (version > LAYER_CONFIG_SCHEMA_VERSION) {
		warnings.push(
			createValidationWarning(
				"_version",
				`Schema version ${version} is newer than current (${LAYER_CONFIG_SCHEMA_VERSION})`,
				"VERSION_NEWER",
				version,
			),
		);
	}

	// Check _type
	if (!validateRequiredString(cfg["_type"], "_type", "Layer type", errors)) {
		return false;
	}

	// Check id
	if (!validateRequiredString(cfg["id"], "id", "Layer ID", errors)) {
		return false;
	}

	return true;
}

// =============================================================================
// Migration Helpers
// =============================================================================

/**
 * Migrate a persisted layer config to the current schema version.
 */
export function migrateLayerConfig(
	config: PersistedLayerConfigBase,
	migrations: Map<number, LayerConfigMigration>,
): { config: PersistedLayerConfigBase; info: LayerConfigMigrationInfo } {
	const info: LayerConfigMigrationInfo = {
		fromVersion: config["_version"],
		toVersion: LAYER_CONFIG_SCHEMA_VERSION,
		steps: [],
		warnings: [],
	};

	let current = { ...config };

	// Apply migrations sequentially
	while (current["_version"] < LAYER_CONFIG_SCHEMA_VERSION) {
		const migration = migrations.get(current["_version"]);
		if (!migration) {
			// No migration available - skip to next version
			current["_version"] += 1;
			info.steps.push(`Skipped v${current["_version"] - 1} (no migration)`);
			continue;
		}

		const fromVersion = current["_version"];
		current = migration(current);
		current["_version"] = fromVersion + 1;
		info.steps.push(`Migrated from v${fromVersion} to v${fromVersion + 1}`);
	}

	return { config: current, info };
}
