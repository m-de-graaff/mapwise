/**
 * Shared types for layer configurations.
 *
 * @module shared/types
 */

import type { LayerCategory, LayerMetadata } from "@mapwise/core";

// =============================================================================
// Base Layer Configuration
// =============================================================================

/**
 * Base configuration shared by all layer types.
 */
export interface BaseLayerConfig {
	/** Unique layer identifier (stable across sessions) */
	id: string;
	/** Human-readable title */
	title?: string;
	/** Attribution/credits */
	attribution?: string;
	/** Minimum zoom level where layer is shown */
	minzoom?: number;
	/** Maximum zoom level where layer is shown */
	maxzoom?: number;
	/** Layer ID to insert before (for z-order control) */
	beforeId?: string;
	/** Initial opacity (0-1) */
	opacity?: number;
	/** Whether layer is initially visible */
	visible?: boolean;
	/** Layer category for z-order grouping */
	category?: LayerCategory;
	/** Additional metadata */
	metadata?: LayerMetadata;
}

// =============================================================================
// Layer Capabilities
// =============================================================================

/**
 * Metadata about layer capabilities (typically from WMS/WMTS GetCapabilities).
 */
export interface LayerCapabilities {
	/** Service title */
	title?: string;
	/** Service abstract/description */
	abstract?: string;
	/** Supported coordinate reference systems */
	crs?: string[];
	/** Supported formats (e.g., "image/png", "image/jpeg") */
	formats?: string[];
	/** Supported styles */
	styles?: Array<{
		name: string;
		title?: string;
	}>;
	/** Bounding box */
	bbox?: {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
		crs: string;
	};
	/** Custom capabilities data */
	custom?: Record<string, unknown>;
}

// =============================================================================
// Layer Validation
// =============================================================================

/**
 * Structure for layer validation errors.
 */
export interface LayerValidationError {
	/** Error code */
	code: string;
	/** Human-readable error message */
	message: string;
	/** Field or path that failed validation */
	field?: string;
	/** Additional context */
	context?: Record<string, unknown>;
}

/**
 * Result of layer configuration validation.
 */
export interface LayerValidationResult {
	/** Whether the configuration is valid */
	valid: boolean;
	/** Validation errors */
	errors: LayerValidationError[];
	/** Validation warnings */
	warnings: LayerValidationError[];
}
