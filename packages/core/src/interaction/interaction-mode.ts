/**
 * Interaction mode store for managing active tools and exclusivity.
 *
 * @module shared/interaction-state
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Interaction mode entry.
 */
interface InteractionMode {
	/** Plugin or tool ID */
	id: string;
	/** Priority (higher = takes precedence when multiple enabled) */
	priority: number;
	/** Whether this mode is currently active */
	active: boolean;
	/** Whether this mode is exclusive (only one exclusive mode can be active) */
	exclusive: boolean;
	/** Handler to call when this mode should handle an interaction */
	handler?: () => boolean | undefined;
}

/**
 * Options for interaction mode store.
 */
export interface InteractionModeStoreOptions {
	/**
	 * Default priority for modes.
	 *
	 * @default 0
	 */
	defaultPriority?: number;

	/**
	 * Whether exclusive modes are enabled by default.
	 *
	 * @default true
	 */
	defaultExclusive?: boolean;
}

// =============================================================================
// Interaction Mode Store
// =============================================================================

/**
 * Create an interaction mode store that manages active tools
 * with exclusivity and priority rules.
 */
export function createInteractionModeStore(
	options: InteractionModeStoreOptions = {},
): InteractionModeStore {
	const { defaultPriority = 0, defaultExclusive = true } = options;
	const modes = new Map<string, InteractionMode>();

	/**
	 * Get the active exclusive mode with highest priority.
	 */
	function getActiveExclusiveMode(): InteractionMode | null {
		const exclusiveModes = Array.from(modes.values()).filter((m) => m.exclusive && m.active);
		if (exclusiveModes.length === 0) {
			return null;
		}

		// Sort by priority (highest first)
		exclusiveModes.sort((a, b) => b.priority - a.priority);
		return exclusiveModes[0] || null;
	}

	/**
	 * Get all active modes sorted by priority.
	 */
	function getActiveModes(): InteractionMode[] {
		return Array.from(modes.values())
			.filter((m) => m.active)
			.sort((a, b) => b.priority - a.priority);
	}

	return {
		/**
		 * Register an interaction mode.
		 *
		 * @param id - Unique mode identifier
		 * @param options - Mode options
		 * @returns Unregister function
		 */
		register(
			id: string,
			options: {
				priority?: number;
				exclusive?: boolean;
				handler?: () => boolean | undefined;
			} = {},
		): () => void {
			const { priority = defaultPriority, exclusive = defaultExclusive, handler } = options;

			// If exclusive and another exclusive mode is active, deactivate it
			if (exclusive) {
				const currentExclusive = getActiveExclusiveMode();
				if (currentExclusive && currentExclusive.id !== id && currentExclusive.active) {
					currentExclusive.active = false;
				}
			}

			const mode: InteractionMode = {
				id,
				priority,
				active: false,
				exclusive,
				...(handler !== undefined ? { handler } : {}),
			};

			modes.set(id, mode);

			// Return unregister function
			return () => {
				modes.delete(id);
			};
		},

		/**
		 * Set a mode as active.
		 *
		 * If the mode is exclusive, all other exclusive modes are deactivated.
		 */
		setActive(id: string, active: boolean): boolean {
			const mode = modes.get(id);
			if (!mode) {
				return false;
			}

			if (active && mode.exclusive) {
				// Deactivate other exclusive modes
				for (const otherMode of Array.from(modes.values())) {
					if (otherMode.id !== id && otherMode.exclusive && otherMode.active) {
						otherMode.active = false;
					}
				}
			}

			mode.active = active;
			return true;
		},

		/**
		 * Check if a mode is active.
		 */
		isActive(id: string): boolean {
			const mode = modes.get(id);
			return mode?.active ?? false;
		},

		/**
		 * Get the mode that should handle an interaction.
		 *
		 * Returns the active exclusive mode with highest priority,
		 * or null if no exclusive mode is active.
		 */
		getActiveMode(): string | null {
			const exclusiveMode = getActiveExclusiveMode();
			return exclusiveMode?.id || null;
		},

		/**
		 * Try to handle an interaction with the active mode.
		 *
		 * @returns true if handled, false otherwise
		 */
		handleInteraction(): boolean {
			const exclusiveMode = getActiveExclusiveMode();
			if (!exclusiveMode?.handler) {
				return false;
			}

			const result = exclusiveMode.handler();
			return result !== false;
		},

		/**
		 * Get all active modes (for non-exclusive modes that can run simultaneously).
		 */
		getAllActive(): string[] {
			return getActiveModes().map((m) => m.id);
		},

		/**
		 * Clear all modes.
		 */
		clear(): void {
			modes.clear();
		},
	};
}

/**
 * Interaction mode store interface.
 */
export interface InteractionModeStore {
	/**
	 * Register an interaction mode.
	 *
	 * @param id - Unique mode identifier
	 * @param options - Mode options
	 * @returns Unregister function
	 */
	register(
		id: string,
		options?: {
			priority?: number;
			exclusive?: boolean;
			handler?: () => boolean | undefined;
		},
	): () => void;

	/**
	 * Set a mode as active.
	 */
	setActive(id: string, active: boolean): boolean;

	/**
	 * Check if a mode is active.
	 */
	isActive(id: string): boolean;

	/**
	 * Get the mode that should handle an interaction.
	 */
	getActiveMode(): string | null;

	/**
	 * Try to handle an interaction with the active mode.
	 */
	handleInteraction(): boolean;

	/**
	 * Get all active modes.
	 */
	getAllActive(): string[];

	/**
	 * Clear all modes.
	 */
	clear(): void;
}
