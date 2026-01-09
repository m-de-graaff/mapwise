/**
 * Cursor management with stack-based cursor setting.
 *
 * @module shared/cursor
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Cursor stack entry.
 */
interface CursorEntry {
	/** Plugin or component ID */
	id: string;
	/** CSS cursor value */
	cursor: string;
	/** Priority (higher = takes precedence) */
	priority: number;
}

// =============================================================================
// Cursor Manager
// =============================================================================

/**
 * Create a cursor manager that uses a stack-based approach
 * so plugins don't fight over cursor settings.
 */
export function createCursorManager(element: HTMLElement): CursorManager {
	const cursorStack: CursorEntry[] = [];

	/**
	 * Update the cursor based on the highest priority entry.
	 */
	function updateCursor(): void {
		if (cursorStack.length === 0) {
			element.style.cursor = "";
			return;
		}

		// Sort by priority (highest first)
		const sorted = [...cursorStack].sort((a, b) => b.priority - a.priority);
		const topCursor = sorted[0];
		element.style.cursor = topCursor?.cursor || "";
	}

	return {
		/**
		 * Set cursor for a given ID.
		 *
		 * @param id - Unique identifier
		 * @param cursor - CSS cursor value
		 * @param priority - Priority (higher = takes precedence), defaults to 0
		 * @returns Unset function
		 */
		set(id: string, cursor: string, priority = 0): () => void {
			// Remove existing entry for this ID
			const existingIndex = cursorStack.findIndex((entry) => entry.id === id);
			if (existingIndex >= 0) {
				cursorStack.splice(existingIndex, 1);
			}

			// Add new entry
			cursorStack.push({ id, cursor, priority });
			updateCursor();

			// Return unset function
			return () => {
				const index = cursorStack.findIndex((entry) => entry.id === id);
				if (index >= 0) {
					cursorStack.splice(index, 1);
					updateCursor();
				}
			};
		},

		/**
		 * Clear cursor for a specific ID.
		 */
		clear(id: string): void {
			const index = cursorStack.findIndex((entry) => entry.id === id);
			if (index >= 0) {
				cursorStack.splice(index, 1);
				updateCursor();
			}
		},

		/**
		 * Clear all cursors.
		 */
		clearAll(): void {
			cursorStack.length = 0;
			updateCursor();
		},

		/**
		 * Get current cursor value.
		 */
		getCurrent(): string {
			if (cursorStack.length === 0) {
				return "";
			}
			const sorted = [...cursorStack].sort((a, b) => b.priority - a.priority);
			return sorted[0]?.cursor || "";
		},
	};
}

/**
 * Cursor manager interface.
 */
export interface CursorManager {
	/**
	 * Set cursor for a given ID.
	 *
	 * @param id - Unique identifier
	 * @param cursor - CSS cursor value
	 * @param priority - Priority (higher = takes precedence)
	 * @returns Unset function
	 */
	set(id: string, cursor: string, priority?: number): () => void;

	/**
	 * Clear cursor for a specific ID.
	 */
	clear(id: string): void;

	/**
	 * Clear all cursors.
	 */
	clearAll(): void;

	/**
	 * Get current cursor value.
	 */
	getCurrent(): string;
}
