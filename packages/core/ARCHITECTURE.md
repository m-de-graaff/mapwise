# @mapwise/core — Architecture

> Headless, framework-safe mapping engine built on MapLibre GL JS.

---

## Mission Statement

Provide a **stable, headless, framework-safe mapping engine** that:

- Owns the MapLibre lifecycle completely
- Manages layers & plugins abstractly
- Exposes predictable state + events
- Never forces UI decisions
- Is safe in Next.js / SSR environments
- Is boring, reliable, and future-proof

---

## Core Invariants (Non-Negotiable)

These rules are **absolute** and must never be violated:

### 1. No UI Library Dependencies

```
❌ Core NEVER imports:
   - react (except in react/ adapter folder)
   - vue, svelte, solid, or any other UI framework
   - shadcn, radix, headless-ui, or any component library
   - tailwind, styled-components, or any CSS-in-JS
```

The `react/` folder is an **adapter layer**, not part of core logic. It exists for convenience but could be extracted to a separate package.

### 2. No DOM Assumptions

```
❌ Core NEVER:
   - Queries the DOM (document.querySelector, etc.)
   - Creates DOM elements (except MapLibre's internal needs)
   - Assumes browser globals exist (window, document)

✅ Core ONLY:
   - Receives a container element as a parameter
   - Passes that container to MapLibre
   - That's it.
```

### 3. React is an Adapter, Not a Dependency

The core engine works without React. React bindings in `react/` are:
- Optional (peer dependency)
- Thin adapters over the headless API
- Never contain business logic

```typescript
// ✅ Correct: Hook wraps headless API
export function useMap() {
  const ctx = useContext(MapContext);
  return ctx.mapStore.getState();
}

// ❌ Wrong: Hook contains business logic
export function useMap() {
  const [layers, setLayers] = useState([]);
  // ... managing state inside hook
}
```

### 4. State is Serializable

All state managed by core must be JSON-serializable:

```typescript
// ✅ Serializable state
interface LayerState {
  id: string;
  type: "geojson" | "raster" | "vector";
  name: string;
  visible: boolean;
  opacity: number;
  sourceUrl?: string;
  data?: GeoJSON.FeatureCollection;
}

// ❌ Non-serializable (functions, class instances)
interface BadLayerState {
  onClick: () => void;        // function
  mapInstance: maplibregl.Map; // class instance
}
```

### 5. SSR Safety

Core must be safe to import in SSR environments (Next.js, Remix, etc.):

```typescript
// ✅ Safe: No top-level side effects
export function createMap(container: HTMLElement, options: MapOptions) {
  // Only runs when called
}

// ❌ Unsafe: Top-level browser access
const map = new maplibregl.Map(...); // Crashes in SSR
```

---

## Module Structure

```
packages/core/src/
│
├─ index.ts                 # Public API exports only
│
├─ map/                     # MapLibre lifecycle
│  ├─ create-map.ts         # Factory function
│  ├─ map-store.ts          # Non-reactive state holder
│  ├─ style-manager.ts      # Basemap switching
│  └─ viewport.ts           # Camera helpers
│
├─ registry/                # Collection management
│  ├─ layer-registry.ts     # Layer CRUD + ordering
│  ├─ registry-types.ts     # Layer type definitions
│  ├─ plugin-registry.ts    # Plugin manager + lifecycle
│  └─ plugin-types.ts       # Plugin type definitions
│
├─ events/                  # Internal communication
│  ├─ event-bus.ts          # Typed pub/sub with debug mode
│  └─ event-types.ts        # Complete event definitions
│
├─ errors/                  # Error handling & diagnostics
│  ├─ error-types.ts        # Structured error types & codes
│  ├─ error-reporter.ts     # Central error reporting system
│  ├─ logger.ts             # Diagnostic logging
│  └─ index.ts              # Barrel export
│
├─ react/                   # React adapters (optional)
│  ├─ index.ts              # Barrel export
│  ├─ MapContext.ts         # React context definition
│  ├─ MapProvider.tsx       # Context provider
│  ├─ useMap.ts             # Map access hooks
│  ├─ useMapReady.ts        # Ready state hooks
│  ├─ useLayerState.ts      # Layer subscription hooks
│  └─ useMapEvents.ts       # Event subscription hooks
│
├─ persistence/             # State serialization
│  ├─ serialize.ts          # Export to JSON
│  ├─ hydrate.ts            # Restore from JSON
│  └─ schema.ts             # Versioned schemas
│
├─ types/                   # TypeScript definitions
│  ├─ layer.ts
│  ├─ plugin.ts
│  ├─ map.ts
│  └─ persisted-state.ts
│
└─ utils/                   # Internal helpers
   ├─ assert.ts
   ├─ id.ts
   └─ debounce.ts
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Code / UI                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     React Adapters (optional)                   │
│                   MapProvider, useMap, useLayerState            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Core Public API                          │
│            createMap, layerRegistry, eventBus, etc.             │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────────┐    ┌──────────┐
    │ MapStore │◄─────►│  EventBus    │◄──►│ Registry │
    └──────────┘       └──────────────┘    └──────────┘
          │                   │                  │
          ▼                   ▼                  ▼
    ┌──────────┐       ┌──────────────┐    ┌──────────────┐
    │ MapLibre │       │   Plugins    │    │ Layer/Plugin │
    │ Instance │       │   System     │    │    State     │
    └──────────┘       └──────────────┘    └──────────────┘
```

