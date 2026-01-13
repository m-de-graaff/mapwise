/**
 * State hydration for map restoration.
 *
 * @module persistence/hydrate
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import type { StyleManager } from "../map/style-manager.js";
import type { LayerRegistry } from "../registry/layer-registry.js";
import type { PluginManager } from "../registry/plugin-registry.js";
import {
	type HydrateOptions,
	type HydrateResult,
	MIN_SCHEMA_VERSION,
	type MigrationInfo,
	type PersistedLayerState,
	type PersistedMapState,
	type PersistedPluginState,
	SCHEMA_VERSION,
	type ValidationResult,
} from "./persistence-types.js";

// =============================================================================
// Hydration Context
// =============================================================================

export interface HydrationContext {
	map: MapLibreMap | null;
	styleManager: StyleManager;
	layerRegistry: LayerRegistry;
	pluginManager: PluginManager;
	setPluginState: (pluginId: string, key: string, value: unknown) => void;
}

// =============================================================================
// Main Hydration Function
// =============================================================================

function createInvalidStateResult(errors: string[]): HydrateResult {
	return {
		success: false,
		error: `Invalid state: ${errors.join(", ")}`,
		layersRestored: 0,
		pluginsRestored: 0,
		layerErrors: [],
		pluginErrors: [],
	};
}

async function tryRestoreBasemap(
	ctx: HydrationContext,
	basemap: string,
	restoreBasemap: boolean,
): Promise<void> {
	if (!(restoreBasemap && basemap && ctx.map)) {
		return;
	}

	try {
		await ctx.styleManager.setBasemap(basemap);
	} catch (error) {
		console.warn(
			`[@mapwise/core] Failed to restore basemap: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

function applyMigration(
	state: PersistedMapState,
	customMigrate: ((s: PersistedMapState) => PersistedMapState) | undefined,
	onMigration: ((info: MigrationInfo) => void) | undefined,
): { migratedState: PersistedMapState; migrationInfo?: MigrationInfo } {
	if (state.version >= SCHEMA_VERSION) {
		return { migratedState: state };
	}

	const migrationResult = migrateState(state);
	let migratedState = migrationResult.state;

	if (customMigrate) {
		migratedState = customMigrate(migratedState);
	}

	if (onMigration) {
		onMigration(migrationResult.info);
	}

	return { migratedState, migrationInfo: migrationResult.info };
}

/**
 * Hydrate (restore) map state from a persisted state object.
 *
 * @param ctx - Hydration context with access to map components
 * @param state - Persisted state to restore
 * @param options - Hydration options
 * @returns Result of the hydration operation
 */
export async function hydrateState(
	ctx: HydrationContext,
	state: PersistedMapState,
	options: HydrateOptions = {},
): Promise<HydrateResult> {
	const {
		restoreViewport = true,
		restoreLayerState = true,
		restorePlugins = true,
		restoreBasemap = true,
		layerMergeStrategy = "keep",
		migrate: customMigrate,
		onMigration,
	} = options;

	const validation = validateState(state);
	if (!validation.valid) {
		return createInvalidStateResult(validation.errors);
	}

	const { migratedState, migrationInfo } = applyMigration(state, customMigrate, onMigration);

	const result: HydrateResult = {
		success: true,
		layersRestored: 0,
		pluginsRestored: 0,
		layerErrors: [],
		pluginErrors: [],
	};

	if (migrationInfo) {
		result.migration = migrationInfo;
	}

	try {
		await tryRestoreBasemap(ctx, migratedState.basemap, restoreBasemap);

		if (restoreViewport && ctx.map) {
			restoreMapViewport(ctx.map, migratedState);
		}

		const layerResult = await restoreLayers(ctx.layerRegistry, migratedState.layers, {
			restoreState: restoreLayerState,
			mergeStrategy: layerMergeStrategy,
		});
		result.layersRestored = layerResult.restored;
		result.layerErrors = layerResult.errors;

		if (restorePlugins) {
			const pluginResult = await restorePluginStates(
				ctx.pluginManager,
				ctx.setPluginState,
				migratedState.plugins,
			);
			result.pluginsRestored = pluginResult.restored;
			result.pluginErrors = pluginResult.errors;
		}
	} catch (error) {
		result.success = false;
		result.error = error instanceof Error ? error.message : String(error);
	}

	return result;
}

// =============================================================================
// Validation
// =============================================================================

function validateVersion(s: PersistedMapState, errors: string[], warnings: string[]): void {
	if (typeof s.version !== "number") {
		errors.push("Missing or invalid version");
	} else if (s.version < MIN_SCHEMA_VERSION) {
		errors.push(`Schema version ${s.version} is too old (minimum: ${MIN_SCHEMA_VERSION})`);
	} else if (s.version > SCHEMA_VERSION) {
		warnings.push(`Schema version ${s.version} is newer than current (${SCHEMA_VERSION})`);
	}
}

function validateViewport(s: PersistedMapState, errors: string[]): void {
	if (!s.viewport || typeof s.viewport !== "object") {
		errors.push("Missing or invalid viewport");
		return;
	}

	if (!Array.isArray(s.viewport.center) || s.viewport.center.length !== 2) {
		errors.push("Invalid viewport.center");
	}
	if (typeof s.viewport.zoom !== "number") {
		errors.push("Invalid viewport.zoom");
	}
}

/**
 * Validate a persisted state object.
 */
