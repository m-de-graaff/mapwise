/**
 * Persistence utilities for XYZ raster layers.
 *
 * @module xyz/persistence
 */

import {
	LAYER_CONFIG_SCHEMA_VERSION,
	type LayerValidationError,
	type PersistedConfigValidationResult,
	type PersistedLayerConfigBase,
	createValidationError,
	migrateLayerConfig,
	validateArray,
	validateNumber,
	validateObject,
	validateRequiredString,
	validateSchemaVersion,
} from "../shared/persistence";
import type { XyzRasterLayerConfig } from "./types";

// =============================================================================
// Persisted XYZ Config
// =============================================================================

/**
 * Persisted configuration for an XYZ raster layer.
 */
export interface PersistedXyzRasterLayerConfig extends PersistedLayerConfigBase {
	_type: "xyz-raster";
	_version: number;
	id: string;
	tiles: string | string[];
	tileSize?: number;
	minzoom?: number;
	maxzoom?: number;
	subdomains?: string[];
	tms?: boolean;
	title?: string;
	attribution?: string;
	opacity?: number;
	visible?: boolean;
	category?: "base" | "overlay" | "annotation";
	metadata?: Record<string, unknown>;
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serialize an XYZ layer config to a persisted format.
 */
export function toPersistedConfig(config: XyzRasterLayerConfig): PersistedXyzRasterLayerConfig {
	const persisted: PersistedXyzRasterLayerConfig = {
		_version: LAYER_CONFIG_SCHEMA_VERSION,
		_type: "xyz-raster",
		id: config.id,
		tiles: config.tiles,
	};

	if (config.tileSize !== undefined) {
		persisted.tileSize = config.tileSize;
	}
	if (config.minzoom !== undefined) {
		persisted.minzoom = config.minzoom;
	}
	if (config.maxzoom !== undefined) {
		persisted.maxzoom = config.maxzoom;
	}
	if (config.subdomains !== undefined && config.subdomains.length > 0) {
		persisted.subdomains = config.subdomains;
	}
	if (config.tms !== undefined) {
		persisted.tms = config.tms;
	}
	if (config.title !== undefined) {
		persisted.title = config.title;
	}
	if (config.attribution !== undefined) {
		persisted.attribution = config.attribution;
	}
	if (config.opacity !== undefined) {
		persisted.opacity = config.opacity;
	}
	if (config.visible !== undefined) {
		persisted.visible = config.visible;
	}
	if (config.category !== undefined) {
		persisted.category = config.category;
	}
	if (config.metadata !== undefined) {
		persisted.metadata = config.metadata as Record<string, unknown>;
	}

	return persisted;
}

// =============================================================================
// Deserialization
// =============================================================================

/**
 * Deserialize a persisted XYZ layer config back to an XyzRasterLayerConfig.
 */
export function fromPersistedConfig(persisted: unknown): {
	config: XyzRasterLayerConfig;
	warnings: LayerValidationError[];
} {
	const errors: LayerValidationError[] = [];
	const warnings: LayerValidationError[] = [];

	if (!validateSchemaVersion(persisted, errors, warnings)) {
		throw new Error(`Invalid persisted XYZ config: ${errors.map((e) => e.message).join(", ")}`);
	}

	const config = persisted as Record<string, unknown>;

	if (config["_type"] !== "xyz-raster") {
		errors.push(
			createValidationError(
				"_type",
				`Expected type "xyz-raster", got "${config["_type"]}"`,
				"INVALID_TYPE",
				config["_type"],
			),
		);
	}

	const migrations = new Map<number, (cfg: PersistedLayerConfigBase) => PersistedLayerConfigBase>();
	const { config: migratedConfig, info: migrationInfo } = migrateLayerConfig(
		config as PersistedLayerConfigBase,
		migrations,
	);

	warnings.push(
		...migrationInfo.warnings.map((w) => createValidationError("", w, "MIGRATION_WARNING")),
	);

	const migrated = migratedConfig as Record<string, unknown>;

	if (!validateRequiredString(migrated["id"], "id", "Layer ID", errors)) {
		throw new Error(`Invalid persisted XYZ config: ${errors.map((e) => e.message).join(", ")}`);
	}

	// Validate tiles - must be string or array of strings
	const tilesErrors: LayerValidationError[] = [];
	if (!validateTiles(migrated["tiles"], tilesErrors)) {
		errors.push(...tilesErrors);
	}

	if (errors.length > 0) {
		throw new Error(`Invalid persisted XYZ config: ${errors.map((e) => e.message).join(", ")}`);
	}

	const xyzConfig: XyzRasterLayerConfig = {
		id: migrated["id"] as string,
		tiles: migrated["tiles"] as string | string[],
	};

	parseOptionalProperties(xyzConfig, migrated, errors);

	return { config: xyzConfig, warnings };
}

function validateTiles(tiles: unknown, errors: LayerValidationError[]): boolean {
	if (
		typeof tiles !== "string" &&
		!validateArray<string>(
			tiles,
			"tiles",
			"tiles",
			errors,
			(item): item is string => typeof item === "string",
		)
	) {
		if (typeof tiles !== "string") {
			errors.push(
				createValidationError(
					"tiles",
					"tiles must be a string or array of strings",
					"INVALID_TYPE",
					tiles,
				),
			);
		}
		return false;
	}
	return true;
}

function parseOptionalProperties(
	config: XyzRasterLayerConfig,
	migrated: Record<string, unknown>,
	errors: LayerValidationError[],
): void {
	if (validateNumber(migrated["tileSize"], "tileSize", "tileSize", { min: 1 }, errors)) {
		config.tileSize = migrated["tileSize"] as number;
	}
	if (validateNumber(migrated["minzoom"], "minzoom", "minzoom", { min: 0, max: 24 }, errors)) {
		config.minzoom = migrated["minzoom"] as number;
	}
	if (validateNumber(migrated["maxzoom"], "maxzoom", "maxzoom", { min: 0, max: 24 }, errors)) {
		config.maxzoom = migrated["maxzoom"] as number;
	}

	const subdomainErrors: LayerValidationError[] = [];
	if (
		validateArray<string>(
			migrated["subdomains"],
			"subdomains",
			"subdomains",
			subdomainErrors,
			(item): item is string => typeof item === "string",
			false,
		)
	) {
		config.subdomains = migrated["subdomains"] as string[];
	}

	if (typeof migrated["tms"] === "boolean") {
		config.tms = migrated["tms"];
	}
	if (typeof migrated["title"] === "string") {
		config.title = migrated["title"];
	}
	if (typeof migrated["attribution"] === "string") {
		config.attribution = migrated["attribution"];
	}
	if (validateNumber(migrated["opacity"], "opacity", "opacity", { min: 0, max: 1 }, errors)) {
		config.opacity = migrated["opacity"] as number;
	}
	if (typeof migrated["visible"] === "boolean") {
		config.visible = migrated["visible"];
	}
	if (
		migrated["category"] === "base" ||
		migrated["category"] === "overlay" ||
		migrated["category"] === "annotation"
	) {
		config.category = migrated["category"];
	}

	const metadataErrors: LayerValidationError[] = [];
	if (validateObject(migrated["metadata"], "metadata", "metadata", metadataErrors, false)) {
		config.metadata = migrated["metadata"] as Record<string, unknown>;
	}
}

/**
 * Validate a persisted XYZ layer config.
 */
export function validatePersistedConfig(persisted: unknown): PersistedConfigValidationResult {
	const errors: LayerValidationError[] = [];
	const warnings: LayerValidationError[] = [];

	try {
		fromPersistedConfig(persisted);
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Invalid persisted XYZ config:")) {
			return { valid: false, errors, warnings };
		}
		throw error;
	}

	return { valid: errors.length === 0, errors, warnings };
}
