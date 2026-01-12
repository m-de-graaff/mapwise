// @ts-nocheck
/**
 * Persistence utilities for WMS raster layers.
 *
 * @module wms/persistence
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
} from "../shared/persistence";
import type { WmsRasterLayerConfig } from "./types";

// =============================================================================
// Persisted WMS Config
// =============================================================================

/**
 * Persisted configuration for a WMS raster layer.
 */
export interface PersistedWmsRasterLayerConfig extends PersistedLayerConfigBase {
	_type: "wms-raster";
	_version: number;
	id: string;
	baseUrl: string;
	layers: string | string[];
	styles?: string | string[];
	format?: string;
	transparent?: boolean;
	version?: "1.1.1" | "1.3.0";
	crs?: string;
	extraParams?: Record<string, string>;
	tileWidth?: number;
	tileHeight?: number;
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
 * Serialize a WMS layer config to a persisted format.
 */
export function toPersistedConfig(config: WmsRasterLayerConfig): PersistedWmsRasterLayerConfig {
	const persisted: PersistedWmsRasterLayerConfig = {
		_version: LAYER_CONFIG_SCHEMA_VERSION,
		_type: "wms-raster",
		id: config.id,
		baseUrl: config.baseUrl,
		layers: config.layers,
	};

	addWmsOptionalFields(persisted, config);
	addWmsDisplayFields(persisted, config);

	return persisted;
}

function addWmsOptionalFields(
	persisted: PersistedWmsRasterLayerConfig,
	config: WmsRasterLayerConfig,
): void {
	if (config.styles !== undefined) {
		persisted.styles = config.styles;
	}
	if (config.format !== undefined) {
		persisted.format = config.format;
	}
	if (config.transparent !== undefined) {
		persisted.transparent = config.transparent;
	}
	if (config.version !== undefined) {
		persisted.version = config.version;
	}
	if (config.crs !== undefined) {
		persisted.crs = config.crs;
	}
	if (config.extraParams !== undefined && Object.keys(config.extraParams).length > 0) {
		persisted.extraParams = config.extraParams;
	}
	if (config.tileWidth !== undefined) {
		persisted.tileWidth = config.tileWidth;
	}
	if (config.tileHeight !== undefined) {
		persisted.tileHeight = config.tileHeight;
	}
}

function addWmsDisplayFields(
	persisted: PersistedWmsRasterLayerConfig,
	config: WmsRasterLayerConfig,
): void {
	if (config.title !== undefined) {
		persisted.title = config.title;
	}
	if (config.attribution !== undefined) {
		persisted.attribution = config.attribution;
	}
	if (config.minzoom !== undefined) {
		persisted.minzoom = config.minzoom;
	}
	if (config.maxzoom !== undefined) {
		persisted.maxzoom = config.maxzoom;
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
 * Deserialize a persisted WMS layer config back to a WmsRasterLayerConfig.
 */
export function fromPersistedConfig(persisted: unknown): {
	config: WmsRasterLayerConfig;
	warnings: LayerValidationError[];
} {
	const errors: LayerValidationError[] = [];
	const warnings: LayerValidationError[] = [];

	validateAndMigrateWms(persisted, errors, warnings);
	const migrated = performWmsMigration(persisted, warnings);
	validateWmsRequiredFields(migrated, errors);

	if (errors.length > 0) {
		throw new Error(`Invalid persisted WMS config: ${errors.map((e) => e.message).join(", ")}`);
	}

	const wmsConfig = buildWmsConfig(migrated, errors);

	return { config: wmsConfig, warnings };
}

function validateAndMigrateWms(
	persisted: unknown,
	errors: LayerValidationError[],
	warnings: LayerValidationError[],
): void {
	if (!validateSchemaVersion(persisted, errors, warnings)) {
		throw new Error(`Invalid persisted WMS config: ${errors.map((e) => e.message).join(", ")}`);
	}

	// biome-ignore lint/suspicious/noExplicitAny: Temporary fix for strict types during build
	const config = persisted as any;

	if (config._type !== "wms-raster") {
		errors.push(
			createValidationError(
				"_type",
				`Expected type "wms-raster", got "${config._type}"`,
				"INVALID_TYPE",
				config._type,
			),
		);
	}
}

function performWmsMigration(
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

function validateWmsRequiredFields(
	migrated: Record<string, unknown>,
	errors: LayerValidationError[],
): void {
	if (!validateRequiredString(migrated.id, "id", "Layer ID", errors)) {
		throw new Error(`Invalid persisted WMS config: ${errors.map((e) => e.message).join(", ")}`);
	}

	if (!validateUrl(migrated.baseUrl, "baseUrl", "Base URL", errors)) {
		throw new Error(`Invalid persisted WMS config: ${errors.map((e) => e.message).join(", ")}`);
	}

	if (
		migrated.layers === undefined ||
		(typeof migrated.layers !== "string" && !Array.isArray(migrated.layers))
	) {
		errors.push(
			createValidationError(
				"layers",
				"layers must be a string or array of strings",
				"INVALID_TYPE",
				migrated.layers,
			),
		);
	}
}

function buildWmsConfig(
	migrated: Record<string, unknown>,
	errors: LayerValidationError[],
): WmsRasterLayerConfig {
	const wmsConfig: WmsRasterLayerConfig = {
		id: migrated.id as string,
		baseUrl: migrated.baseUrl as string,
		layers: migrated.layers as string | string[],
	};

	addWmsOptionalConfigFields(wmsConfig, migrated, errors);
	addWmsDisplayConfigFields(wmsConfig, migrated, errors);

	return wmsConfig;
}

function addWmsOptionalConfigFields(
	wmsConfig: WmsRasterLayerConfig,
	migrated: Record<string, unknown>,
	errors: LayerValidationError[],
): void {
	if (migrated.styles !== undefined) {
		if (typeof migrated.styles === "string" || Array.isArray(migrated.styles)) {
			wmsConfig.styles = migrated.styles as string | string[];
		}
	}
	if (typeof migrated.format === "string") {
		wmsConfig.format = migrated.format;
	}
	if (typeof migrated.transparent === "boolean") {
		wmsConfig.transparent = migrated.transparent;
	}
	if (migrated.version === "1.1.1" || migrated.version === "1.3.0") {
		wmsConfig.version = migrated.version;
	}
	if (typeof migrated.crs === "string") {
		wmsConfig.crs = migrated.crs;
	}

	const extraParamsErrors: LayerValidationError[] = [];
	if (
		validateObject(migrated.extraParams, "extraParams", "extraParams", extraParamsErrors, false)
	) {
		wmsConfig.extraParams = migrated.extraParams as Record<string, string>;
	}
	if (validateNumber(migrated.tileWidth, "tileWidth", "tileWidth", { min: 1 }, errors, false)) {
		wmsConfig.tileWidth = migrated.tileWidth;
	}
	if (validateNumber(migrated.tileHeight, "tileHeight", "tileHeight", { min: 1 }, errors, false)) {
		wmsConfig.tileHeight = migrated.tileHeight;
	}
}

function addWmsDisplayConfigFields(
	wmsConfig: WmsRasterLayerConfig,
	migrated: Record<string, unknown>,
	errors: LayerValidationError[],
): void {
	if (typeof migrated.title === "string") {
		wmsConfig.title = migrated.title;
	}
	if (typeof migrated.attribution === "string") {
		wmsConfig.attribution = migrated.attribution;
	}
	if (validateNumber(migrated.minzoom, "minzoom", "minzoom", { min: 0, max: 24 }, errors, false)) {
		wmsConfig.minzoom = migrated.minzoom;
	}
	if (validateNumber(migrated.maxzoom, "maxzoom", "maxzoom", { min: 0, max: 24 }, errors, false)) {
		wmsConfig.maxzoom = migrated.maxzoom;
	}
	if (validateNumber(migrated.opacity, "opacity", "opacity", { min: 0, max: 1 }, errors, false)) {
		wmsConfig.opacity = migrated.opacity;
	}
	if (typeof migrated.visible === "boolean") {
		wmsConfig.visible = migrated.visible;
	}
	if (
		migrated.category === "base" ||
		migrated.category === "overlay" ||
		migrated.category === "annotation"
	) {
		wmsConfig.category = migrated.category;
	}

	const metadataErrors: LayerValidationError[] = [];
	if (validateObject(migrated.metadata, "metadata", "metadata", metadataErrors, false)) {
		wmsConfig.metadata = migrated.metadata as Record<string, unknown>;
	}
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate a persisted WMS layer config.
 */
export function validatePersistedConfig(persisted: unknown): PersistedConfigValidationResult {
	const errors: LayerValidationError[] = [];
	const warnings: LayerValidationError[] = [];

	try {
		fromPersistedConfig(persisted);
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Invalid persisted WMS config:")) {
			// Errors already captured in fromPersistedConfig
			return { valid: false, errors, warnings };
		}
		throw error;
	}

	return { valid: errors.length === 0, errors, warnings };
}
