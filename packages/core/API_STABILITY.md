# @mapwise/core — API Stability Promise

> Predictable evolution. No surprises.

---

## Versioning Policy

This package follows [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH

1.0.0
│ │ └── Patch: Bug fixes, no API changes
│ └──── Minor: New features, backward compatible
└────── Major: Breaking changes
```

---

## Compatibility Promise

### Minor Versions (1.x.0)

**Guarantee: 100% backward compatible.**

You can upgrade minor versions without changing your code:

```bash
# Safe upgrades
@mapwise/core@1.0.0 → @mapwise/core@1.5.0  ✅
@mapwise/core@1.2.3 → @mapwise/core@1.9.0  ✅
```

Minor versions MAY:
- Add new exports
- Add optional parameters to existing functions
- Add new event types
- Deprecate APIs (with console warnings)
- Improve performance
- Fix bugs

Minor versions will NEVER:
- Remove exports
- Change function signatures incompatibly
- Rename exports
- Change event payload shapes
- Remove event types

### Major Versions (x.0.0)

**Breaking changes only in major versions.**

Major version upgrades may require code changes:

```bash
# May require migration
@mapwise/core@1.9.0 → @mapwise/core@2.0.0  ⚠️
```

Major versions MAY:
- Remove deprecated APIs
- Change function signatures
- Rename or restructure exports
- Change event payloads
- Update minimum dependency versions

Major versions will ALWAYS include:
- Migration guide
- Changelog with all breaking changes
- Codemods when feasible

---

## API Classification

### Public API (Stable)

Everything exported from `index.ts` is public and covered by stability guarantees:

```typescript
// index.ts - All exports are public API
export { createMap, destroyMap } from './map/create-map';
export { mapStore } from './map/map-store';
export { layerRegistry } from './registry/layer-registry';
export { eventBus } from './events/event-bus';
// ... etc
```

### Internal API (Unstable)

Anything NOT exported from `index.ts` is internal:

```typescript
// ❌ Don't do this - internal import
import { internalHelper } from '@mapwise/core/src/utils/internal';

// ✅ Do this - public import
import { publicHelper } from '@mapwise/core';
```

Internal APIs may change in ANY version without notice.

### Experimental API (Unstable)

Experimental features are prefixed with `experimental_`:

```typescript
export { experimental_batchLayers } from './experimental/batch';
```

Experimental APIs:
- May change in minor versions
- May be removed without deprecation
- Will be promoted to stable or removed within 2 major versions

---

## Deprecation Policy

### Deprecation Process

1. **Announce**: Deprecated in minor version with console warning
2. **Document**: Migration path documented in CHANGELOG
3. **Maintain**: Deprecated API continues working for at least 1 major version
4. **Remove**: Removed in next major version

### Deprecation Warnings

```typescript
/**
 * @deprecated Use `layerRegistry.add()` instead. Will be removed in v2.0.0.
 */
export function addLayer(layer: LayerInput): LayerState {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[@mapwise/core] addLayer() is deprecated. ' +
      'Use layerRegistry.add() instead. ' +
      'This will be removed in v2.0.0.'
    );
  }
  return layerRegistry.add(layer);
}
```

---

## Type Stability

TypeScript types follow the same stability rules as runtime APIs:

### Stable Types

```typescript
// Exported types are stable
export type { LayerState, LayerInput } from './types/layer';
export type { MapOptions, Viewport } from './types/map';
export type { Plugin, PluginContext } from './types/plugin';
```

### Type Evolution Rules

**Allowed in minor versions:**
- Adding optional properties to interfaces
- Adding new types
- Widening union types

```typescript
// v1.0.0
interface LayerState {
  id: string;
  name: string;
}

// v1.1.0 - OK: Optional property added
interface LayerState {
  id: string;
  name: string;
  description?: string;  // ✅ Optional, non-breaking
}
```

**Requires major version:**
- Adding required properties
- Removing properties
- Narrowing types
- Changing property types

```typescript
// v1.0.0
interface LayerState {
  id: string;
  name: string;
}

// v2.0.0 - Required: New required property
interface LayerState {
  id: string;
  name: string;
  type: LayerType;  // ⚠️ Required, breaking
}
```

---

## Event Contract Stability

Events emitted by `eventBus` are part of the public API:

### Event Name Stability

Event names (`layer:added`, `map:ready`, etc.) follow the same rules as exports:
- New events may be added in minor versions
- Events may only be removed in major versions

### Event Payload Stability

```typescript
// v1.0.0
eventBus.emit('layer:added', { 
  layer: LayerState 
});

// v1.1.0 - OK: New optional field
eventBus.emit('layer:added', { 
  layer: LayerState,
  source?: string  // ✅ Optional, non-breaking
});

// v2.0.0 - Required: Restructured payload
eventBus.emit('layer:added', { 
  layer: LayerState,
  metadata: { source: string }  // ⚠️ Breaking change
});
```

---

## Dependency Stability

### Peer Dependencies

MapLibre GL JS version requirements:
- May be widened in minor versions
- May be narrowed in major versions only

```json
{
  "peerDependencies": {
    "maplibre-gl": "^5.0.0"
  }
}
```

### React Peer Dependency

React is optional and follows the same policy:

```json
{
  "peerDependencies": {
    "react": "^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true }
  }
}
```

---

## Release Cadence

| Release Type | Frequency | Contents |
|--------------|-----------|----------|
| Patch | As needed | Bug fixes |
| Minor | Monthly | New features |
| Major | Annually | Breaking changes |

---

## Support Policy

| Version | Status | Support |
|---------|--------|---------|
| Latest major | Active | Full support |
| Previous major | Maintenance | Security fixes only |
| Older | EOL | No support |

Example timeline:
- v2.0.0 released → v1.x enters maintenance
- v3.0.0 released → v1.x EOL, v2.x enters maintenance

---

## Reporting Issues

If you believe a minor version introduced a breaking change:

1. Check if you were using internal APIs
2. Check CHANGELOG for intentional changes
3. Open an issue with reproduction case

Unintentional breaking changes in minor versions will be:
- Fixed in a patch release
- Not rolled forward (the break was a bug)

---

## Changelog

All changes are documented in [CHANGELOG.md](./CHANGELOG.md) following [Keep a Changelog](https://keepachangelog.com/) format.