### Flow Description

1. **User Code** calls public API (e.g., `layerRegistry.add(layer)`)
2. **Registry** validates input and updates internal state
3. **EventBus** emits typed event (`layer:added`)
4. **Plugins** receive events via their lifecycle hooks
5. **MapStore** may react by updating MapLibre
6. **React Adapters** (if used) receive events and trigger re-renders

---

## Event Bus Architecture

The event bus enables loose coupling between core, layers, plugins, and UI:

### Event Categories

| Category | Events | Purpose |
|----------|--------|---------|
| Map Lifecycle | `map:ready`, `map:error`, `map:resize`, `map:destroyed` | Map instance state |
| Style | `style:changeStart`, `style:changeComplete`, `style:changeError` | Basemap changes |
| Layer | `layer:added`, `layer:removed`, `layer:visibility`, `layer:updated` | Layer management |
| Source | `source:added`, `source:removed` | Data sources |
| Plugin | `plugin:registered`, `plugin:unregistered`, `plugin:error` | Plugin lifecycle |
| Feature | `feature:click`, `feature:hover`, `feature:hoverEnd` | Interactions (data only) |
| Core | `core:error`, `core:debug` | System diagnostics |

### Type Safety

All events are fully typed. TypeScript prevents invalid event names and enforces correct payloads:

```typescript
// ✅ Correct - TypeScript validates payload shape
eventBus.emit('layer:added', { layerId: 'test', sourceId: null });

// ❌ Error - Missing required property
eventBus.emit('layer:added', { layerId: 'test' });

// ❌ Error - Invalid event name
eventBus.emit('invalid:event', {});
```

### Error Isolation

Handler exceptions are caught and don't propagate:

```typescript
// This handler throws
eventBus.on('layer:added', () => {
  throw new Error('Handler error');
});

// This handler still runs - errors don't cascade
eventBus.on('layer:added', (e) => {
  console.log('Layer added:', e.layerId);
});

// Error is emitted as event for logging
eventBus.on('core:error', (e) => {
  console.warn('Event error:', e.message);
});
```

### Debug Mode

Enable debug mode for development and troubleshooting:

```typescript
const bus = createEventBus({ debug: true });

// See event flow in console
bus.emit('layer:added', { layerId: 'test', sourceId: null });
// [@mapwise/event-bus] Emit "layer:added" to 2 handlers

// Query event history
bus.getHistory();
// [{ event: 'layer:added', timestamp: ..., handlerCount: 2, errors: [] }]

// Filter history
bus.filterHistory({ event: 'layer:added', hasErrors: false });
```

### Subscribe/Unsubscribe

```typescript
// Subscribe - returns unsubscribe function
const unsubscribe = eventBus.on('map:ready', (e) => {
  console.log('Map ready at', e.timestamp);
});

// One-time listener
eventBus.once('layer:added', (e) => {
  console.log('First layer:', e.layerId);
});

// Unsubscribe when done
unsubscribe();

// Clear all handlers
eventBus.off();
```

---

## Error Handling & Diagnostics

MapWise provides a comprehensive error handling system that:
- Never crashes the app
- Makes debugging straightforward
- Uses structured error objects

### Error Categories

| Category | Description |
|----------|-------------|
| `configuration` | Invalid options, missing required values |
| `network` | Failed requests, timeouts, CORS issues |
| `maplibre` | MapLibre GL errors (style, sources, layers) |
| `plugin` | Plugin lifecycle errors |
| `layer` | Layer registry errors |
| `style` | Basemap/style errors |
| `persistence` | Serialization/hydration errors |
| `validation` | Input validation failures |
| `internal` | Unexpected internal errors |

