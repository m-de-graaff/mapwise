# @mapwise/core

## 1.0.6

### Patch Changes

- e0e09fe: - Fix "ResizeObserver loop completed with undelivered notifications" error by adding dimension guards and using requestAnimationFrame.
  - Implement custom `wmts://` protocol handler to support non-standard WMTS tile matrices in `createWmtsRasterLayer`.

## 1.0.5

### Patch Changes

- Fix ResizeObserver loop error by deferring resize callback to next animation frame

  Wrapped the ResizeObserver callback in `requestAnimationFrame` to prevent "ResizeObserver loop completed with undelivered notifications" errors that occurred when the map resize triggered additional layout changes within the same frame.

## 1.0.4

### Patch Changes

- 6103a86: fix: resolve ESM import extensions and strict type errors across all packages

## 1.0.3

### Patch Changes

- Fix lint errors in useMapEvents.ts (noForEach, noExplicitAny)

## 1.0.2

### Patch Changes

- Relax React peer dependencies to support ^18.0.0 || ^19.0.0

## 1.0.1

### Patch Changes

- Release update.

## 1.0.0

### Major Changes

- c9310e9: Initial v1.0.0 stable release.
