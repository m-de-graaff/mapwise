# Plugins Architecture

This document describes the architecture, conventions, and best practices for MapWise plugins.

## Overview

Plugins extend MapWise with interactive features like drawing, measurement, inspection, and more. They follow strict conventions to ensure safety, composability, and maintainability.

## What Plugins Can Do

✅ **Register layers** - Plugins can create and register layers via `ctx.layers`

✅ **Subscribe to events** - Plugins can listen to map events, layer events, and custom events via `ctx.events`

✅ **Emit events** - Plugins can emit custom events following the naming convention

✅ **Access map instance** - Plugins can access the MapLibre map instance via `ctx.map` (throws if not ready)

✅ **Persist state** - Plugins can store serializable state via `ctx.state` for persistence

✅ **Access viewport** - Plugins can get current viewport via `ctx.getViewport()`

✅ **React to lifecycle events** - Plugins can respond to map ready, style changes, layer changes, etc.

✅ **Expose headless state hooks** - Plugins can expose state for UI components to consume

## What Plugins Cannot Do

❌ **Create UI components** - UI belongs in `@mapwise/ui`, plugins are headless

❌ **Directly mutate map style** - Use `ctx.style` methods instead

❌ **Break other plugins** - Errors are isolated, but plugins should handle errors gracefully

❌ **Block core operations** - Long-running operations should be async and non-blocking

❌ **Store non-serializable state** - Only JSON-serializable values can be persisted

❌ **Access DOM directly** - Plugins should work with the map abstraction

❌ **Depend on React** - Plugins are framework-agnostic (React hooks live in UI package)

## Plugin Lifecycle

### Registration Phase

1. **Dependency Check** - Core verifies all plugin dependencies are registered
2. **Create Entry** - Plugin entry is created with initial state
3. **Call `onRegister`** - Plugin initialization hook is called
4. **Store Cleanup** - If `onRegister` returns a cleanup function, it's stored
5. **Setup Event Listeners** - If map is ready, event listeners are attached
6. **Activate** - Plugin state is marked as active
7. **Emit Event** - `plugin:registered` event is emitted
8. **Call `onMapReady`** - If map is already ready, this hook is called

### Runtime Phase

Once registered and active, plugins can:

- Respond to lifecycle hooks (`onViewportChange`, `onLayerAdded`, etc.)
- Handle map events via subscriptions
- Update their internal state
- Emit custom events
- Register/manage layers

### Unregistration Phase

1. **Call `onUnregister`** - Plugin cleanup hook is called (if provided)
2. **Call Cleanup** - Cleanup function from `onRegister` is called (if returned)
3. **Teardown Listeners** - All event listeners are removed
4. **Clear State** - Plugin state store is cleared
5. **Remove Entry** - Plugin entry is removed from registry
6. **Emit Event** - `plugin:unregistered` event is emitted

### Style Change Handling

When basemap/style changes:

1. **`onStyleChangeStart`** is called before style change
2. **Core handles style reload** - Layers are automatically reapplied
3. **`onStyleChangeComplete`** is called after style change
4. **Plugin continues** - Plugin state and subscriptions are preserved

Plugins should NOT need to handle style reloads manually. The core system automatically:
- Reapplies registered layers
- Maintains layer order
- Preserves layer visibility/opacity

## Error Boundaries

Plugins are isolated from each other and from the core system:

### Hook Execution Safety

All plugin lifecycle hooks are wrapped in error handlers:

```typescript
// Plugin hook errors don't crash the system
try {
  await plugin.onMapReady(ctx);
} catch (error) {
  ctx.events.emit('plugin:error', {
    pluginId: plugin.id,
    hook: 'onMapReady',
    error: error instanceof Error ? error.message : String(error),
  });
  // Plugin continues to function, other hooks still execute
}
```

### Error Isolation Rules

1. **Hook Errors** - Errors in lifecycle hooks emit events but don't stop execution
2. **Event Handler Errors** - Errors in event handlers are caught and logged
3. **Unregister on Critical Errors** - Critical errors may trigger automatic unregistration (future)

### Best Practices

```typescript
export function createMyPlugin(config: MyPluginConfig): PluginDefinition {
  return {
    id: '@mapwise/my-plugin',
    
    onRegister(ctx) {
      // ✅ Good: Wrap risky operations
      try {
        setupComplexFeature(ctx);
      } catch (error) {
        ctx.log('error', `Failed to setup feature: ${error}`);
        // Continue initialization with reduced functionality
      }
      
      // ✅ Good: Validate prerequisites
      if (!ctx.map.getSource('required-source')) {
        ctx.log('warn', 'Required source not found');
        // Handle gracefully
      }
    },
    
    onViewportChange(ctx, viewport) {
      // ✅ Good: Handle errors in event handlers
      try {
        updateFeatureBasedOnViewport(ctx, viewport);
      } catch (error) {
        ctx.log('error', `Viewport update failed: ${error}`);
        // Don't throw - errors are isolated but throwing prevents other plugins from running
      }
    },
  };
}
```

