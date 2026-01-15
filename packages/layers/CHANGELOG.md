# @mapwise/layers

## 1.0.7

### Patch Changes

- Fix "callback is not a function" runtime error in `wmts-protocol.ts` by updating the adapter to match MapLibre GL JS v5 Promise-based signature.

## 1.0.6

### Patch Changes

- e0e09fe: - Fix "ResizeObserver loop completed with undelivered notifications" error by adding dimension guards and using requestAnimationFrame.
  - Implement custom `wmts://` protocol handler to support non-standard WMTS tile matrices in `createWmtsRasterLayer`.
- Updated dependencies [e0e09fe]
  - @mapwise/core@1.0.6

## 1.0.5

### Patch Changes

- Updated dependencies
  - @mapwise/core@1.0.5

## 1.0.4

### Patch Changes

- 6103a86: fix: resolve ESM import extensions and strict type errors across all packages
- Updated dependencies [6103a86]
  - @mapwise/core@1.0.4

## 1.0.3

### Patch Changes

- Updated dependencies
  - @mapwise/core@1.0.3

## 1.0.2

### Patch Changes

- Updated dependencies
  - @mapwise/core@1.0.2

## 1.0.1

### Patch Changes

- Release update.
- Updated dependencies
  - @mapwise/core@1.0.1

## 1.0.0

### Major Changes

- c9310e9: Initial v1.0.0 stable release.

### Patch Changes

- Updated dependencies [c9310e9]
  - @mapwise/core@1.0.0
