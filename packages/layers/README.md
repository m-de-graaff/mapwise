# @mapwise/layers

Layer implementations for MapWise.

## Philosophy

**No UI. No MapLibre coupling except where necessary. Stable LayerDefinition contracts.**

This package provides factory functions that return `LayerDefinition` objects conforming to the `@mapwise/core` contract.

## Features

- 🗺️ **WMS Layers** - Web Map Service support (OGC standard)
- 🗺️ **WMTS Layers** - Web Map Tile Service support (OGC standard)
- 📍 **GeoJSON Layers** - Point, line, and polygon features with clustering
- 🧩 **Vector Tiles** - Vector tile layers with styling
- 🗄️ **PMTiles** - Protocol buffer tiles
- 🏔️ **Terrain** - Terrain and hillshade layers
- 🏢 **3D Buildings** - 3D building layers
- 🎯 **XYZ Tiles** - Simple XYZ tile layers
- 🌐 **ArcGIS REST** - ArcGIS REST raster layer adapter
- 💾 **Persistence** - Full serialization/deserialization support
- ✅ **Validation** - Strict config validation with structured errors
- 🔄 **Migration** - Schema versioning for persisted configs

## Installation

```bash
pnpm add @mapwise/layers
```

## Usage

### Basic Example

```typescript
import { createWmsRasterLayer } from "@mapwise/layers";
import { createMap } from "@mapwise/core";

// Create a map instance
const { controller } = createMap({
  container: document.getElementById("map"),
  style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
});

// Create a WMS layer
const wmsLayer = createWmsRasterLayer({
  id: "my-wms-layer",
  baseUrl: "https://example.com/wms",
  layers: "mylayer",
  format: "image/png",
});

// Register with core
controller.layers.registerLayer(wmsLayer);
```

### Layer Persistence

All layers support serialization and deserialization for saving/restoring map state:

```typescript
import { 
  createWmsRasterLayer, 
  getLayerPersistedConfig, 
  deserializeLayer 
} from "@mapwise/layers";

// Create a layer
const layer = createWmsRasterLayer({
  id: "my-layer",
  baseUrl: "https://example.com/wms",
  layers: "mylayer",
});

// Serialize to persisted config
const persisted = getLayerPersistedConfig(layer);
console.log(JSON.stringify(persisted, null, 2));
// {
//   "_version": 1,
//   "_type": "wms-raster",
//   "id": "my-layer",
//   "baseUrl": "https://example.com/wms",
//   "layers": "mylayer",
//   ...
// }

// Later: deserialize and recreate layer
const restoredLayer = deserializeLayer(persisted);
controller.layers.registerLayer(restoredLayer);
```

### Authentication

Layers support authentication via transform callbacks:

```typescript
import { createWmsRasterLayer } from "@mapwise/layers";

const layer = createWmsRasterLayer({
  id: "authenticated-wms",
  baseUrl: "https://example.com/wms",
  layers: "mylayer",
  // Add token to tile URLs
  tileUrlTransform: (url) => {
    const parsed = new URL(url);
    parsed.searchParams.set("token", authToken);
    return parsed.toString();
  },
  // Add auth headers to capabilities requests
  requestTransform: async (url, init) => ({
    url,
    init: {
      ...init,
      headers: {
        ...init?.headers,
        "Authorization": `Bearer ${authToken}`,
      },
    },
  }),
});
```

## Layer Types

### WMS (Web Map Service)

```typescript
import { createWmsRasterLayer } from "@mapwise/layers";

const layer = createWmsRasterLayer({
  id: "wms-layer",
  baseUrl: "https://example.com/wms",
  layers: "layer1,layer2",
  format: "image/png",
  transparent: true,
  version: "1.3.0",
  crs: "EPSG:3857",
  attribution: "© Example",
});

// With capabilities discovery
import { fetchWmsCapabilities } from "@mapwise/layers";
const caps = await fetchWmsCapabilities("https://example.com/wms");
const layer2 = createWmsRasterLayer({
  id: "wms-discovered",
  baseUrl: "https://example.com/wms",
  layers: caps.layer?.layers?.[0]?.name || "default",
});
```

### WMTS (Web Map Tile Service)

```typescript
import { createWmtsRasterLayer } from "@mapwise/layers";

const layer = createWmtsRasterLayer({
  id: "wmts-layer",
  baseUrl: "https://example.com/wmts",
  layer: "mylayer",
  tileMatrixSet: "EPSG:3857",
  format: "image/png",
});

// With capabilities discovery
import { fetchWmtsCapabilities } from "@mapwise/layers";
const caps = await fetchWmtsCapabilities("https://example.com/wmts");
```

### XYZ Tiles

```typescript
import { createXyzRasterLayer } from "@mapwise/layers";

const layer = createXyzRasterLayer({
  id: "xyz-layer",
  tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  minzoom: 0,
  maxzoom: 18,
  attribution: "© OpenStreetMap contributors",
});

// With subdomains for load balancing
const layer2 = createXyzRasterLayer({
  id: "xyz-subdomains",
  tiles: "https://{s}.tile.example.com/{z}/{x}/{y}.png",
  subdomains: ["a", "b", "c", "d"],
  tileSize: 512,
});
```

### ArcGIS REST Raster