### Structured Errors

All errors are structured `MapwiseError` objects:

```typescript
interface MapwiseError {
  code: string;           // e.g., "LAYER_NOT_FOUND"
  message: string;        // Human-readable
  category: ErrorCategory;
  severity: ErrorSeverity; // debug | info | warning | error | critical
  recoverable: boolean;
  timestamp: number;
  source: string;         // Component that generated error
  cause?: Error;          // Original error
  context?: Record<string, unknown>;
  recovery?: string;      // Suggested fix
}
```

### Error Reporter

The central error reporter handles all errors:

```typescript
import { defaultErrorReporter, createError, LayerErrors } from '@mapwise/core';

// Report a structured error
defaultErrorReporter.report(createError({
  code: LayerErrors.notFound,
  message: 'Layer "buildings" not found',
  category: 'layer',
  source: 'layer-registry',
  context: { layerId: 'buildings' },
  recovery: 'Check the layer ID and ensure it is registered',
}));

// Wrap async operations with automatic error handling
const result = await defaultErrorReporter.wrapAsync(
  () => fetchLayerData(),
  { source: 'data-loader', category: 'network', recoveryValue: [] }
);
```

### Debug & Production Modes

```typescript
import { enableDebugMode, enableProductionMode, defaultLogger } from '@mapwise/core';

// Debug mode: verbose logging, timestamps, full traces
enableDebugMode();

// Production mode: minimal logs, errors only
enableProductionMode();

// Custom configuration
defaultLogger.configure({
  level: 'warn',
  timestamps: true,
  handler: (entry) => sendToMonitoring(entry),
});
```

### Safe Wrappers

Wrap operations to ensure they never throw:

```typescript
import { createSafeWrapper, safePromise } from '@mapwise/core';

// Sync wrapper - never throws, returns recovery value on error
const safeParse = createSafeWrapper(JSON.parse, {
  source: 'parser',
  category: 'validation',
  recoveryValue: null,
});

// Async wrapper - never rejects
const data = await safePromise(fetch(url), {
  source: 'fetch',
  category: 'network',
  recoveryValue: { features: [] },
});
```

---

## Error Philosophy

### Never Throw in Async Contexts

```typescript
// ❌ Bad: Throwing in event handler
map.on('load', () => {
  if (!valid) throw new Error('Invalid!'); // Uncatchable
});

// ✅ Good: Emit error event
map.on('load', () => {
  if (!valid) {
    eventBus.emit('error', { 
      code: 'INVALID_STATE',
      message: 'Invalid state detected',
      recoverable: true
    });
    return;
  }
});
```

### Fail Soft, Report Loud

Core should:
- Continue operating when possible
- Emit detailed error events
- Let consuming code decide how to handle errors

```typescript
eventBus.on('error', (error) => {
  if (error.recoverable) {
    console.warn('Recoverable error:', error.message);
  } else {
    console.error('Critical error:', error.message);
    // Maybe show user notification
  }
});
```

### Validation at Boundaries

Validate inputs at public API boundaries, not deep in internals:

```typescript
// ✅ Validate at public API
export function addLayer(layer: LayerInput): LayerState {
  assertValidLayer(layer); // Throws here is OK - sync, at boundary
  return internalAddLayer(layer);
}

// Internal functions trust their inputs
function internalAddLayer(layer: ValidatedLayer): LayerState {
  // No validation needed - caller guaranteed valid input
}
```

---

## Plugin Architecture

Plugins extend core functionality without modifying core code. The plugin system provides:

- **Strict lifecycle management** with predictable hook ordering
- **Error isolation** - one plugin's error doesn't break others
- **State persistence** - plugins survive basemap/style reloads
- **Dynamic registration** - add/remove plugins at runtime

### Plugin Definition

```typescript
interface PluginDefinition {
  id: string;           // Unique identifier (namespaced: "@myorg/plugin-name")
  name?: string;        // Human-readable name
  version?: string;     // Semver version
  description?: string; // Description
  dependencies?: readonly string[]; // IDs of required plugins
  
  // Core lifecycle hooks
  onRegister(ctx: PluginContext): void | (() => void) | Promise<void | (() => void)>;
  onUnregister?(ctx: PluginContext): void | Promise<void>;
  
  // Optional lifecycle hooks
  onMapReady?(ctx: PluginContext): void | Promise<void>;
  onStyleChangeStart?(ctx: PluginContext, newStyle: string): void | Promise<void>;
  onStyleChangeComplete?(ctx: PluginContext, style: string): void | Promise<void>;
  onLayerAdded?(ctx: PluginContext, layer: LayerState): void;
  onLayerRemoved?(ctx: PluginContext, layerId: string): void;
  onViewportChange?(ctx: PluginContext, viewport: Viewport): void;
  onResize?(ctx: PluginContext, width: number, height: number): void;
  onDestroy?(ctx: PluginContext): void | Promise<void>;
}
```