## Persistence Expectations

### Plugin State Persistence

Plugins can opt into persistence by storing state in `ctx.state`:

```typescript
export function createDrawPlugin(config: DrawPluginConfig): PluginDefinition {
  return {
    id: '@mapwise/draw',
    
    onRegister(ctx) {
      // ✅ Good: Store serializable state
      ctx.state.set('active', false);
      ctx.state.set('mode', 'polygon');
      ctx.state.set('snapTolerance', 10);
      
      // ❌ Bad: Don't store non-serializable values
      // ctx.state.set('mapInstance', ctx.map); // Error: not serializable
      // ctx.state.set('callback', () => {});   // Error: functions not serializable
    },
    
    onUnregister(ctx) {
      // State is automatically cleared on unregister
      // No manual cleanup needed
    },
  };
}
```

### Serialization Rules

**Serializable:**
- ✅ Primitives: `string`, `number`, `boolean`, `null`
- ✅ Arrays of serializable values
- ✅ Objects with serializable values
- ✅ Dates (serialized as ISO strings)

**Not Serializable:**
- ❌ Functions
- ❌ Map instances
- ❌ DOM elements
- ❌ Class instances (unless they have `toJSON` method)
- ❌ Circular references

### State Restoration

When state is hydrated:

1. **Plugin is registered** - Plugin must be registered before hydration
2. **State is restored** - `ctx.state` is populated with persisted values
3. **`onMapReady` is called** - Plugin can react to restored state
4. **Plugin initializes** - Plugin should handle restored state in initialization

```typescript
export function createMeasurePlugin(config: MeasurePluginConfig): PluginDefinition {
  return {
    id: '@mapwise/measure',
    
    onRegister(ctx) {
      // Initialize from persisted state or defaults
      const persistedMode = ctx.state.get<string>('mode');
      const mode = persistedMode ?? config.defaultMode ?? 'distance';
      
      ctx.state.set('mode', mode);
    },
    
    onMapReady(ctx) {
      // React to restored state
      const measurements = ctx.state.get<Measurement[]>('measurements') ?? [];
      
      if (measurements.length > 0) {
        // Restore visual representation of measurements
        restoreMeasurements(ctx, measurements);
      }
    },
  };
}
```

## Plugin Configuration Patterns

### Base Configuration

All plugins extend `BasePluginConfig`:

```typescript
interface BasePluginConfig {
  enabled?: boolean;          // Enable/disable plugin
  hotkeys?: Record<string, string>;  // Keyboard shortcuts
  cursor?: string;            // CSS cursor when active
}
```

### Plugin-Specific Configuration

```typescript
interface DrawPluginConfig extends BasePluginConfig {
  mode?: 'point' | 'line' | 'polygon';
  snapTolerance?: number;
  maxFeatures?: number;
}

interface InspectPluginConfig extends BasePluginConfig {
  highlightColor?: string;
  showPopup?: boolean;
  queryLayers?: string[];
}
```

## Event Naming Convention

Plugin events follow the pattern: `plugin:<plugin-id>:<event-name>`

### Examples

```typescript
// Inspect plugin
'plugin:@mapwise/inspect:featureClick'
'plugin:@mapwise/inspect:featureHover'
'plugin:@mapwise/inspect:featureLeave'

// Draw plugin
'plugin:@mapwise/draw:featureComplete'
'plugin:@mapwise/draw:featureCancel'
'plugin:@mapwise/draw:featureDelete'

// Measure plugin
'plugin:@mapwise/measure:measurementComplete'
'plugin:@mapwise/measure:measurementClear'
```

### Type-Safe Event Names

Use the helper type and function:

```typescript
import type { PluginEventNames } from '@mapwise/plugins';
import { createPluginEventName } from '@mapwise/plugins';

type InspectEvents = PluginEventNames<'@mapwise/inspect', 'featureClick' | 'featureHover'>;

const clickEvent = createPluginEventName('@mapwise/inspect', 'featureClick');
// Returns: 'plugin:@mapwise/inspect:featureClick'
```

### Emitting Events

```typescript
export function createInspectPlugin(config: InspectPluginConfig): PluginDefinition {
  return {
    id: '@mapwise/inspect',
    
    onMapReady(ctx) {
      ctx.map.on('click', (e) => {
        // ... handle click
        
        // Emit plugin event
        ctx.events.emit('plugin:@mapwise/inspect:featureClick', {
          lngLat: [e.lngLat.lng, e.lngLat.lat],
          features: queriedFeatures,
          point: [e.point.x, e.point.y],
        });
      });
    },
  };
}
```

## Layer Registration

Plugins can register layers they need:

