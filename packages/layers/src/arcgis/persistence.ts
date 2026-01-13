// @ts-nocheck
/**
 * Persistence utilities for ArcGIS REST raster layers.
 *
 * @module arcgis/persistence
 */

import {
	LAYER_CONFIG_SCHEMA_VERSION,
	type LayerValidationError,
	type PersistedConfigValidationResult,
	type PersistedLayerConfigBase,
	createValidationError,
	migrateLayerConfig,
	validateNumber,
	validateObject,
	validateRequiredString,
	validateSchemaVersion,
	validateUrl,
} from "../shared/persistence.js";
import type { ArcGisRestRasterLayerConfig } from "./types.js";

// =============================================================================
// Persisted ArcGIS Config
// =============================================================================

/**
 * Persisted configuration for an ArcGIS REST raster layer.
 */
export interface PersistedArcGisRestRasterLayerConfig extends PersistedLayerConfigBase {
	_type: "arcgis-raster";
	_version: number;
	id: string;
	serviceUrl: string;
	layerId?: number;
	format?: string;
	transparent?: boolean;
	tileWidth?: number;
	tileHeight?: number;
	crs?: string;
	extraParams?: Record<string, string>;
	title?: string;
	attribution?: string;
	minzoom?: number;
	maxzoom?: number;
	opacity?: number;
	visible?: boolean;
	category?: "base" | "overlay" | "annotation";
	metadata?: Record<string, unknown>;
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serialize an ArcGIS layer config to a persisted format.
 */
export function toPersistedConfig(
	config: ArcGisRestRasterLayerConfig,
): PersistedArcGisRestRasterLayerConfig {
	const persisted: PersistedArcGisRestRasterLayerConfig = {
		_version: LAYER_CONFIG_SCHEMA_VERSION,
		_type: "arcgis-raster",
		id: config.id,
		serviceUrl: config.serviceUrl,
	};

	addOptionalFields(persisted, config);
	addLayerFields(persisted, config);
	addDisplayFields(persisted, config);

	return persisted;
}

function addOptionalFields(
	persisted: PersistedArcGisRestRasterLayerConfig,
	config: ArcGisRestRasterLayerConfig,
): void {
	if (config.layerId !== undefined) {
		persisted.layerId = config.layerId;
	}
	if (config.format !== undefined) {
		persisted.format = config.format;
	}
	if (config.transparent !== undefined) {
		persisted.transparent = config.transparent;
	}
	if (config.crs !== undefined) {
		persisted.crs = config.crs;
	}
	if (config.extraParams !== undefined && Object.keys(config.extraParams).length > 0) {
		persisted.extraParams = config.extraParams;
	}
}

function addLayerFields(
	persisted: PersistedArcGisRestRasterLayerConfig,
	config: ArcGisRestRasterLayerConfig,
): void {
	if (config.tileWidth !== undefined) {
		persisted.tileWidth = config.tileWidth;
	}
	if (config.tileHeight !== undefined) {
		persisted.tileHeight = config.tileHeight;
	}
	if (config.minzoom !== undefined) {
		persisted.minzoom = config.minzoom;
	}
	if (config.maxzoom !== undefined) {
		persisted.maxzoom = config.maxzoom;
	}
}

function addDisplayFields(
	persisted: PersistedArcGisRestRasterLayerConfig,
	config: ArcGisRestRasterLayerConfig,
): void {
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
}

// =============================================================================
// Deserialization
// =============================================================================

/**
 * Deserialize a persisted ArcGIS layer config back to an ArcGisRestRasterLayerConfig.
 */
export function fromPersistedConfig(persisted: unknown): {
	config: ArcGisRestRasterLayerConfig;
	warnings: LayerValidationError[];
} {
	const errors: LayerValidationError[] = [];
	const warnings: LayerValidationError[] = [];

	validateAndMigrate(persisted, errors, warnings);
	const migrated = performMigration(persisted, warnings);
	validateRequiredFields(migrated, errors);

	if (errors.length > 0) {
		throw new Error(`Invalid persisted ArcGIS config: ${errors.map((e) => e.message).join(", ")}`);
	}

	const arcgisConfig = buildConfig(migrated, errors);

	return { config: arcgisConfig, warnings };
}

function validateAndMigrate(
	persisted: unknown,
	errors: LayerValidationError[],
	warnings: LayerValidationError[],
): void {
	if (!validateSchemaVersion(persisted, errors, warnings)) {
		throw new Error(`Invalid persisted ArcGIS config: ${errors.map((e) => e.message).join(", ")}`);
	}

	// biome-ignore lint/suspicious/noExplicitAny: Temporary fix for strict types during build
	const config = persisted as any;

	if (config["_type"] !== "arcgis-raster") {
		errors.push(
			createValidationError(
				"_type",
				`Expected type "arcgis-raster", got "${config["_type"]}"`,
				"INVALID_TYPE",
				config["_type"],
			),
		);
	}
}

function performMigration(
	persisted: unknown,
	warnings: LayerValidationError[],
): Record<string, unknown> {
	const config = persisted as Record<string, unknown>;
	const migrations = new Map<number, (cfg: PersistedLayerConfigBase) => PersistedLayerConfigBase>();
	const { config: migratedConfig, info: migrationInfo } = migrateLayerConfig(
		config as PersistedLayerConfigBase,
		migrations,
	);

	warnings.push(
		...migrationInfo.warnings.map((w) => createValidationError("", w, "MIGRATION_WARNING")),
	);

	return migratedConfig as Record<string, unknown>;
}

function validateRequiredFields(
	migrated: Record<string, unknown>,
	errors: LayerValidationError[],
): void {
	if (!validateRequiredString(migrated["id"], "id", "Layer ID", errors)) {
		throw new Error(`Invalid persisted ArcGIS config: ${errors.map((e) => e.message).join(", ")}`);
	}

	if (!validateUrl(migrated["serviceUrl"], "serviceUrl", "Service URL", errors)) {
		throw new Error(`Invalid persisted ArcGIS config: ${errors.map((e) => e.message).join(", ")}`);
	}
}

function buildConfig(
	migrated: Record<string, unknown>,
	errors: LayerValidationError[],
): ArcGisRestRasterLayerConfig {
	const arcgisConfig: ArcGisRestRasterLayerConfig = {
		id: migrated["id"] as string,
		serviceUrl: migrated["serviceUrl"] as string,
	};

	addOptionalConfigFields(arcgisConfig, migrated, errors);
	addDisplayConfigFields(arcgisConfig, migrated, errors);

	return arcgisConfig;
}

function addOptionalConfigFields(
	arcgisConfig: ArcGisRestRasterLayerConfig,
	migrated: Record<string, unknown>,
	errors: LayerValidationError[],
): void {
	if (
		validateNumber(
			migrated["layerId"],
			"layerId",
			"layerId",
			{ min: 0, integer: true },
			errors,
			false,
		)
	) {
		arcgisConfig.layerId = migrated["layerId"] as number;
	}
	if (typeof migrated["format"] === "string") {
		arcgisConfig.format = migrated["format"];
	}
	if (typeof migrated["transparent"] === "boolean") {
		arcgisConfig.transparent = migrated["transparent"];
	}
	if (validateNumber(migrated["tileWidth"], "tileWidth", "tileWidth", { min: 1 }, errors, false)) {
		arcgisConfig.tileWidth = migrated["tileWidth"] as number;
	}
	if (
		validateNumber(migrated["tileHeight"], "tileHeight", "tileHeight", { min: 1 }, errors, false)
	) {
		arcgisConfig.tileHeight = migrated["tileHeight"] as number;
	}
	if (typeof migrated["crs"] === "string") {
		arcgisConfig.crs = migrated["crs"];
	}

	const extraParamsErrors: LayerValidationError[] = [];
	if (
		validateObject(migrated["extraParams"], "extraParams", "extraParams", extraParamsErrors, false)
	) {
		arcgisConfig.extraParams = migrated["extraParams"] as Record<string, string>;
	}
}

function addDisplayConfigFields(
	arcgisConfig: ArcGisRestRasterLayerConfig,
	migrated: Record<string, unknown>,
	errors: LayerValidationError[],
): void {
	if (typeof migrated["title"] === "string") {
		arcgisConfig.title = migrated["title"];
	}
	if (typeof migrated["attribution"] === "string") {
		arcgisConfig.attribution = migrated["attribution"];
	}
	if (
		validateNumber(migrated["minzoom"], "minzoom", "minzoom", { min: 0, max: 24 }, errors, false)
	) {
		arcgisConfig.minzoom = migrated["minzoom"] as number;
	}
	if (
		validateNumber(migrated["maxzoom"], "maxzoom", "maxzoom", { min: 0, max: 24 }, errors, false)
	) {
		arcgisConfig.maxzoom = migrated["maxzoom"] as number;
	}
	if (
		validateNumber(migrated["opacity"], "opacity", "opacity", { min: 0, max: 1 }, errors, false)
	) {
		arcgisConfig.opacity = migrated["opacity"] as number;
	}
	if (typeof migrated["visible"] === "boolean") {
		arcgisConfig.visible = migrated["visible"];
	}
	if (
		migrated["category"] === "base" ||
		migrated["category"] === "overlay" ||
		migrated["category"] === "annotation"
	) {
		arcgisConfig.category = migrated["category"];
	}

	const metadataErrors: LayerValidationError[] = [];
	if (validateObject(migrated["metadata"], "metadata", "metadata", metadataErrors, false)) {
		arcgisConfig.metadata = migrated["metadata"] as Record<string, unknown>;
	}
}

/**
 * Validate a persisted ArcGIS layer config.
 */
export function validatePersistedConfig(persisted: unknown): PersistedConfigValidationResult {
	const errors: LayerValidationError[] = [];
	const warnings: LayerValidationError[] = [];

	try {
		fromPersistedConfig(persisted);
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Invalid persisted ArcGIS config:")) {
			return { valid: false, errors, warnings };
		}
		throw error;
	}

	return { valid: errors.length === 0, errors, warnings };
}