### Plugin Context

Plugins receive a context object providing controlled access to the map system:

```typescript
interface PluginContext {
  mapId: string;           // Map instance ID
  map: MapLibreMap;        // MapLibre instance (throws if not ready)
  layers: LayerRegistry;   // Layer management
  style: StyleManager;     // Basemap operations
  events: EventBus;        // Event subscription/emission
  state: PluginStateStore; // Persistent key-value store
  
  getViewport(): Viewport; // Current camera state
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void;
}
```

### Plugin Manager API

```typescript
interface PluginManager {
  register(plugin: PluginDefinition): Promise<void>;
  unregister(id: string): Promise<boolean>;
  has(id: string): boolean;
  getPluginState(id: string): PluginState | undefined;
  getAllPlugins(): PluginState[];
  count: number;
}
```

### Plugin Rules

1. **Unique IDs** - Plugin IDs must be unique; registration fails on duplicates
2. **Dependency order** - Dependencies must be registered before dependents
3. **Error isolation** - Plugin hook errors emit events but don't crash core
4. **Context boundaries** - Plugins access map via context, not direct mutation
5. **Cleanup support** - `onRegister` can return a cleanup function
6. **Style survival** - Plugins persist across basemap changes automatically

### Example Plugin

```typescript
const myPlugin: PluginDefinition = {
  id: '@myorg/analytics-plugin',
  name: 'Analytics Plugin',
  version: '1.0.0',
  
  onRegister(ctx) {
    ctx.log('info', 'Analytics initialized');
    ctx.state.set('eventCount', 0);
    
    // Return cleanup function
    return () => {
      ctx.log('info', 'Analytics cleanup');
    };
  },
  
  onMapReady(ctx) {
    ctx.log('info', 'Map ready, starting tracking');
  },
  
  onViewportChange(ctx, viewport) {
    const count = ctx.state.get<number>('eventCount') ?? 0;
    ctx.state.set('eventCount', count + 1);
    // Track viewport change...
  },
  
  onStyleChangeComplete(ctx, style) {
    // Analytics continue after style change
    ctx.log('info', `Style changed to ${style}`);
  }
};

// Usage
await controller.plugins.register(myPlugin);
```

---

## State Persistence & Hydration

The persistence system allows map setups to be saved, restored, and versioned.

### PersistedMapState Schema

```typescript
interface PersistedMapState {
  version: number;          // Schema version for migration
  timestamp: number;        // When state was saved
  name?: string;            // Optional name
  description?: string;     // Optional description
  basemap: string;          // Current basemap URL
  viewport: PersistedViewport;
  layers: PersistedLayerState[];
  plugins: PersistedPluginState[];
  custom?: Record<string, unknown>; // App-specific data
}
```

### Serialize State

```typescript
// Save current state
const state = controller.serialize({
  name: 'My Saved Map',
  includeViewport: true,
  includePlugins: true,
  layerFilter: (id) => !id.startsWith('temp-'),
});

// Store as JSON
localStorage.setItem('mapState', JSON.stringify(state));
```

### Hydrate State

```typescript
// Restore saved state
const saved = JSON.parse(localStorage.getItem('mapState'));

const result = await controller.hydrate(saved, {
  restoreBasemap: true,
  restoreViewport: true,
  restorePlugins: true,
  layerMergeStrategy: 'keep', // or 'remove'
  onMigration: (info) => {
    console.log(`Migrated from v${info.fromVersion} to v${info.toVersion}`);
  },
});

if (!result.success) {
  console.error('Hydration failed:', result.error);
}
```

### Validation & Migration

```typescript
import { validateState, isPersistedMapState } from '@mapwise/core';

// Validate unknown data
const validation = validateState(unknownData);
if (!validation.valid) {
  console.error('Errors:', validation.errors);
}

// Type guard
if (isPersistedMapState(data)) {
  await controller.hydrate(data);
}
```

### Versioned Schema

The schema is versioned for forward compatibility:
- `SCHEMA_VERSION` - Current schema version
- `MIN_SCHEMA_VERSION` - Minimum supported version
- Automatic migration from older versions
- Custom migration hooks via `HydrateOptions.migrate`