```typescript
import { createGeoJsonLayer } from '@mapwise/layers';

export function createDrawPlugin(config: DrawPluginConfig): PluginDefinition {
  return {
    id: '@mapwise/draw',
    
    onRegister(ctx) {
      // Register a GeoJSON layer for drawing
      const drawLayer = createGeoJsonLayer({
        id: '@mapwise/draw:features',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
      
      ctx.layers.registerLayer(drawLayer);
      
      // Store layer ID for later use
      ctx.state.set('layerId', drawLayer.id);
    },
    
    onUnregister(ctx) {
      // Layers are automatically cleaned up, but you can remove explicitly
      const layerId = ctx.state.get<string>('layerId');
      if (layerId) {
        ctx.layers.removeLayer(layerId);
      }
    },
  };
}
```

## Headless State Hooks

Plugins can expose state for UI components to consume:

```typescript
// Plugin stores state internally
const pluginState = {
  active: false,
  mode: 'distance' as 'distance' | 'area',
  measurements: [] as Measurement[],
};

export function createMeasurePlugin(config: MeasurePluginConfig): PluginDefinition {
  return {
    id: '@mapwise/measure',
    
    onRegister(ctx) {
      // Store state in plugin's state store
      ctx.state.set('active', pluginState.active);
      ctx.state.set('mode', pluginState.mode);
      ctx.state.set('measurements', pluginState.measurements);
    },
  };
}

// UI components can access state (in @mapwise/ui package)
// export function useMeasurePlugin() {
//   const { controller } = useMap();
//   const pluginState = controller.plugins.getPluginState('@mapwise/measure');
//   const stateStore = controller.plugins.getPluginStateStore('@mapwise/measure');
//   // ...
// }
```

Note: React hooks belong in `@mapwise/ui`, not in `@mapwise/plugins`. Plugins only expose state via the state store.

## Dynamic Enable/Disable

Plugins should support being enabled/disabled at runtime:

```typescript
export function createInspectPlugin(config: InspectPluginConfig): PluginDefinition {
  let enabled = config.enabled ?? true;
  let clickHandler: ((e: MapMouseEvent) => void) | null = null;
  
  return {
    id: '@mapwise/inspect',
    
    onRegister(ctx) {
      clickHandler = (e: MapMouseEvent) => {
        if (!enabled) return; // Don't respond if disabled
        
        // Handle click...
        queryFeatures(ctx, e);
      };
      
      ctx.map.on('click', clickHandler);
      
      // Listen for enable/disable events (custom pattern)
      ctx.events.on('plugin:@mapwise/inspect:setEnabled', (payload: { enabled: boolean }) => {
        enabled = payload.enabled;
        ctx.map.getCanvas().style.cursor = enabled ? (config.cursor ?? 'pointer') : '';
      });
    },
    
    onUnregister(ctx) {
      if (clickHandler) {
        ctx.map.off('click', clickHandler);
      }
    },
  };
}
```

## File Structure

Each plugin should follow this structure:

```
plugins/src/
  <plugin-name>/
    <plugin-name>-plugin.ts    # Main plugin factory
    <feature>.ts               # Feature-specific utilities
    types.ts                   # Plugin-specific types
```

Example:

```
plugins/src/
  inspect/
    inspect-plugin.ts          # createInspectPlugin()
    feature-query.ts           # queryFeatures()
    highlight.ts               # highlightFeature()
    types.ts                   # InspectPluginConfig, etc.
```

## Best Practices Summary

1. ✅ **Error Handling** - Always wrap risky operations in try-catch
2. ✅ **State Serialization** - Only store JSON-serializable values
3. ✅ **Event Naming** - Use `plugin:<id>:<event>` convention
4. ✅ **Lifecycle Awareness** - Handle map ready, style changes, etc.
5. ✅ **Dynamic Enable/Disable** - Support runtime toggling
6. ✅ **Layer Management** - Clean up layers in `onUnregister`
7. ✅ **Type Safety** - Use TypeScript types for configs and events
8. ✅ **Logging** - Use `ctx.log()` for debug/info/error messages
9. ✅ **No UI** - Keep plugins headless, UI belongs in `@mapwise/ui`
10. ✅ **Documentation** - Document plugin events, config, and behavior

## Testing

Plugins should be tested with:

- Unit tests for utilities and helpers
- Integration tests with mock map instances
- Lifecycle tests (register → use → unregister)
- Error boundary tests (verify errors don't crash system)
- Persistence tests (serialize → deserialize → verify state)

## Migration & Versioning

When updating plugins:

1. **Version** - Increment plugin version in `PluginDefinition.version`
2. **Breaking Changes** - Document in CHANGELOG
3. **State Migration** - Handle state format changes in plugin initialization
4. **Event Changes** - Document new/removed events
5. **Config Changes** - Make config changes backward compatible when possible

---

For more details, see the core architecture documentation in `@mapwise/core`.

