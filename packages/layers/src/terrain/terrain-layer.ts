/**
 * Terrain layer factory function.
 *
 * @module terrain/terrain-layer
 */

import type { CustomLayerDefinition, LayerHandlerContext, MapController } from "@mapwise/core";
import type { RasterDEMSourceSpecification } from "maplibre-gl";
import { ensureSource, removeSourceSafe } from "../shared/maplibre";
import { validateBaseLayerConfig } from "../shared/validation";
import { createHillshadeLayer } from "./hillshade";
import type { EnableTerrainConfig, TerrainLayerConfig } from "./types";

// Minimal interface for MapController/MapLibre map to avoid ANY
interface MinimalMap {
	// biome-ignore lint/suspicious/noExplicitAny: MapLibre types compatibility
	getSource(id: string): any;
	setTerrain(options: { source: string; exaggeration: number } | null): void;
	// biome-ignore lint/suspicious/noExplicitAny: MapLibre types compatibility
	getTerrain(): any;
	// biome-ignore lint/suspicious/noExplicitAny: MapLibre types compatibility
	once(event: string, callback: (e: any) => void): void;
	// biome-ignore lint/suspicious/noExplicitAny: MapLibre types compatibility
	addLayer(layer: any, beforeId?: string): void;
	removeLayer(id: string): void;
	// biome-ignore lint/suspicious/noExplicitAny: MapLibre types compatibility
	getLayer(id: string): any;
	// biome-ignore lint/suspicious/noExplicitAny: MapLibre types compatibility
	setLayoutProperty(layerId: string, property: string, value: any): void;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates terrain layer configuration.
 */
export function validateTerrainConfig(config: unknown): void {
	const baseResult = validateBaseLayerConfig(config);
	if (!baseResult.valid) {
		throw new Error(`Invalid terrain layer config: ${baseResult.errors[0]?.message}`);
	}

	const cfg = config as Partial<TerrainLayerConfig>;
	validateDemTiles(cfg);
	validateExaggeration(cfg);
	validateTileSize(cfg);
	validateZoomLevels(cfg);
}

function validateDemTiles(cfg: Partial<TerrainLayerConfig>): void {
	if (!cfg.demTiles) {
		throw new Error("Terrain layer requires 'demTiles' property (string or array of strings)");
	}

	if (typeof cfg.demTiles !== "string" && !Array.isArray(cfg.demTiles)) {
		throw new Error("Terrain layer 'demTiles' must be a string or array of strings");
	}

	if (Array.isArray(cfg.demTiles) && cfg.demTiles.length === 0) {
		throw new Error("Terrain layer 'demTiles' array cannot be empty");
	}
}

function validateExaggeration(cfg: Partial<TerrainLayerConfig>): void {
	if (cfg.exaggeration === undefined) {
		return;
	}

	if (typeof cfg.exaggeration !== "number" || Number.isNaN(cfg.exaggeration)) {
		throw new Error("Terrain layer 'exaggeration' must be a number");
	}

	if (cfg.exaggeration < 0 || cfg.exaggeration > 100) {
		throw new Error("Terrain layer 'exaggeration' must be between 0 and 100");
	}
}

function validateTileSize(cfg: Partial<TerrainLayerConfig>): void {
	if (cfg.tileSize !== undefined && (typeof cfg.tileSize !== "number" || cfg.tileSize <= 0)) {
		throw new Error("Terrain layer 'tileSize' must be a positive number");
	}
}

function validateZoomLevels(cfg: Partial<TerrainLayerConfig>): void {
	if (cfg.minzoom !== undefined && cfg.maxzoom !== undefined && cfg.minzoom > cfg.maxzoom) {
		throw new Error("Terrain layer 'minzoom' must be less than or equal to 'maxzoom'");
	}
}

// =============================================================================
// URL Template Processing
// =============================================================================

/**
 * Processes tile URL template(s) to handle subdomains.
 */
function processTileUrls(tiles: string | string[], subdomains?: string[]): string[] {
	const urls = Array.isArray(tiles) ? tiles : [tiles];

	// If no subdomains or no {s} placeholder, return as-is
	if (!subdomains || subdomains.length === 0) {
		return urls;
	}

	// Check if any URL contains {s} placeholder
	const hasSubdomainPlaceholder = urls.some((url) => url.includes("{s}"));

	if (!hasSubdomainPlaceholder) {
		return urls;
	}

	// Expand URLs with subdomain substitutions
	const expanded: string[] = [];
	for (const url of urls) {
		if (url.includes("{s}")) {
			for (const subdomain of subdomains) {
				expanded.push(url.replace(/{s}/g, subdomain));
			}
		} else {
			expanded.push(url);
		}
	}

	return expanded;
}

// =============================================================================
// Source Creation
// =============================================================================

/**
 * Creates a MapLibre raster-dem source specification.
 */
function createRasterDemSourceSpec(config: TerrainLayerConfig): RasterDEMSourceSpecification {
	const { demTiles, tileSize = 256, minzoom = 0, maxzoom = 22, subdomains } = config;

	// Process tile URLs (handle subdomains)
	const tileUrls = processTileUrls(demTiles, subdomains);

	const spec: RasterDEMSourceSpecification = {
		type: "raster-dem",
		tiles: tileUrls,
		tileSize,
		minzoom,
		maxzoom,
	};

	return spec;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a terrain layer definition with DEM (Digital Elevation Model) support.
 *
 * Terrain layers provide 3D elevation data that can be visualized with terrain exaggeration.
 * They require a raster-dem source containing elevation tiles.
 *
 * If the DEM source fails to load, the terrain layer will gracefully degrade by emitting
 * an error event and not crashing the application.
 *
 * @param config - Terrain layer configuration
 * @returns LayerDefinition that can be registered with @mapwise/core
 *
 * @example
 * ```typescript
 * // Basic terrain layer with Mapbox DEM
 * const terrainLayer = createTerrainLayer({
 *   id: 'terrain',
 *   demTiles: 'mapbox://mapbox.mapbox-terrain-dem-v1',
 *   exaggeration: 1.5,
 * });
 *
 * // Terrain with custom DEM tiles and hillshade
 * const terrainLayer = createTerrainLayer({
 *   id: 'terrain',
 *   demTiles: 'https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw',
 *   exaggeration: 2.0,
 *   hillshade: true,
 *   hillshadeOptions: {
 *     exaggeration: 0.5,
 *     opacity: 0.6,
 *   },
 * });
 *
 * // Terrain with multiple tile URLs and subdomains
 * const terrainLayer = createTerrainLayer({
 *   id: 'terrain',
 *   demTiles: [
 *     'https://{s}.dem-tiles.example.com/{z}/{x}/{y}.png',
 *     'https://{s}.dem-tiles-alt.example.com/{z}/{x}/{y}.png',
 *   ],
 *   subdomains: ['a', 'b', 'c'],
 *   exaggeration: 1.0,
 * });
 * ```
 */
export function createTerrainLayer(config: TerrainLayerConfig): CustomLayerDefinition {
	// Validate config
	validateTerrainConfig(config);

	const { id, category, attribution, metadata } = config;
	const exaggeration = config.exaggeration ?? 1.0;

	// Create source ID
	const sourceId = `${id}-dem-source`;

	// Create source specification
	const sourceSpec = createRasterDemSourceSpec(config);

	// Determine if hillshade should be created
	const shouldCreateHillshade = config.hillshade === true;

	// Build metadata
	const layerMetadata: {
		title?: string;
		attribution?: string;
		[key: string]: unknown;
	} = {
		...(metadata || {}),
	};

	if (config.title) {
		layerMetadata.title = config.title;
	}
	if (attribution) {
		layerMetadata.attribution = attribution;
	}

	// Track hillshade layer ID if created
	let hillshadeLayerId: string | null = null;

	return {
		id,
		type: "terrain",
		category: category || "base",
		sourceIds: [sourceId],
		managedLayerIds: shouldCreateHillshade ? [`${id}-hillshade`] : [],
		metadata: layerMetadata,

		async apply(ctx: LayerHandlerContext): Promise<void> {
			const { map, generateId } = ctx;

			// Add DEM source with error handling
			try {
				ensureSource(map, sourceId, sourceSpec);
			} catch (error) {
				// Gracefully degrade - emit error but don't crash
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error(
					`[@mapwise/layers] Failed to add DEM source "${sourceId}": ${errorMessage}. Terrain will not be enabled.`,
				);
				// Note: We don't throw here - the layer is registered but terrain won't be enabled
				// The error is logged and can be handled by the error event system
				return;
			}

			// Wait for source to load before setting terrain
			return waitForTerrainSource({
				map,
				sourceId,
				exaggeration,
				shouldCreateHillshade,
				generateId,
				config,
				setHillshadeLayerId: (id) => {
					hillshadeLayerId = id;
				},
			});
		},

		remove(ctx: LayerHandlerContext): void {
			removeTerrainLayer(ctx.map, sourceId, hillshadeLayerId);
		},

		setVisibility(ctx: LayerHandlerContext, visible: boolean): void {
			setTerrainLayerVisibility(ctx.map, visible, sourceId, hillshadeLayerId, exaggeration);
		},
	};
}

// =============================================================================
// Helper Function
// =============================================================================

/**
 * Convenience helper to enable terrain on a map controller.
 *
 * This function wraps the creation and registration of a terrain layer,
 * making it easy to enable terrain with a single function call.
 *
 * @param map - MapController instance
 * @param config - Terrain configuration (id is optional, defaults to "terrain")
 * @returns Promise that resolves when terrain is enabled
 *
 * @example
 * ```typescript
 * const controller = createMap(container, options);
 * await controller.awaitReady();
 *
 * // Enable terrain with default ID
 * await enableTerrain(controller, {
 *   demTiles: 'mapbox://mapbox.mapbox-terrain-dem-v1',
 *   exaggeration: 1.5,
 *   hillshade: true,
 * });
 *
 * // Enable terrain with custom ID and options
 * await enableTerrain(controller, {
 *   id: 'custom-terrain',
 *   demTiles: 'https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw',
 *   exaggeration: 2.0,
 *   hillshade: true,
 *   hillshadeOptions: {
 *     exaggeration: 0.5,
 *     opacity: 0.6,
 *   },
 * });
 * ```
 */
export async function enableTerrain(
	map: MapController,
	config: EnableTerrainConfig,
): Promise<void> {
	// Ensure map is ready
	await map.awaitReady();

	// Use default ID if not provided
	const layerId = config.id ?? "terrain";

	// Create terrain layer
	const terrainLayer = createTerrainLayer({
		...config,
		id: layerId,
	});

	// Register layer
	map.layers.registerLayer(terrainLayer);
}

// =============================================================================
// Internal Helpers
// =============================================================================

function waitForTerrainSource(options: {
	map: MinimalMap;
	sourceId: string;
	exaggeration: number;
	shouldCreateHillshade: boolean;
	generateId: (prefix: string) => string;
	config: TerrainLayerConfig;
	setHillshadeLayerId: (id: string) => void;
}): Promise<void> {
	const {
		map,
		sourceId,
		exaggeration,
		shouldCreateHillshade,
		generateId,
		config,
		setHillshadeLayerId,
	} = options;

	return new Promise<void>((resolve) => {
		const checkAndInit = () => {
			checkSource({
				map,
				sourceId,
				exaggeration,
				shouldCreateHillshade,
				generateId,
				config,
				setHillshadeLayerId,
				resolve,
			});
		};

		checkAndInit();

		// biome-ignore lint/suspicious/noExplicitAny: MapLibre event type compatibility
		map.once("sourcedata", (e: any) => {
			if (e.sourceId === sourceId && e.isSourceLoaded) {
				checkAndInit();
			}
		});
	});
}

function checkSource(options: {
	map: MinimalMap;
	sourceId: string;
	exaggeration: number;
	shouldCreateHillshade: boolean;
	generateId: (prefix: string) => string;
	config: TerrainLayerConfig;
	setHillshadeLayerId: (id: string) => void;
	resolve: () => void;
}): void {
	const {
		map,
		sourceId,
		exaggeration,
		shouldCreateHillshade,
		generateId,
		config,
		setHillshadeLayerId,
		resolve,
	} = options;

	const source = map.getSource(sourceId);
	if (!source) {
		console.error(
			`[@mapwise/layers] DEM source "${sourceId}" not found after addition. Terrain will not be enabled.`,
		);
		resolve();
		return;
	}

	// Source exists, check if it's loaded
	if (source.type === "raster-dem") {
		// For raster-dem sources, we can set terrain immediately
		try {
			map.setTerrain({
				source: sourceId,
				exaggeration,
			});
		} catch (error) {
			console.error(
				`[@mapwise/layers] Failed to set terrain: ${error instanceof Error ? error.message : String(error)}. Terrain will not be enabled.`,
			);
			resolve();
			return;
		}

		// Create hillshade layer if requested
		if (shouldCreateHillshade) {
			createAndAddHillshade({
				map,
				sourceId,
				generateId,
				config,
				setHillshadeLayerId,
			});
		}

		resolve();
	} else {
		// Source is not a raster-dem
		console.error(
			`[@mapwise/layers] Source "${sourceId}" is not a raster-dem source. Terrain will not be enabled.`,
		);
		resolve();
	}
}

function createAndAddHillshade(options: {
	map: MinimalMap;
	sourceId: string;
	generateId: (prefix: string) => string;
	config: TerrainLayerConfig;
	setHillshadeLayerId: (id: string) => void;
}): void {
	const { map, sourceId, generateId, config, setHillshadeLayerId } = options;

	try {
		const hillshadeLayerId = generateId("hillshade");
		setHillshadeLayerId(hillshadeLayerId);

		const hillshadeLayer = createHillshadeLayer({
			id: hillshadeLayerId,
			demSourceId: sourceId,
			// biome-ignore lint/suspicious/noExplicitAny: Hillshade options compatibility
			options: config.hillshadeOptions as any,
		});

		// Add hillshade source
		if (hillshadeLayer.source) {
			try {
				ensureSource(
					// biome-ignore lint/suspicious/noExplicitAny: MapLibre types compatibility
					map as any,
					hillshadeLayer.source.id,
					hillshadeLayer.source.spec,
				);
			} catch (error) {
				console.warn(
					`[@mapwise/layers] Failed to add hillshade source: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// Add hillshade layers
		for (const layerSpec of hillshadeLayer.layers) {
			try {
				map.addLayer(layerSpec, config.hillshadeOptions?.beforeId);
			} catch (error) {
				console.warn(
					`[@mapwise/layers] Failed to add hillshade layer "${layerSpec.id}": ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	} catch (error) {
		console.warn(
			`[@mapwise/layers] Failed to create hillshade layer: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

function removeTerrainLayer(
	map: MinimalMap,
	sourceId: string,
	hillshadeLayerId: string | null,
): void {
	// Remove terrain
	try {
		const currentTerrain = map.getTerrain();
		if (currentTerrain && typeof currentTerrain === "object" && "source" in currentTerrain) {
			const terrainSource = currentTerrain.source as string;
			if (terrainSource === sourceId) {
				map.setTerrain(null);
			}
		}
	} catch (error) {
		console.warn(
			`[@mapwise/layers] Failed to remove terrain: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	// Remove hillshade layer
	if (hillshadeLayerId) {
		try {
			const hillshadeLayer = map.getLayer(hillshadeLayerId);
			if (hillshadeLayer) {
				map.removeLayer(hillshadeLayerId);
			}
		} catch (error) {
			console.warn(
				`[@mapwise/layers] Failed to remove hillshade layer: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// Remove DEM source
	// biome-ignore lint/suspicious/noExplicitAny: MapLibre types compatibility
	removeSourceSafe(map as any, sourceId);
}

function setTerrainLayerVisibility(
	map: MinimalMap,
	visible: boolean,
	sourceId: string,
	hillshadeLayerId: string | null,
	exaggeration: number,
): void {
	try {
		if (visible) {
			enableTerrainVisibility(map, sourceId, exaggeration);
		} else {
			disableTerrainVisibility(map, sourceId);
		}
	} catch (error) {
		console.warn(
			`[@mapwise/layers] Failed to set terrain visibility: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	// Toggle hillshade
	if (hillshadeLayerId) {
		setHillshadeVisibility(map, hillshadeLayerId, visible);
	}
}

function enableTerrainVisibility(map: MinimalMap, sourceId: string, exaggeration: number): void {
	const source = map.getSource(sourceId);
	if (source && source.type === "raster-dem") {
		map.setTerrain({
			source: sourceId,
			exaggeration,
		});
	}
}

function disableTerrainVisibility(map: MinimalMap, sourceId: string): void {
	const currentTerrain = map.getTerrain();
	if (currentTerrain && typeof currentTerrain === "object" && "source" in currentTerrain) {
		const terrainSource = currentTerrain.source as string;
		if (terrainSource === sourceId) {
			map.setTerrain(null);
		}
	}
}

function setHillshadeVisibility(map: MinimalMap, layerId: string, visible: boolean): void {
	try {
		map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
	} catch (error) {
		console.warn(
			`[@mapwise/layers] Failed to set hillshade visibility: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
