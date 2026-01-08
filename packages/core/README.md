# @mapwise/core

Headless map engine for MapWise.

## Philosophy

**No UI. No shadcn. No DOM assumptions except the map container.**

This package provides the core engine for map management without any UI opinions.

## Features

- 🗺️ **Map Management** - Create, destroy, and manage MapLibre instances
- 📦 **Layer Registry** - Add, remove, reorder, and serialize layers
- 🔌 **Plugin System** - Extensible plugin architecture
- 🎯 **Event Bus** - Typed pub/sub for internal communication
- ⚛️ **React Bindings** - Context and hooks for React integration
- 💾 **Persistence** - Serialize and hydrate map state

## Installation

```bash
pnpm add @mapwise/core
```

## Usage

### Vanilla TypeScript

```typescript
import { createMap, layerRegistry, eventBus } from "@mapwise/core";

// Create map
const container = document.getElementById("map");
const map = createMap(container, {
  style: "https://demotiles.maplibre.org/style.json",
  center: [0, 0],
  zoom: 2,
});

// Add a layer
layerRegistry.add({
  type: "geojson",
  name: "My Layer",
  visible: true,
  opacity: 1,
  data: myGeoJson,
});

// Listen to events
eventBus.on("layer:added", ({ layer }) => {
  console.log("Layer added:", layer.name);
});
```

### React

```tsx
import { MapProvider, useMap, useLayerState } from "@mapwise/core";

function App() {
  return (
    <MapProvider options={{ style: "..." }}>
      <LayerPanel />
    </MapProvider>
  );
}

function LayerPanel() {
  const { ready } = useMap();
  const { layers } = useLayerState();

  if (!ready) return <div>Loading...</div>;

  return (
    <ul>
      {layers.map((layer) => (
        <li key={layer.id}>{layer.name}</li>
      ))}
    </ul>
  );
}
```

## API Reference

### Map

- `createMap(container, options)` - Create a new map instance
- `destroyMap()` - Destroy the current map
- `mapStore` - Non-reactive state store
- `styleManager` - Basemap style management
- `flyTo(center, options)` - Fly to a location
- `fitBounds(bounds, options)` - Fit to bounds

### Registry

- `layerRegistry` - Layer management
- `pluginRegistry` - Plugin lifecycle

### Events

- `eventBus.on(event, handler)` - Subscribe to events
- `eventBus.emit(event, payload)` - Emit events

### React

- `<MapProvider>` - Context provider
- `useMap()` - Access map instance
- `useMapReady()` - Track ready state
- `useLayerState()` - Reactive layer state

### Persistence

- `serialize()` - Export state
- `hydrate(state)` - Restore state



