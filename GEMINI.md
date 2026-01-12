# Mapwise Project Documentation

This document provides a high-level overview of the Mapwise monorepo structure, package responsibilities, and available developer tools for debugging.

## 📦 Packages (`packages/`)

Mapwise is organized as a monorepo with the following core packages:

### `@mapwise/core`
**Location:** `packages/core`
The foundation of the Mapwise architecture. It contains:
- **MapController**: The central brain that manages the map state, interactions, and events.
- **LayerRegistry**: Handles layer registration, ordering, and state management.
- **EventBus**: A type-safe event system for communication between components.
- **React Hooks**: Essential React bindings like `useMap`, `useLayerState`, and `MapProvider`.

### `@mapwise/ui`
**Location:** `packages/ui`
A comprehensive UI component library built with React and Tailwind CSS.
- **Components**: `MapShell`, `MapToolbar`, `LayerPanel`, `AddLayerDialog`.
- **Hooks**: UI-specific hooks like `useLayerActions` and `useLayerList` for managing UI interaction with the core.
- **Styling**: Contains the standardized design system and ShadCN/UI wrappers.

### `@mapwise/plugins`
**Location:** `packages/plugins`
Extensible functionality modules that plug into the core controller.
- **Features**: Drawing, Measuring, Snapshot tools.
- **Architecture**: Defines the `Plugin` interface and event patterns for extending map capabilities.

### `@mapwise/layers`
**Location:** `packages/layers`
Specific layer implementations and utilities.
- **Layer Types**: Logic for properly rendering WMS, WMTS, GeoJSON, and other layer formats.
- **Helpers**: Type definitions and transformations for layer configurations.

---

## 🚀 Applications (`apps/`)

### `demo-nextjs`
**Location:** `apps/demo-nextjs`
The primary demonstration application built with Next.js 14+ (App Router).
- Showcases full integration of all packages.
- Features routing examples (`/layers`, `/gis`, `/`).
- Used for verifying Server-Side Rendering (SSR) compatibility.

### `demo-react`
**Location:** `apps/demo-react`
A pure Vite + React Single Page Application (SPA).
- Provides a simpler testing ground without Next.js framework complexity.
- Validates the library's usage in standard React setups.

### `docs`
**Location:** `apps/docs`
Project documentation site.

---

## 🛠️ Developer Tools & Debugging

When running the applications in development mode (e.g., `pnpm dev`), the following tools are exposed globally for debugging purposes.

### Map Access
We expose the internal map controller and instance to the global `window` object to allow easy manipulation from the browser console.

#### `window.getDebugMap()`
Returns the underlying MapLibre GL JS map instance.
**Usage:**
```javascript
// Pan to Washington DC
window.getDebugMap().flyTo({ center: [-77.0369, 38.9072], zoom: 11 });

// Check current zoom
window.getDebugMap().getZoom();

// Inspect style
console.log(window.getDebugMap().getStyle());
```

#### `window.__mapwise`
Access the full `MapController` instance.
**Usage:**
```javascript
// Register a new layer manually
window.__mapwise.layers.registerLayer({ ... });

// Set map pitch via controller
window.__mapwise.setPitch(45);

// Inspect registered layers
console.log(window.__mapwise.layers.getLayers());
```

---

## 💡 Common Workflows

### Adding a New Layer Type
1. Define the layer logic in `@mapwise/layers`.
2. Create a configuration form in `@mapwise/ui/src/dialogs`.
3. Update `AddLayerDialog` in `@mapwise/ui` to include the new form.

### Creating a Plugin
1. Create a new directory in `@mapwise/plugins/src`.
2. Implement the `MapwisePlugin` interface.
3. Register the plugin in your app using `controller.plugins.add()`.
