# Definition of Done - Layer Implementation Checklist

This checklist must be verified for every layer kind before it's considered complete.

## Core Requirements

### ✅ Factory Function

- [ ] `createXLayer(config)` exists and is exported
- [ ] Returns a valid `LayerDefinition` (either `MapLibreLayerDefinition` or `CustomLayerDefinition`)
- [ ] Factory function has comprehensive JSDoc with examples
- [ ] Config parameter extends `BaseLayerConfig`
- [ ] Layer has unique `type` string (e.g., `"wms-raster"`, `"xyz-raster"`)

### ✅ Configuration Validation

- [ ] `validateXLayerConfig(config)` function exists
- [ ] Validates all required fields
- [ ] Validates field types (strings, numbers, arrays, objects)
- [ ] Validates URLs are safe (no `javascript:`, `data:`, etc.)
- [ ] Validates numeric ranges (zoom levels, opacity, etc.)
- [ ] Throws structured errors with clear messages
- [ ] Uses shared validation utilities from `shared/validation`

### ✅ Layer Structure

- [ ] Source ID follows pattern: `${id}-source`
- [ ] Layer spec ID follows pattern: `${id}-layer` (or `${id}-<sublayer>` for multiple)
- [ ] Source specification is correctly typed (`SourceSpecification` from maplibre-gl)
- [ ] Layer specifications array is correctly typed (`LayerSpecification[]`)
- [ ] Source and layers are properly linked

### ✅ Visibility & Opacity Support

- [ ] Layer supports `opacity` config option (0-1)
- [ ] Opacity is applied via paint properties (`"raster-opacity"`, `"fill-opacity"`, etc.)
- [ ] Default opacity is 1 if not specified
- [ ] Visibility is handled by core registry (no custom handling needed for standard layers)
- [ ] Layer can be toggled visible/hidden via registry

### ✅ Metadata

- [ ] `title` is included in metadata if provided
- [ ] `attribution` is included in metadata if provided
- [ ] `minzoom`/`maxzoom` from config are in metadata
- [ ] Custom metadata is preserved
- [ ] Metadata is serializable (no functions, classes, etc.)

## Persistence & Serialization

### ✅ Persistence Implementation

- [ ] `persistence.ts` file exists with:
  - `PersistedXLayerConfig` type extending `PersistedLayerConfigBase`
  - `toPersistedConfig(config)` function
  - `fromPersistedConfig(persisted)` function
  - `validatePersistedConfig(persisted)` function
- [ ] Persisted config includes `_version` and `_type` fields
- [ ] All config fields are serializable
- [ ] Optional fields are omitted if undefined

### ✅ Serialization Integration

- [ ] Factory function includes `getPersistedConfig()` method
- [ ] `getPersistedConfig()` returns valid persisted config
- [ ] Persisted config matches schema version `LAYER_CONFIG_SCHEMA_VERSION`
- [ ] Layer is registered in `deserializeLayer()` function

### ✅ Deserialization

- [ ] `fromPersistedConfig()` validates schema version
- [ ] `fromPersistedConfig()` validates layer type
- [ ] `fromPersistedConfig()` validates required fields
- [ ] `fromPersistedConfig()` handles optional fields gracefully
- [ ] `fromPersistedConfig()` supports migration (if schema changes)
- [ ] Round-trip works: `toPersistedConfig()` → `fromPersistedConfig()` → same config

### ✅ Validation

- [ ] `validatePersistedConfig()` returns structured errors
- [ ] Validation errors include `path`, `message`, `code`, `value`
- [ ] Invalid configs are rejected with clear messages
- [ ] Warnings are provided for non-fatal issues (e.g., newer schema version)

## Testing

### ✅ Unit Tests - Factory

- [ ] Tests for valid configs (minimal and full)
- [ ] Tests for invalid configs (missing required fields)
- [ ] Tests for invalid field types
- [ ] Tests for invalid values (negative numbers, out of range, etc.)
- [ ] Tests verify layer structure (source ID, layer IDs, types)
- [ ] Tests verify metadata is correctly set
- [ ] Tests verify opacity is applied
- [ ] Tests verify `getPersistedConfig()` works

### ✅ Unit Tests - Persistence

- [ ] Tests for `toPersistedConfig()` with various configs
- [ ] Tests for `fromPersistedConfig()` with valid persisted configs
- [ ] Tests for `fromPersistedConfig()` with invalid persisted configs
- [ ] Tests for round-trip serialization
- [ ] Tests for `validatePersistedConfig()`
- [ ] Tests for migration (if applicable)

