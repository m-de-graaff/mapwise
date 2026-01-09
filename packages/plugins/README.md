# @mapwise/plugins

Interactive plugins for MapWise. These plugins provide headless interaction capabilities that can be used by UI components.

## Philosophy

**Headless. No UI. Framework-agnostic. Safe, isolated, and composable.**

Plugins extend MapWise with interactive features while remaining decoupled from UI frameworks. UI components in `@mapwise/ui` consume plugin state and events.

## Installation

```bash
pnpm add @mapwise/plugins
```

## Quick Start

```typescript
import { createMap } from '@mapwise/core';
import { createInspectPlugin } from '@mapwise/plugins';

const { controller } = createMap({
  container: document.getElementById('map'),
  style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
});

// Register a plugin
await controller.plugins.register(
  createInspectPlugin({
    enabled: true,
    cursor: 'pointer',
  })
);

// Listen to plugin events
controller.events.on('plugin:@mapwise/inspect:featureClick', (payload) => {
  console.log('Feature clicked:', payload);
});
```

## Available Plugins

### Inspect Plugin

Inspect and query map features.

```typescript
import { createInspectPlugin } from '@mapwise/plugins';

const plugin = createInspectPlugin({
  enabled: true,
  cursor: 'pointer',
  highlightColor: '#ff0000',
  showPopup: true,
});

await controller.plugins.register(plugin);
```

**Events:**
- `plugin:@mapwise/inspect:featureClick` - Fired when a feature is clicked
- `plugin:@mapwise/inspect:featureHover` - Fired when a feature is hovered
- `plugin:@mapwise/inspect:featureLeave` - Fired when mouse leaves a feature

### Draw Plugin

Draw features on the map (points, lines, polygons).

```typescript
import { createDrawPlugin } from '@mapwise/plugins';

const plugin = createDrawPlugin({
  enabled: true,
  cursor: 'crosshair',
  mode: 'polygon',
  snapTolerance: 10,
});

await controller.plugins.register(plugin);
```

**Events:**
- `plugin:@mapwise/draw:featureComplete` - Fired when drawing is complete
- `plugin:@mapwise/draw:featureCancel` - Fired when drawing is cancelled
- `plugin:@mapwise/draw:featureDelete` - Fired when a feature is deleted

### Measure Plugin

Measure distances and areas on the map.

```typescript
import { createMeasurePlugin } from '@mapwise/plugins';

const plugin = createMeasurePlugin({
  enabled: true,
  cursor: 'crosshair',
  mode: 'distance', // or 'area'
  unit: 'meters',
});

await controller.plugins.register(plugin);
```

**Events:**
- `plugin:@mapwise/measure:measurementComplete` - Fired when measurement is complete
- `plugin:@mapwise/measure:measurementClear` - Fired when measurements are cleared

## Plugin Configuration

All plugins extend `BasePluginConfig`:

```typescript
interface BasePluginConfig {
  enabled?: boolean;              // Enable/disable plugin
  hotkeys?: Record<string, string>;  // Keyboard shortcuts
  cursor?: string;                // CSS cursor when active
}
```

### Keyboard Shortcuts

Plugins can define keyboard shortcuts:

```typescript
const plugin = createDrawPlugin({
  enabled: true,
  hotkeys: {
    activate: 'd',           // Press 'd' to activate
    cancel: 'Escape',        // Press Escape to cancel
    delete: 'Delete',        // Press Delete to delete selected
    undo: 'Ctrl+z',         // Ctrl+Z to undo
    redo: 'Ctrl+Shift+z',   // Ctrl+Shift+Z to redo
  },
});
```

### Cursor Styles

Set the cursor when plugin is active:

```typescript
const plugin = createInspectPlugin({
  cursor: 'pointer',      // Default for selection tools
});

const drawPlugin = createDrawPlugin({
  cursor: 'crosshair',    // Default for drawing tools
});
```

Common cursor values:
- `'pointer'` - For selection/inspection
- `'crosshair'` - For drawing/measurement
- `'grab'` / `'grabbing'` - For pan tools
- `'zoom-in'` / `'zoom-out'` - For zoom tools
- `'wait'` - For loading states

## Plugin Events

Plugins emit events following the convention: `plugin:<plugin-id>:<event-name>`

### Listening to Events

```typescript
import { createPluginEventName } from '@mapwise/plugins';

// Using the helper
const eventName = createPluginEventName('@mapwise/inspect', 'featureClick');
controller.events.on(eventName, (payload) => {
  console.log('Feature clicked:', payload);
});

// Or directly
controller.events.on('plugin:@mapwise/inspect:featureClick', (payload) => {
  console.log('Feature clicked:', payload);
});
```

### Type-Safe Events

```typescript
import type { PluginEventNames } from '@mapwise/plugins';

type InspectEvents = PluginEventNames<
  '@mapwise/inspect',
  'featureClick' | 'featureHover' | 'featureLeave'
>;
```

## Plugin Lifecycle

Plugins go through a well-defined lifecycle:

1. **Registration** - Plugin is registered with `controller.plugins.register()`
2. **Initialization** - `onRegister` hook is called
3. **Map Ready** - `onMapReady` hook is called when map is ready
4. **Active** - Plugin is active and handling events
5. **Unregistration** - Plugin is unregistered with `controller.plugins.unregister()`
6. **Cleanup** - `onUnregister` hook is called

Plugins automatically handle:
- ✅ Style/basemap changes (hooks called, state preserved)
- ✅ Map destruction (cleanup called)
- ✅ Error isolation (errors don't crash other plugins)

## Plugin State

Plugins can store state that persists across style changes:

```typescript
// In plugin implementation
onRegister(ctx) {
  ctx.state.set('active', false);
  ctx.state.set('mode', 'distance');
  ctx.state.set('measurements', []);
}

onMapReady(ctx) {
  // State is preserved after style changes
  const measurements = ctx.state.get<Measurement[]>('measurements');
  if (measurements) {
    restoreMeasurements(ctx, measurements);
  }
}
```

**Note:** Only JSON-serializable values can be stored (no functions, DOM elements, etc.).

## Creating Custom Plugins

See [PLUGINS_ARCHITECTURE.md](./PLUGINS_ARCHITECTURE.md) for detailed guidance on creating plugins.

Basic example:

```typescript
import type { PluginDefinition, PluginContext } from '@mapwise/core';
import type { BasePluginConfig, PluginFactory } from '@mapwise/plugins';

interface MyPluginConfig extends BasePluginConfig {
  myOption?: string;
}

export const createMyPlugin: PluginFactory<MyPluginConfig> = (config) => {
  return {
    id: '@myorg/my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    
    onRegister(ctx: PluginContext) {
      ctx.log('info', 'My plugin registered');
      ctx.state.set('enabled', config.enabled ?? true);
      
      // Setup event handlers
      ctx.map.on('click', handleClick);
      
      // Return cleanup function
      return () => {
        ctx.map.off('click', handleClick);
      };
    },
    
    onMapReady(ctx: PluginContext) {
      ctx.log('info', 'Map ready, initializing plugin');
    },
    
    onUnregister(ctx: PluginContext) {
      ctx.log('info', 'My plugin unregistered');
    },
  };
};
```

## Architecture

See [PLUGINS_ARCHITECTURE.md](./PLUGINS_ARCHITECTURE.md) for:
- What plugins can and cannot do
- Lifecycle rules
- Error boundaries
- Persistence expectations
- Event naming conventions
- Best practices

## Requirements

- `@mapwise/core` - Core mapping engine (workspace dependency)
- `maplibre-gl` ^5.0.0 - MapLibre GL JS (peer dependency)

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## License

MIT