### What Gets Persisted

| Component | Persisted | Notes |
|-----------|-----------|-------|
| Basemap URL | ✅ | Full restoration |
| Viewport | ✅ | Center, zoom, bearing, pitch |
| Layer visibility | ✅ | Per-layer |
| Layer opacity | ✅ | Per-layer |
| Layer order | ✅ | Registry ordering |
| Plugin state | ✅ | Opt-in, serializable keys only |
| Custom data | ✅ | Application-defined |
| Layer definitions | ❌ | Must be re-registered |
| Custom layer handlers | ❌ | Must be re-registered |

---

## React Adapters (Optional)

The `react/` folder provides thin, optional bindings for React applications. These are adapters, not core functionality—the headless API is fully usable without React.

### Design Principles

1. **Thin wrappers** - No business logic in hooks, just React integration
2. **StrictMode compatible** - Handles double-mounting correctly
3. **External store pattern** - Uses `useSyncExternalStore` to avoid render storms
4. **Selective subscriptions** - Components only re-render when their data changes

### Provider

```tsx
import { MapProvider } from '@mapwise/core/react';

function App() {
  return (
    <MapProvider
      options={{
        style: 'https://demotiles.maplibre.org/style.json',
        center: [0, 0],
        zoom: 2,
      }}
      onReady={() => console.log('Map ready!')}
      style={{ width: '100vw', height: '100vh' }}
    >
      <MapControls />
    </MapProvider>
  );
}
```

### Hooks

| Hook | Purpose | Re-renders When |
|------|---------|-----------------|
| `useMap()` | Access MapController + ready state | Controller changes |
| `useMapController()` | Get controller (throws if not ready) | Never (stable ref) |
| `useMapReady()` | Track ready state only | Ready state changes |
| `useAwaitMapReady()` | Get async ready function | Never |
| `useLayerState(id)` | Subscribe to layer state | Layer state changes |
| `useAllLayers()` | Get all layers | Layers added/removed |
| `useLayersByCategory(cat)` | Filter by category | Category layers change |
| `useMapEvents(handlers)` | Subscribe to events | Never (stable handlers) |
| `useMapEvent(name, fn)` | Single event subscription | Never |

### Example: Layer Toggle

```tsx
import { useMap, useLayerState } from '@mapwise/core/react';

function LayerToggle({ layerId }: { layerId: string }) {
  const { controller, isReady } = useMap();
  const layerState = useLayerState(layerId);

  if (!isReady || !layerState) return null;

  return (
    <label>
      <input
        type="checkbox"
        checked={layerState.visible}
        onChange={(e) => {
          controller.layers.setVisibility(layerId, e.target.checked);
        }}
      />
      {layerState.metadata?.title ?? layerId}
    </label>
  );
}
```

### StrictMode Behavior

In React StrictMode, components are mounted twice during development. The `MapProvider` handles this correctly:

1. First mount creates the map
2. Immediate unmount destroys the map
3. Second mount creates a new map

This ensures no leaked resources and matches production behavior.

---

## Testing Strategy

### Unit Tests

- Pure functions (utils, serialization)
- State management (registries)
- Event bus behavior

### Integration Tests

- Full lifecycle (create → use → destroy)
- Plugin registration
- State persistence round-trip

### E2E Tests (separate package)

- Browser-based MapLibre tests
- Visual regression tests

---

## File Naming Conventions

| Pattern | Purpose | Example |
|---------|---------|---------|
| `kebab-case.ts` | Implementation files | `layer-registry.ts` |
| `PascalCase.tsx` | React components | `MapProvider.tsx` |
| `camelCase` | Exports | `layerRegistry`, `eventBus` |
| `SCREAMING_SNAKE` | Constants | `DEFAULT_ZOOM` |

---

## Import Rules

### External Dependencies

```typescript
// ✅ Allowed
import type { Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

// ❌ Forbidden in core (except react/ folder)
import React from 'react';
import { Button } from 'shadcn';
```

### Internal Imports

```typescript
// ✅ Relative imports within module
import { assertValidLayer } from './validation';

// ✅ Absolute imports across modules
import { eventBus } from '../events/event-bus';

// ❌ Circular imports
// layer-registry.ts imports plugin-registry.ts
// plugin-registry.ts imports layer-registry.ts
```

---

## Change Management

See [API_STABILITY.md](./API_STABILITY.md) for versioning and compatibility promises.

See [ALLOWED_DEPENDENCIES.md](./ALLOWED_DEPENDENCIES.md) for dependency policy.

