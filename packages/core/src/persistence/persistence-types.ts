/**
 * State persistence type definitions.
 *
 * Defines the schema for serialized map state that can be
 * saved, restored, and versioned.
 *
 * @module persistence/persistence-types
 */

// =============================================================================
// Schema Version
// =============================================================================

/**
 * Current schema version.
 * Increment when making breaking changes to PersistedMapState.
 */
export const SCHEMA_VERSION = 1;

/**
 * Minimum supported schema version for hydration.
 * States with versions below this cannot be migrated.
 */
export const MIN_SCHEMA_VERSION = 1;

// =============================================================================
// Viewport State
// =============================================================================

export interface PersistedViewport {
	center: [number, number];
	zoom: number;
	bearing: number;
	pitch: number;
	bounds?: [number, number, number, number]; // [west, south, east, north]
}

// =============================================================================
// Layer State
// =============================================================================

/**
 * Minimal layer state for persistence.
 * Does not include runtime data like apply/remove handlers.
 */
export interface PersistedLayerState {
	/** Layer ID (stable identifier) */
	id: string;

	/** Layer type discriminator */
	type: "maplibre" | "custom";

	/** Whether layer is visible */
	visible: boolean;

	/** Layer opacity (0-1) */
	opacity: number;

	/** Position in layer order */
	order: number;

	/** Layer category */
	category: "base" | "overlay" | "annotation" | "system";

	/** Layer metadata (must be serializable) */
	metadata?: Record<string, unknown>;

	/**
	 * For MapLibre layers: the layer specifications.
	 * These are the raw MapLibre layer definitions.
	 */
	layerSpecs?: unknown[];

	/**
	 * For MapLibre layers: the source definition.
	 */
	source?: {
		id: string;
		spec: unknown;
	};

	/**
	 * Custom serialized state from layer's `serialize` handler.
	 * Used for custom layers that need to persist additional data.
	 */
	customState?: unknown;
}

// =============================================================================
// Plugin State
// =============================================================================

/**
 * Persisted plugin state.
 * Only includes plugins that opt-in to persistence.
 */
export interface PersistedPluginState {
	/** Plugin ID */
	id: string;

	/** Plugin version at time of serialization */
	version: string;

	/** Schema version of the state data */
	schemaVersion?: number;

	/**
	 * Custom state from the plugin's state store.
	 * Only keys marked as persistable are included.
	 */
	state: Record<string, unknown>;
}

// =============================================================================
// Complete Map State
// =============================================================================

/**
 * Complete persisted map state.
 * This is the root object for serialization/hydration.
 */
export interface PersistedMapState {
	/**
	 * Schema version for migration support.
	 */
	version: number;

	/**
	 * Timestamp when state was serialized.
	 */
	timestamp: number;

	/**
	 * Optional name/description for the saved state.
	 */
	name?: string;
	description?: string;

	/**
	 * Current basemap style URL or identifier.
	 */
	basemap: string;

	/**
	 * Current viewport state.
	 */
	viewport: PersistedViewport;

	/**
	 * Persisted layer states in order.
	 */
	layers: PersistedLayerState[];

	/**
	 * Persisted plugin states (opt-in only).
	 */
	plugins: PersistedPluginState[];

	/**
	 * Custom application-level state.
	 * Reserved for user-defined data.
	 */
	custom?: Record<string, unknown>;
}

// =============================================================================
// Serialization Options
// =============================================================================

export interface SerializeOptions {
	/**
	 * Include plugin state in serialization.
	 * @default true
	 */
	includePlugins?: boolean;

	/**
	 * Include viewport in serialization.
	 * @default true
	 */
	includeViewport?: boolean;

	/**
	 * Include layer visibility/opacity state.
	 * @default true
	 */
	includeLayerState?: boolean;

	/**
	 * Custom state to include in the serialization.
	 */
	custom?: Record<string, unknown>;

	/**
	 * Name for the saved state.
	 */
	name?: string;

	/**
	 * Description for the saved state.
	 */
	description?: string;

	/**
	 * Filter which layers to include.
	 * Return true to include, false to exclude.
	 */
	layerFilter?: (layerId: string) => boolean;

	/**
	 * Filter which plugins to include.
	 * Return true to include, false to exclude.
	 */
	pluginFilter?: (pluginId: string) => boolean;
}

// =============================================================================
// Hydration Options
// =============================================================================

export interface HydrateOptions {
	/**
	 * Whether to restore the viewport.
	 * @default true
	 */
	restoreViewport?: boolean;

	/**
	 * Whether to restore layer visibility/opacity.
	 * @default true
	 */
	restoreLayerState?: boolean;

	/**
	 * Whether to restore plugin state.
	 * @default true
	 */
	restorePlugins?: boolean;

	/**
	 * Whether to change the basemap to match persisted state.
	 * @default true
	 */
	restoreBasemap?: boolean;

	/**
	 * Merge strategy for layers not in persisted state.
	 * - 'keep': Keep existing layers not in state
	 * - 'remove': Remove layers not in state
	 * @default 'keep'
	 */
	layerMergeStrategy?: "keep" | "remove";

	/**
	 * Custom migration function for state transformation.
	 * Called after built-in migrations are applied.
	 */
	migrate?: (state: PersistedMapState) => PersistedMapState;

	/**
	 * Callback for migration warnings/info.
	 */
	onMigration?: (info: MigrationInfo) => void;
}

// =============================================================================
// Migration Types
// =============================================================================

export interface MigrationInfo {
	/** Original schema version */
	fromVersion: number;
	/** Target schema version */
	toVersion: number;
	/** Migration steps applied */
	steps: string[];
	/** Any warnings during migration */
	warnings: string[];
}

export interface HydrateResult {
	/** Whether hydration was successful */
	success: boolean;

	/** Error message if failed */
	error?: string;

	/** Migration info if state was migrated */
	migration?: MigrationInfo;

	/** Number of layers restored */
	layersRestored: number;

	/** Number of plugins restored */
	pluginsRestored: number;

	/** Layers that failed to restore */
	layerErrors: Array<{ id: string; error: string }>;

	/** Plugins that failed to restore */
	pluginErrors: Array<{ id: string; error: string }>;
}

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

// =============================================================================
// Layer Serialization Hook
// =============================================================================

/**
 * Interface for layers that support custom serialization.
 * Implement this in CustomLayerDefinition to persist custom state.
 */
export interface SerializableLayer {
	/**
	 * Serialize custom layer state.
	 * Return undefined to use default serialization.
	 */
	serialize?(): unknown;

	/**
	 * Restore custom layer state.
	 * Called during hydration with previously serialized state.
	 */
	deserialize?(state: unknown): void;
}

// =============================================================================
// Plugin Persistence Hook
// =============================================================================

/**
 * Keys in plugin state that should be persisted.
 * Plugins must explicitly mark keys as persistable.
 */
export interface PersistablePluginState {
	/**
	 * List of state keys to persist.
	 * Only these keys will be included in serialization.
	 */
	persistKeys?: string[];
}
