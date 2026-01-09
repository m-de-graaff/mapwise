/**
 * Keyboard manager for handling hotkeys with input detection.
 *
 * @module shared/keyboard-manager
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Keyboard event handler function.
 */
export type KeyboardHandler = (event: KeyboardEvent) => undefined | boolean;

/**
 * Hotkey registration entry.
 */
interface HotkeyEntry {
	/** Plugin or component ID */
	id: string;
	/** Key combination string (e.g., "Ctrl+z", "Escape", "i") */
	key: string;
	/** Handler function */
	handler: KeyboardHandler;
	/** Priority (higher = handled first) */
	priority: number;
	/** Whether this hotkey is currently enabled */
	enabled: boolean;
}

/**
 * Options for keyboard manager.
 */
export interface KeyboardManagerOptions {
	/**
	 * Whether to automatically disable hotkeys when user is typing in inputs.
	 *
	 * @default true
	 */
	disableWhileTyping?: boolean;

	/**
	 * Selectors for elements that should disable hotkeys when focused.
	 *
	 * @default ['input', 'textarea', '[contenteditable="true"]']
	 */
	inputSelectors?: string[];
}

// =============================================================================
// Keyboard Manager
// =============================================================================

/**
 * Create a keyboard manager that handles hotkey registration
 * and automatically disables hotkeys while typing in inputs.
 */
