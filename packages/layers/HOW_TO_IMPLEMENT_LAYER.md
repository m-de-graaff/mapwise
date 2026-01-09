# How to Implement a New Layer Kind

This guide walks you through implementing a new layer type for `@mapwise/layers`.

## Overview

Each layer kind consists of:
1. **Types** (`types.ts`) - TypeScript types for configuration
2. **Factory** (`<layer>-layer.ts`) - Factory function that creates `LayerDefinition`
3. **Validation** (in factory) - Config validation
4. **Persistence** (`persistence.ts`) - Serialization/deserialization
5. **Tests** (`*.test.ts`) - Unit and integration tests
6. **Exports** (in `index.ts`) - Public API

## Step-by-Step Guide

### 1. Create Directory Structure

```
packages/layers/src/
  <layer-kind>/
    <layer-kind>-layer.ts    # Main factory function
    types.ts                  # Configuration types
    persistence.ts            # Serialization/deserialization
    <layer-kind>-layer.test.ts  # Tests
    <helpers>.ts              # Optional helper functions
```

### 2. Define Types (`types.ts`)

```typescript
import type { BaseLayerConfig } from "../shared/types";

/**
 * Configuration for a MyLayer layer.
 */
export interface MyLayerConfig extends BaseLayerConfig {
  /** Required field */
  requiredField: string;
  
  /** Optional field with default */
  optionalField?: number;
  
  // ... layer-specific fields
}
```

**Key points:**
- Extend `BaseLayerConfig` (includes `id`, `title`, `opacity`, `visible`, etc.)
- Add JSDoc comments for all fields
- Include examples in JSDoc
- Export all types

### 3. Create Factory Function (`<layer-kind>-layer.ts`)

```typescript
import type { MapLibreLayerDefinition } from "@mapwise/core";
import type { RasterSourceSpecification } from "maplibre-gl";
import { validateBaseLayerConfig } from "../shared/validation";
import type { MyLayerConfig } from "./types";
import { toPersistedConfig } from "./persistence";

/**
 * Validates MyLayer configuration.
 */
export function validateMyLayerConfig(config: unknown): void {
  const baseResult = validateBaseLayerConfig(config);
  if (!baseResult.valid) {
    throw new Error(`Invalid MyLayer config: ${baseResult.errors[0]?.message}`);
  }
  
  const cfg = config as Partial<MyLayerConfig>;
  
  // Validate required fields
  if (!cfg.requiredField || typeof cfg.requiredField !== "string") {
    throw new Error("MyLayer requires 'requiredField' property (string)");
  }
  
  // Validate optional fields if provided
  if (cfg.optionalField !== undefined && typeof cfg.optionalField !== "number") {
    throw new Error("MyLayer 'optionalField' must be a number");
  }
}

/**
 * Creates a MyLayer layer definition.
 *
 * @param config - MyLayer configuration
 * @returns LayerDefinition that can be registered with @mapwise/core
 *
 * @example
 * ```typescript
 * const layer = createMyLayer({
 *   id: 'my-layer',
 *   requiredField: 'value',
 * });
 * ```
 */
export function createMyLayer(config: MyLayerConfig): MapLibreLayerDefinition {
  // 1. Validate config
  validateMyLayerConfig(config);
  
  const { id, category, attribution, metadata } = config;
  
  // 2. Create source ID (pattern: `${id}-source`)
  const sourceId = `${id}-source`;
  
  // 3. Create source specification
  const sourceSpec: RasterSourceSpecification = {
    type: "raster",
    tiles: [/* ... */],
    // ... other source fields
  };
  
  // 4. Create layer specification
  const layerSpec = {
    id: `${id}-layer`,
    type: "raster",
    source: sourceId,
    paint: {
      "raster-opacity": config.opacity ?? 1,
    },
  };
  
  // 5. Build metadata
  const layerMetadata = {
    ...(metadata || {}),
    ...(config.title ? { title: config.title } : {}),
    ...(attribution ? { attribution } : {}),
  };
  
  // 6. Return layer definition with getPersistedConfig
  const layerDef: MapLibreLayerDefinition & {
    getPersistedConfig?: () => unknown;
  } = {
    id,
    type: "my-layer-kind", // Unique layer type string
    category: category || "overlay",
    source: {
      id: sourceId,
      spec: sourceSpec,
    },
    layers: [layerSpec],
    metadata: layerMetadata,
    getPersistedConfig: () => toPersistedConfig(config),
  };
  
  return layerDef;
}
```