export function validateState(state: unknown): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!state || typeof state !== "object") {
		return { valid: false, errors: ["State must be an object"], warnings: [] };
	}

	const s = state as PersistedMapState;

	validateVersion(s, errors, warnings);

	if (typeof s.timestamp !== "number") {
		errors.push("Missing or invalid timestamp");
	}

	if (typeof s.basemap !== "string") {
		errors.push("Missing or invalid basemap");
	}

	validateViewport(s, errors);

	if (!Array.isArray(s.layers)) {
		errors.push("Missing or invalid layers array");
	}

	if (!Array.isArray(s.plugins)) {
		errors.push("Missing or invalid plugins array");
	}

	return { valid: errors.length === 0, errors, warnings };
}

/**
 * Check if a value looks like a valid PersistedMapState.
 */
export function isPersistedMapState(value: unknown): value is PersistedMapState {
	return validateState(value).valid;
}

// =============================================================================
// Migration
// =============================================================================

interface MigrationResult {
	state: PersistedMapState;
	info: MigrationInfo;
}

/**
 * Migrate a persisted state from an older version to the current version.
 */
function migrateState(state: PersistedMapState): MigrationResult {
	const info: MigrationInfo = {
		fromVersion: state.version,
		toVersion: SCHEMA_VERSION,
		steps: [],
		warnings: [],
	};

	const current = { ...state };

	// Apply migrations sequentially
	// Currently at version 1, no migrations needed yet
	// Future migrations would be added here:
	//
	// if (current.version === 1) {
	//   current = migrateV1ToV2(current);
	//   info.steps.push('Migrated from v1 to v2');
	//   current.version = 2;
	// }

	current.version = SCHEMA_VERSION;
	info.steps.push(`Migrated from v${state.version} to v${SCHEMA_VERSION}`);

	return { state: current, info };
}

// =============================================================================
// Viewport Restoration
// =============================================================================

function restoreMapViewport(map: MapLibreMap, state: PersistedMapState): void {
	const { viewport } = state;

	map.jumpTo({
		center: viewport.center,
		zoom: viewport.zoom,
		bearing: viewport.bearing,
		pitch: viewport.pitch,
	});
}

// =============================================================================
// Layer Restoration
// =============================================================================

interface LayerRestoreOptions {
	restoreState: boolean;
	mergeStrategy: "keep" | "remove";
}

interface LayerRestoreResult {
	restored: number;
	errors: Array<{ id: string; error: string }>;
}

function removeUnpersistedLayers(
	registry: LayerRegistry,
	existingLayers: Set<string>,
	persistedLayerIds: Set<string>,
	errors: Array<{ id: string; error: string }>,
): void {
	for (const existingId of Array.from(existingLayers)) {
		if (persistedLayerIds.has(existingId)) {
			continue;
		}

		try {
			registry.removeLayer(existingId);
		} catch (error) {
			errors.push({
				id: existingId,
				error: `Failed to remove: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	}
}

function restoreLayerState(
	registry: LayerRegistry,
	persistedLayer: PersistedLayerState,
	restoreState: boolean,
): void {
	if (!restoreState) {
		return;
	}
	registry.setVisibility(persistedLayer.id, persistedLayer.visible);
	registry.setOpacity(persistedLayer.id, persistedLayer.opacity);
}

async function restoreLayers(
	registry: LayerRegistry,
	layers: PersistedLayerState[],
	options: LayerRestoreOptions,
): Promise<LayerRestoreResult> {
	const { restoreState, mergeStrategy } = options;
	const result: LayerRestoreResult = { restored: 0, errors: [] };

	const existingLayers = new Set(registry.getAllLayers().map((l) => l.id));
	const persistedLayerIds = new Set(layers.map((l) => l.id));

	if (mergeStrategy === "remove") {
		removeUnpersistedLayers(registry, existingLayers, persistedLayerIds, result.errors);
	}

	for (const persistedLayer of layers) {
		if (!existingLayers.has(persistedLayer.id)) {
			continue;
		}

		try {
			restoreLayerState(registry, persistedLayer, restoreState);
			result.restored++;
		} catch (error) {
			result.errors.push({
				id: persistedLayer.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return result;
}

// =============================================================================
// Plugin State Restoration
// =============================================================================

interface PluginRestoreResult {
	restored: number;
	errors: Array<{ id: string; error: string }>;
}

async function restorePluginStates(
	manager: PluginManager,
	_unused_setPluginState: (pluginId: string, key: string, value: unknown) => void,
	plugins: PersistedPluginState[],
): Promise<PluginRestoreResult> {
	const result: PluginRestoreResult = { restored: 0, errors: [] };

	for (const persistedPlugin of plugins) {
		try {
			// Check if plugin is currently registered
			if (!manager.has(persistedPlugin.id)) {
				result.errors.push({
					id: persistedPlugin.id,
					error: "Plugin not registered",
				});
				continue;
			}

			// Delegate hydration to plugin manager (handles custom logic and migrations)
			await manager.hydratePlugin(
				persistedPlugin.id,
				persistedPlugin.state,
				persistedPlugin.schemaVersion,
			);

			result.restored++;
		} catch (error) {
			result.errors.push({
				id: persistedPlugin.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return result;
}

// =============================================================================
// JSON Helpers
// =============================================================================

/**
 * Parse a JSON string into a PersistedMapState with validation.
 */
export function parsePersistedState(json: string): PersistedMapState {
	const parsed = JSON.parse(json);
	const validation = validateState(parsed);

	if (!validation.valid) {
		throw new Error(`Invalid persisted state: ${validation.errors.join(", ")}`);
	}

	return parsed as PersistedMapState;
}

/**
 * Stringify a PersistedMapState to JSON.
 */
export function stringifyPersistedState(state: PersistedMapState, pretty = false): string {
	return JSON.stringify(state, null, pretty ? 2 : undefined);
}