export function createKeyboardManager(options: KeyboardManagerOptions = {}): KeyboardManager {
	const {
		disableWhileTyping = true,
		inputSelectors = ["input", "textarea", '[contenteditable="true"]'],
	} = options;

	const hotkeys: HotkeyEntry[] = [];
	let globalHandler: ((e: KeyboardEvent) => void) | null = null;
	let isEnabled = true;

	/**
	 * Check if an element is an input element.
	 */
	function isInputElement(element: HTMLElement | null): boolean {
		if (!element) {
			return false;
		}
		return inputSelectors.some((selector) => element.matches(selector));
	}

	/**
	 * Check if user is currently typing in an input.
	 */
	function isTyping(): boolean {
		if (!disableWhileTyping) {
			return false;
		}
		const activeElement = document.activeElement;
		return activeElement instanceof HTMLElement && isInputElement(activeElement);
	}

	/**
	 * Parse a key combination string into parts.
	 *
	 * @example
	 * parseKey("Ctrl+z") => { ctrl: true, shift: false, alt: false, key: "z" }
	 * parseKey("Escape") => { ctrl: false, shift: false, alt: false, key: "Escape" }
	 */
	function parseKey(keyString: string): {
		ctrl: boolean;
		shift: boolean;
		alt: boolean;
		meta: boolean;
		key: string;
	} {
		const parts = keyString.toLowerCase().split(/[\s+]+/);
		let ctrl = false;
		let shift = false;
		let alt = false;
		let meta = false;
		let key = "";

		for (const part of parts) {
			switch (part) {
				case "ctrl":
				case "control":
					ctrl = true;
					break;
				case "shift":
					shift = true;
					break;
				case "alt":
					alt = true;
					break;
				case "meta":
				case "cmd":
				case "command":
					meta = true;
					break;
				default:
					key = part;
			}
		}

		return { ctrl, shift, alt, meta, key };
	}

	/**
	 * Check if a keyboard event matches a key combination.
	 */
	function matchesKey(event: KeyboardEvent, keyCombo: ReturnType<typeof parseKey>): boolean {
		if (!matchesRequiredModifiers(event, keyCombo)) {
			return false;
		}

		if (!matchesNoExtraModifiers(event, keyCombo)) {
			return false;
		}

		return matchesKeyValue(event, keyCombo);
	}

	function matchesRequiredModifiers(
		event: KeyboardEvent,
		keyCombo: ReturnType<typeof parseKey>,
	): boolean {
		if (keyCombo.ctrl && !event.ctrlKey) {
			return false;
		}
		if (keyCombo.shift && !event.shiftKey) {
			return false;
		}
		if (keyCombo.alt && !event.altKey) {
			return false;
		}
		if (keyCombo.meta && !event.metaKey) {
			return false;
		}
		return true;
	}

	function matchesNoExtraModifiers(
		event: KeyboardEvent,
		keyCombo: ReturnType<typeof parseKey>,
	): boolean {
		if (!keyCombo.ctrl && event.ctrlKey) {
			return false;
		}
		if (!keyCombo.shift && event.shiftKey) {
			return false;
		}
		if (!keyCombo.alt && event.altKey) {
			return false;
		}
		if (!keyCombo.meta && event.metaKey) {
			return false;
		}
		return true;
	}

	function matchesKeyValue(event: KeyboardEvent, keyCombo: ReturnType<typeof parseKey>): boolean {
		if (!keyCombo.key) {
			return false;
		}

		const eventKey = event.key.toLowerCase();
		const eventCode = event.code.toLowerCase();
		return eventKey === keyCombo.key || eventCode === keyCombo.key;
	}

	/**
	 * Handle global keyboard event.
	 */
	function handleKeyboardEvent(event: KeyboardEvent): void {
		if (!isEnabled || isTyping()) {
			return;
		}

		// Sort by priority (highest first) and find matching handlers
		const sortedHotkeys = [...hotkeys]
			.filter((h) => h.enabled)
			.sort((a, b) => b.priority - a.priority);

		for (const hotkey of sortedHotkeys) {
			const parsedKey = parseKey(hotkey.key);
			if (matchesKey(event, parsedKey)) {
				const result = hotkey.handler(event);
				// If handler returns false, continue to next handler
				// Otherwise, stop propagation
				if (result !== false) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}
			}
		}
	}

	/**
	 * Register global keyboard listener if not already registered.
	 */
	function ensureGlobalListener(): void {
		if (!globalHandler) {
			globalHandler = handleKeyboardEvent;
			window.addEventListener("keydown", globalHandler, true); // Capture phase
		}
	}

	return {
		/**
		 * Register a hotkey.
		 *
		 * @param id - Unique identifier for this hotkey registration
		 * @param key - Key combination (e.g., "Ctrl+z", "Escape", "i")
		 * @param handler - Handler function
		 * @param priority - Priority (higher = handled first), defaults to 0
		 * @returns Unregister function
		 */
		register(id: string, key: string, handler: KeyboardHandler, priority = 0): () => void {
			ensureGlobalListener();

			const entry: HotkeyEntry = {
				id,
				key,
				handler,
				priority,
				enabled: true,
			};

			hotkeys.push(entry);

			// Return unregister function
			return () => {
				const index = hotkeys.indexOf(entry);
				if (index >= 0) {
					hotkeys.splice(index, 1);
				}
			};
		},

		/**
		 * Enable or disable a specific hotkey by ID.
		 */
		setEnabled(id: string, enabled: boolean): void {
			for (const hotkey of hotkeys) {
				if (hotkey.id === id) {
					hotkey.enabled = enabled;
				}
			}
		},

		/**
		 * Enable or disable all hotkeys.
		 */
		setEnabledAll(enabled: boolean): void {
			isEnabled = enabled;
		},

		/**
		 * Check if keyboard manager is enabled.
		 */
		isEnabled(): boolean {
			return isEnabled && !isTyping();
		},

		/**
		 * Unregister all hotkeys and clean up.
		 */
		destroy(): void {
			hotkeys.length = 0;
			if (globalHandler) {
				window.removeEventListener("keydown", globalHandler, true);
				globalHandler = null;
			}
		},
	};
}

/**
 * Keyboard manager interface.
 */
export interface KeyboardManager {
	/**
	 * Register a hotkey.
	 *
	 * @param id - Unique identifier
	 * @param key - Key combination string
	 * @param handler - Handler function
	 * @param priority - Priority (higher = handled first)
	 * @returns Unregister function
	 */
	register(id: string, key: string, handler: KeyboardHandler, priority?: number): () => void;

	/**
	 * Enable or disable a specific hotkey by ID.
	 */
	setEnabled(id: string, enabled: boolean): void;

	/**
	 * Enable or disable all hotkeys.
	 */
	setEnabledAll(enabled: boolean): void;

	/**
	 * Check if keyboard manager is enabled.
	 */
	isEnabled(): boolean;

	/**
	 * Unregister all hotkeys and clean up.
	 */
	destroy(): void;
}
