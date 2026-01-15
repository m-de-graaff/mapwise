---
"@mapwise/core": patch
"@mapwise/layers": patch
---

- Fix "ResizeObserver loop completed with undelivered notifications" error by adding dimension guards and using requestAnimationFrame.
- Implement custom `wmts://` protocol handler to support non-standard WMTS tile matrices in `createWmtsRasterLayer`.