### 4. Implement Persistence (`persistence.ts`)

```typescript
import type { MyLayerConfig } from "./types";
import {
  type LayerValidationError,
  type PersistedConfigValidationResult,
  type PersistedLayerConfigBase,
  LAYER_CONFIG_SCHEMA_VERSION,
  createValidationError,
  validateRequiredString,
  validateSchemaVersion,
  migrateLayerConfig,
} from "../shared/persistence";

/**
 * Persisted configuration for a MyLayer.
 */
export interface PersistedMyLayerConfig extends PersistedLayerConfigBase {
  _type: "my-layer-kind";
  _version: number;
  id: string;
  requiredField: string;
  optionalField?: number;
  // ... other fields from MyLayerConfig
}

/**
 * Serialize a MyLayer config to a persisted format.
 */
export function toPersistedConfig(config: MyLayerConfig): PersistedMyLayerConfig {
  const persisted: PersistedMyLayerConfig = {
    _version: LAYER_CONFIG_SCHEMA_VERSION,
    _type: "my-layer-kind",
    id: config.id,
    requiredField: config.requiredField,
  };
  
  // Add optional fields only if defined
  if (config.optionalField !== undefined) {
    persisted.optionalField = config.optionalField;
  }
  
  // ... serialize other fields
  
  return persisted;
}

/**
 * Deserialize a persisted MyLayer config back to a MyLayerConfig.
 */
export function fromPersistedConfig(
  persisted: unknown,
): { config: MyLayerConfig; warnings: LayerValidationError[] } {
  const errors: LayerValidationError[] = [];
  const warnings: LayerValidationError[] = [];
  
  // Validate schema version
  if (!validateSchemaVersion(persisted, errors, warnings)) {
    throw new Error(
      `Invalid persisted MyLayer config: ${errors.map((e) => e.message).join(", ")}`,
    );
  }
  
  const config = persisted as Record<string, unknown>;
  
  // Validate layer type
  if (config["_type"] !== "my-layer-kind") {
    errors.push(
      createValidationError(
        "_type",
        `Expected type "my-layer-kind", got "${config["_type"]}"`,
        "INVALID_TYPE",
        config["_type"],
      ),
    );
  }
  
  // Migrate if needed
  const migrations = new Map();
  const { config: migratedConfig, info: migrationInfo } = migrateLayerConfig(
    config as PersistedLayerConfigBase,
    migrations,
  );
  
  warnings.push(...migrationInfo.warnings.map((w) => 
    createValidationError("", w, "MIGRATION_WARNING")
  ));
  
  const migrated = migratedConfig as Record<string, unknown>;
  
  // Validate required fields
  if (!validateRequiredString(migrated["id"], "id", "Layer ID", errors)) {
    throw new Error(`Invalid persisted MyLayer config: ${errors.map((e) => e.message).join(", ")}`);
  }
  
  if (!validateRequiredString(migrated["requiredField"], "requiredField", "Required Field", errors)) {
    throw new Error(`Invalid persisted MyLayer config: ${errors.map((e) => e.message).join(", ")}`);
  }
  
  // Build config object
  const myLayerConfig: MyLayerConfig = {
    id: migrated["id"] as string,
    requiredField: migrated["requiredField"] as string,
  };
  
  // Add optional fields
  if (migrated["optionalField"] !== undefined) {
    myLayerConfig.optionalField = migrated["optionalField"] as number;
  }
  
  return { config: myLayerConfig, warnings };
}

/**
 * Validate a persisted MyLayer config.
 */
export function validatePersistedConfig(
  persisted: unknown,
): PersistedConfigValidationResult {
  const errors: LayerValidationError[] = [];
  const warnings: LayerValidationError[] = [];
  
  try {
    fromPersistedConfig(persisted);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid persisted MyLayer config:")) {
      return { valid: false, errors, warnings };
    }
    throw error;
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
```