### ✅ Unit Tests - Utilities

- [ ] URL builders are tested (if applicable)
- [ ] Parsers are tested (if applicable)
- [ ] Validation helpers are tested

### ✅ Integration Tests

- [ ] Layer can be created and registered
- [ ] Layer can be serialized and deserialized
- [ ] Layer works after basemap/style reload (handled by core, but verify)
- [ ] Visibility changes work
- [ ] Opacity changes work
- [ ] Layer removal cleans up properly

## Performance

### ✅ Performance Optimizations

- [ ] Source/layer IDs are stable (no re-creation on updates)
- [ ] Core registry checks `map.getSource(id)` before adding (no duplicate sources)
- [ ] Core registry checks `map.getLayer(id)` before adding (no duplicate layers)
- [ ] Tile URL functions are efficient (MapLibre calls these frequently)
- [ ] No unnecessary object cloning
- [ ] Validation is fast (fail early, don't do expensive checks for valid configs)

### ✅ Update Path Efficiency

- [ ] Visibility updates only change layout property (not full layer removal)
- [ ] Opacity updates only change paint property (not full layer removal)
- [ ] No sources/layers re-added on simple property changes

## Documentation

### ✅ Code Documentation

- [ ] All public functions have JSDoc comments
- [ ] All types have JSDoc comments
- [ ] JSDoc includes `@example` blocks for complex APIs
- [ ] Parameter descriptions are clear
- [ ] Return types are documented
- [ ] Auth patterns are documented (if applicable)

### ✅ Type Exports

- [ ] All config types are exported from `index.ts`
- [ ] All persisted config types are exported
- [ ] All utility types are exported (if public)

### ✅ README Updates

- [ ] Layer type is listed in features
- [ ] Layer type has usage example in README
- [ ] Factory function is listed in API reference
- [ ] Any special requirements are documented

## Code Quality

### ✅ Linting

- [ ] No Biome linting errors
- [ ] No Biome linting warnings (or intentionally suppressed with comments)
- [ ] Code follows project style guide

### ✅ TypeScript

- [ ] No TypeScript errors
- [ ] No TypeScript warnings
- [ ] All types are properly defined
- [ ] No `any` types (except where necessary with proper justification)

### ✅ File Structure

- [ ] Files follow naming conventions (`kebab-case.ts`)
- [ ] Files are in correct directories
- [ ] No circular dependencies
- [ ] Imports are organized (external, internal, relative)

## Layer-Specific Requirements

### Raster Layers (WMS, WMTS, XYZ, ArcGIS)

- [ ] Uses `RasterSourceSpecification` type
- [ ] Uses `"raster"` layer type
- [ ] Uses `"raster-opacity"` paint property
- [ ] Tile URL functions handle coordinates correctly
- [ ] Supports `tileUrlTransform` for authentication
- [ ] Supports `minzoom`/`maxzoom` in source spec

### Vector Layers (GeoJSON, Vector Tiles)

- [ ] Uses appropriate source type (`"geojson"` or `"vector"`)
- [ ] Uses appropriate layer types (`"fill"`, `"line"`, `"circle"`, `"symbol"`)
- [ ] Handles clustering if supported
- [ ] Style properties are correctly applied

### 3D Layers (Terrain, Buildings3D)

- [ ] Properly integrates with MapLibre 3D features
- [ ] Handles terrain exaggeration (if applicable)
- [ ] Manages 3D source dependencies

## Verification Checklist

Before marking a layer as complete, run:

```bash
# Linting
pnpm lint

# Type checking
pnpm typecheck

# Tests
pnpm test

# Coverage (should be >80% for new code)
pnpm test:coverage
```

## Status by Layer Type

### ✅ Complete

- **WMS Raster** - ✅ All checks pass
- **XYZ Raster** - ✅ All checks pass
- **ArcGIS REST Raster** - ✅ All checks pass

### 🔄 In Progress

- **WMTS Raster** - Needs persistence implementation
- **GeoJSON** - Needs persistence implementation
- **Vector Tile** - Needs persistence implementation
- **Terrain** - Needs persistence implementation
- **Buildings3D** - Needs persistence implementation
- **PMTiles** - Needs persistence implementation

## Notes

- Layers must work with `@mapwise/core` registry
- Core handles reapply on style reload automatically
- Core handles remove cleanup automatically
- Focus on config validation, persistence, and factory correctness

