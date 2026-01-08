# @mapwise/layers

Layer implementations for MapWise.

## Philosophy

**No UI. No MapLibre coupling except where necessary. Stable LayerDefinition contracts.**

This package provides factory functions that return `LayerDefinition` objects conforming to the `@mapwise/core` contract.

## Features

- 🗺️ **WMS Layers** - Web Map Service support
- 🗺️ **WMTS Layers** - Web Map Tile Service support
- 📍 **GeoJSON Layers** - Point, line, and polygon features with clustering
- 🧩 **Vector Tiles** - Vector tile layers
- 🗄️ **PMTiles** - Protocol buffer tiles
- 🏔️ **Terrain** - Terrain and hillshade layers
- 🏢 **3D Buildings** - 3D building layers
- 🎯 **XYZ Tiles** - Simple XYZ tile layers

## Installation

```bash
pnpm add @mapwise/layers
```

## Usage

### Basic Example

```typescript
import { createWmsLayer } from "@mapwise/layers";
import { layerRegistry } from "@mapwise/core";

// Create a WMS layer
const wmsLayer = createWmsLayer({
  id: "my-wms-layer",
  url: "https://example.com/wms",
  layers: "mylayer",
  format: "image/png",
});

// Register with core
layerRegistry.registerLayer(wmsLayer);
```

### GeoJSON Layer

```typescript
import { createGeoJsonLayer } from "@mapwise/layers";

const geojsonLayer = createGeoJsonLayer({
  id: "my-features",
  data: {
    type: "FeatureCollection",
    features: [
      // ... features
    ],
  },
  cluster: true,
  clusterRadius: 50,
});

layerRegistry.registerLayer(geojsonLayer);
```

### Vector Tiles

```typescript
import { createVectorTileLayer } from "@mapwise/layers";

const vectorTileLayer = createVectorTileLayer({
  id: "my-vector-tiles",
  url: "https://example.com/tiles/{z}/{x}/{y}.pbf",
  layers: ["roads", "buildings"],
});

layerRegistry.registerLayer(vectorTileLayer);
```

## Layer Types

### WMS (Web Map Service)

```typescript
import { createWmsLayer } from "@mapwise/layers";

const layer = createWmsLayer({
  id: "wms-layer",
  url: "https://example.com/wms",
  layers: "layer1,layer2",
  format: "image/png",
  transparent: true,
  attribution: "© Example",
});
```

### WMTS (Web Map Tile Service)

```typescript
import { createWmtsLayer } from "@mapwise/layers";

const layer = createWmtsLayer({
  id: "wmts-layer",
  url: "https://example.com/wmts",
  layer: "mylayer",
  tileMatrixSet: "EPSG:3857",
  format: "image/png",
});
```

### GeoJSON

```typescript
import { createGeoJsonLayer } from "@mapwise/layers";

const layer = createGeoJsonLayer({
  id: "geojson-layer",
  data: geojsonData,
  cluster: true,
  clusterRadius: 50,
  clusterMaxZoom: 14,
});
```

### Vector Tiles

```typescript
import { createVectorTileLayer } from "@mapwise/layers";

const layer = createVectorTileLayer({
  id: "vector-tile-layer",
  url: "https://example.com/tiles/{z}/{x}/{y}.pbf",
  layers: ["roads", "buildings"],
  minzoom: 0,
  maxzoom: 14,
});
```

### PMTiles

```typescript
import { createPmtilesLayer } from "@mapwise/layers";

const layer = createPmtilesLayer({
  id: "pmtiles-layer",
  url: "https://example.com/tiles.pmtiles",
  type: "raster", // or "vector"
});
```

### Terrain

```typescript
import { createTerrainLayer } from "@mapwise/layers";

const layer = createTerrainLayer({
  id: "terrain-layer",
  source: "mapbox://mapbox.mapbox-terrain-dem-v1",
  exaggeration: 1.5,
});
```

### 3D Buildings

```typescript
import { createBuildings3dLayer } from "@mapwise/layers";

const layer = createBuildings3dLayer({
  id: "buildings-3d",
  source: "composite",
  sourceLayer: "building",
  minzoom: 15,
});
```

### XYZ Tiles

```typescript
import { createXyzLayer } from "@mapwise/layers";

const layer = createXyzLayer({
  id: "xyz-layer",
  url: "https://example.com/tiles/{z}/{x}/{y}.png",
  minzoom: 0,
  maxzoom: 18,
});
```

## Capabilities Support

WMS and WMTS layers support fetching and parsing capabilities:

```typescript
import { fetchWmsCapabilities, parseWmsCapabilities } from "@mapwise/layers";

const capabilities = await fetchWmsCapabilities("https://example.com/wms?request=GetCapabilities");
const parsed = parseWmsCapabilities(capabilities);

console.log(parsed.layers); // Available layers
console.log(parsed.formats); // Supported formats
```

## Validation

All layers support configuration validation:

```typescript
import { validateBaseLayerConfig } from "@mapwise/layers/shared";

const result = validateBaseLayerConfig(config);
if (!result.valid) {
  console.error(result.errors);
}
```

## Architecture

See [LAYERS_ARCHITECTURE.md](./LAYERS_ARCHITECTURE.md) for detailed architecture documentation.

## API Reference

### Factory Functions

- `createWmsLayer(config)` - Create WMS layer
- `createWmtsLayer(config)` - Create WMTS layer
- `createGeoJsonLayer(config)` - Create GeoJSON layer
- `createVectorTileLayer(config)` - Create vector tile layer
- `createPmtilesLayer(config)` - Create PMTiles layer
- `createTerrainLayer(config)` - Create terrain layer
- `createBuildings3dLayer(config)` - Create 3D buildings layer
- `createXyzLayer(config)` - Create XYZ tile layer

### Utilities

- `fetchWmsCapabilities(url)` - Fetch WMS capabilities
- `parseWmsCapabilities(doc)` - Parse WMS capabilities
- `fetchWmtsCapabilities(url)` - Fetch WMTS capabilities
- `parseWmtsCapabilities(doc)` - Parse WMTS capabilities
- `validateBaseLayerConfig(config)` - Validate base layer config

## Requirements

- `@mapwise/core` - Core mapping engine
- `maplibre-gl` ^5.0.0 - MapLibre GL JS