### 5. Write Tests (`<layer-kind>-layer.test.ts`)

```typescript
import { describe, expect, it } from "vitest";
import { createMyLayer, validateMyLayerConfig } from "./my-layer";
import type { MyLayerConfig } from "./types";

describe("MyLayer", () => {
  describe("validateMyLayerConfig", () => {
    it("should accept valid config", () => {
      const config: MyLayerConfig = {
        id: "test-layer",
        requiredField: "value",
      };
      expect(() => validateMyLayerConfig(config)).not.toThrow();
    });
    
    it("should reject config without requiredField", () => {
      const config = {
        id: "test-layer",
      } as Partial<MyLayerConfig>;
      expect(() => validateMyLayerConfig(config)).toThrow("requires 'requiredField'");
    });
  });
  
  describe("createMyLayer", () => {
    it("should create a valid layer definition", () => {
      const config: MyLayerConfig = {
        id: "my-layer",
        requiredField: "value",
      };
      
      const layer = createMyLayer(config);
      
      expect(layer.id).toBe("my-layer");
      expect(layer.type).toBe("my-layer-kind");
      expect(layer.source).toBeDefined();
      expect(layer.layers.length).toBe(1);
    });
    
    it("should support getPersistedConfig", () => {
      const config: MyLayerConfig = {
        id: "my-layer",
        requiredField: "value",
      };
      
      const layer = createMyLayer(config);
      const layerWithPersistence = layer as typeof layer & {
        getPersistedConfig?: () => unknown;
      };
      
      expect(layerWithPersistence.getPersistedConfig).toBeDefined();
      const persisted = layerWithPersistence.getPersistedConfig?.();
      expect((persisted as { _type: string })._type).toBe("my-layer-kind");
    });
  });
});
```

Also create `persistence.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { toPersistedConfig, fromPersistedConfig, validatePersistedConfig } from "./persistence";
import type { MyLayerConfig } from "./types";

describe("MyLayer Persistence", () => {
  describe("toPersistedConfig", () => {
    it("should serialize config", () => {
      const config: MyLayerConfig = {
        id: "test",
        requiredField: "value",
      };
      const persisted = toPersistedConfig(config);
      expect(persisted._version).toBe(1);
      expect(persisted._type).toBe("my-layer-kind");
    });
  });
  
  describe("fromPersistedConfig", () => {
    it("should deserialize config", () => {
      const persisted = {
        _version: 1,
        _type: "my-layer-kind",
        id: "test",
        requiredField: "value",
      };
      const { config } = fromPersistedConfig(persisted);
      expect(config.id).toBe("test");
      expect(config.requiredField).toBe("value");
    });
  });
});
```

### 6. Export from `index.ts`

```typescript
// Factory
export { createMyLayer } from "./<layer-kind>/<layer-kind>-layer";

// Types
export type { MyLayerConfig } from "./<layer-kind>/types";
export type { PersistedMyLayerConfig } from "./<layer-kind>/persistence";

// Persistence utilities
export {
  toPersistedConfig as toMyLayerPersistedConfig,
  fromPersistedConfig as fromMyLayerPersistedConfig,
  validatePersistedConfig as validateMyLayerPersistedConfig,
} from "./<layer-kind>/persistence";
```

### 7. Update Central Deserializer

In `packages/layers/src/persistence.ts`:

```typescript
import { fromPersistedConfig as fromMyLayerPersistedConfig } from "./<layer-kind>/persistence";
import { createMyLayer } from "./<layer-kind>/<layer-kind>-layer";

export function deserializeLayer(
  persisted: PersistedLayerConfigBase,
): LayerDefinition {
  const type = persisted["_type"];
  
  switch (type) {
    // ... existing cases
    case "my-layer-kind": {
      const { config } = fromMyLayerPersistedConfig(persisted);
      return createMyLayer(config);
    }
    default:
      throw new Error(`Unknown layer type: ${type}`);
  }
}
```