```typescript
import { createArcGisRestRasterLayer } from "@mapwise/layers";

const layer = createArcGisRestRasterLayer({
  id: "arcgis-layer",
  serviceUrl: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
  layerId: 0,
  format: "png32",
  transparent: true,
});

// With authentication
const authenticatedLayer = createArcGisRestRasterLayer({
  id: "arcgis-auth",
  serviceUrl: "https://example.com/arcgis/rest/services/MyLayer/MapServer",
  tileUrlTransform: (url) => {
    const parsed = new URL(url);
    parsed.searchParams.set("token", authToken);
    return parsed.toString();
  },
});
```

### GeoJSON

```typescript
import { createGeoJsonLayer } from "@mapwise/layers";

const layer = await createGeoJsonLayer({
  id: "geojson-layer",
  data: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: { name: "Point 1" },
      },
    ],
  },
  cluster: true,
  clusterRadius: 50,
  clusterMaxZoom: 14,
});

// With URL data source
const layer2 = await createGeoJsonLayer({
  id: "geojson-url",
  data: "https://example.com/data.geojson",
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
import { createTerrainLayer, enableTerrain } from "@mapwise/layers";

const layer = createTerrainLayer({
  id: "terrain-layer",
  source: "mapbox://mapbox.mapbox-terrain-dem-v1",
  exaggeration: 1.5,
});

// Enable terrain on the map
enableTerrain(controller.map, layer.id);
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

All factory functions return a `LayerDefinition` that can be registered with `@mapwise/core`:

- `createWmsRasterLayer(config)` - Create WMS raster layer
- `createWmtsRasterLayer(config)` - Create WMTS raster layer
- `createXyzRasterLayer(config)` - Create XYZ/TMS raster layer
- `createArcGisRestRasterLayer(config)` - Create ArcGIS REST raster layer
- `createGeoJsonLayer(config)` - Create GeoJSON layer (async)
- `createVectorTileLayer(config)` - Create vector tile layer
- `createPmtilesLayer(config)` - Create PMTiles layer
- `createTerrainLayer(config)` - Create terrain layer
- `createBuildings3dLayer(config)` - Create 3D buildings layer

### Persistence Utilities

- `getLayerPersistedConfig(layer)` - Get persisted config from a layer
- `deserializeLayer(persisted)` - Deserialize persisted config to layer
- `toWmsPersistedConfig(config)` - Serialize WMS config
- `fromWmsPersistedConfig(persisted)` - Deserialize WMS config
- `validateWmsPersistedConfig(persisted)` - Validate WMS persisted config
- (Similar functions for XYZ, ArcGIS, and other layer types)

### Capabilities Utilities

- `fetchWmsCapabilities(url, options?)` - Fetch WMS capabilities (supports auth via `requestTransform`)
- `parseWmsCapabilities(doc)` - Parse WMS capabilities XML
- `fetchWmtsCapabilities(url, options?)` - Fetch WMTS capabilities
- `parseWmtsCapabilities(doc)` - Parse WMTS capabilities XML

### URL Builder Utilities

- `buildWmsTileUrl(params)` - Build WMS GetMap URL
- `buildWmsLegendUrl(params)` - Build WMS GetLegendGraphic URL
- `buildArcGisExportUrl(params)` - Build ArcGIS REST Export URL

### Validation Utilities

- `validateBaseLayerConfig(config)` - Validate base layer config
- Layer-specific validators: `validateWmsConfig`, `validateXyzConfig`, etc.

### Selection Utilities (WMTS)

- `selectTileMatrixSet(capabilities, options)` - Select appropriate tile matrix set
- `selectFormat(capabilities, options)` - Select format
- `selectStyle(capabilities, options)` - Select style
- `selectResourceUrl(capabilities, options)` - Select resource URL

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

## Persistence

All layers support full serialization/deserialization for saving and restoring map state:

```typescript
import { getLayerPersistedConfig, deserializeLayer } from "@mapwise/layers";

// Save layer config
const layer = createWmsRasterLayer({ /* ... */ });
const persisted = getLayerPersistedConfig(layer);
localStorage.setItem("my-layer", JSON.stringify(persisted));

// Restore layer config
const saved = JSON.parse(localStorage.getItem("my-layer")!);
const restoredLayer = deserializeLayer(saved);
controller.layers.registerLayer(restoredLayer);
```

### Schema Versioning

Persisted configs include schema versioning for migration support:

```typescript
const persisted = {
  _version: 1,           // Schema version
  _type: "wms-raster",   // Layer type
  id: "my-layer",
  // ... layer-specific fields
};
```

## Performance

MapWise layers are optimized for performance:

- **No duplicate sources/layers**: Core registry checks if sources/layers exist before adding
- **Efficient updates**: Visibility/opacity changes only update specific properties, not full layer recreation
- **Batched operations**: Layer operations are batched to prevent excessive map updates
- **Stable IDs**: Source and layer IDs are stable across layer updates

## Architecture

See [LAYERS_ARCHITECTURE.md](./LAYERS_ARCHITECTURE.md) for detailed architecture documentation.

## Contributing

See [HOW_TO_IMPLEMENT_LAYER.md](./HOW_TO_IMPLEMENT_LAYER.md) for a guide on implementing new layer kinds.

See [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) for the checklist all layers must meet.

## License

MIT