## Definition of Done Checklist

For every layer kind, verify:

- ✅ `createXLayer(config)` returns a valid `LayerDefinition`
- ✅ Layer has unique `type` string
- ✅ Source ID follows pattern: `${id}-source`
- ✅ Layer spec ID follows pattern: `${id}-layer`
- ✅ Supports `opacity` via paint properties
- ✅ Supports `visible` (handled by core registry)
- ✅ Config validation throws structured errors
- ✅ `getPersistedConfig()` returns valid persisted config
- ✅ `fromPersistedConfig()` recreates layer correctly
- ✅ Persisted config validation works
- ✅ Unit tests cover validation, factory, persistence
- ✅ Integration tests verify lifecycle
- ✅ Works after basemap/style reload (core handles this)
- ✅ `remove()` cleans up (MapLibre handles this for MapLibreLayerDefinition)
- ✅ All types exported
- ✅ JSDoc comments on all public APIs
- ✅ No linting errors
- ✅ TypeScript compiles without errors

## Performance Considerations

- ✅ Source/layer IDs are stable (no re-adding on updates)
- ✅ Use `getPersistedConfig()` for serialization (not extracting from runtime state)
- ✅ Validation is fast (fail early)
- ✅ No unnecessary object cloning
- ✅ Tile URL functions are efficient (MapLibre calls these frequently)

## Example: WMS Layer

See `packages/layers/src/wms/` for a complete reference implementation:
- `wms-layer.ts` - Factory function
- `types.ts` - Configuration types
- `persistence.ts` - Serialization/deserialization
- `wms-layer.test.ts` - Factory tests
- `persistence.test.ts` - Persistence tests
- `url-builder.ts` - URL building utilities
- `url-builder.test.ts` - URL builder tests

## Migration Support

To add migration support for schema changes:

```typescript
// In persistence.ts
const migrations = new Map<number, LayerConfigMigration>();

// Add migration from v1 to v2
migrations.set(1, (config) => {
  const old = config as PersistedMyLayerConfigV1;
  return {
    ...old,
    newField: "default-value", // Add new required field
  };
});

// Use in fromPersistedConfig
const { config: migratedConfig } = migrateLayerConfig(config, migrations);
```

## Common Patterns

### Raster Tile Layers

Most raster layers follow this pattern:
- Source type: `"raster"`
- Layer type: `"raster"`
- Paint property: `"raster-opacity"` for opacity

### Vector Layers

Vector layers use:
- Source type: `"vector"` or `"geojson"`
- Layer types: `"fill"`, `"line"`, `"circle"`, `"symbol"`
- Paint properties vary by layer type

### Custom Handlers

For complex layers that need custom logic, use `CustomLayerDefinition`:

```typescript
export function createCustomLayer(config: CustomConfig): CustomLayerDefinition {
  return {
    id: config.id,
    type: "custom-layer",
    apply: async (ctx) => {
      // Custom apply logic
    },
    remove: (ctx) => {
      // Custom remove logic
    },
    setVisibility: (ctx, visible) => {
      // Custom visibility handling
    },
    setOpacity: (ctx, opacity) => {
      // Custom opacity handling
    },
    getPersistedConfig: () => toPersistedConfig(config),
  };
}
```

## Testing Checklist

- [ ] Validation tests (valid/invalid configs)
- [ ] Factory tests (creates valid LayerDefinition)
- [ ] Persistence tests (serialize/deserialize round-trip)
- [ ] URL builder tests (if applicable)
- [ ] Parser tests (if applicable)
- [ ] Integration tests (with mock map)
- [ ] Edge cases (empty arrays, null values, etc.)

## Need Help?

- See existing implementations: `wms/`, `xyz/`, `arcgis/`
- Check `LAYERS_ARCHITECTURE.md` for architecture details
- Review `@mapwise/core` registry types for `LayerDefinition` contract

