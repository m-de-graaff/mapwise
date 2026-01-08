# @mapwise/core — Allowed Dependencies

> Minimal, audited, purpose-driven dependencies only.

---

## Philosophy

Every dependency is a liability:
- Security surface area
- Bundle size impact
- Maintenance burden
- API coupling risk

We follow the principle: **If we can reasonably implement it, we don't depend on it.**

---

## Dependency Classification

### 🟢 Production Dependencies

Dependencies that ship to users.

| Package | Purpose | Justification |
|---------|---------|---------------|
| `maplibre-gl` | Map rendering engine | Core functionality, cannot replicate |

**Current count: 1**

### 🟡 Peer Dependencies

Dependencies users must provide.

| Package | Purpose | Required? |
|---------|---------|-----------|
| `react` | React adapter bindings | Optional |
| `maplibre-gl` | Map rendering | Required |

### 🔵 Development Dependencies

Dependencies for development only. Never shipped.

| Package | Purpose |
|---------|---------|
| `typescript` | Type checking |
| `@types/react` | React type definitions |
| `@types/geojson` | GeoJSON type definitions |
| `vitest` | Unit testing |
| `rimraf` | Build cleanup |

---

## Approval Criteria

New production dependencies must meet ALL criteria:

### 1. Necessity Check

- [ ] Cannot reasonably implement ourselves
- [ ] Provides significant, irreplaceable value
- [ ] Not a convenience-only addition

### 2. Quality Check

- [ ] Actively maintained (commits in last 6 months)
- [ ] No critical security vulnerabilities
- [ ] Reasonable bundle size for value provided
- [ ] TypeScript types available
- [ ] Compatible with our supported Node/browser versions

### 3. Stability Check

- [ ] Follows semantic versioning
- [ ] Has predictable release cadence
- [ ] No history of frequent breaking changes
- [ ] Used by other major projects

### 4. Alternatives Check

- [ ] No lighter-weight alternatives available
- [ ] No built-in browser/Node APIs that suffice
- [ ] Considered extracting just the needed functionality

---

## Explicitly Forbidden

The following categories are **never allowed** as dependencies:

### UI Libraries

```
❌ react (except as peer dep for react/ adapters)
❌ vue, svelte, solid, angular
❌ shadcn, radix, headless-ui, chakra
❌ Any component library
```

### CSS/Styling

```
❌ tailwindcss
❌ styled-components, emotion
❌ sass, less
❌ Any CSS-in-JS solution
```

### State Management

```
❌ redux, zustand, jotai, recoil
❌ mobx, valtio
❌ Any external state library
```

We manage our own state. Simplicity over features.

### Utility Libraries

```
❌ lodash (use native methods)
❌ underscore
❌ ramda
```

Bundle size impact is not justified for utilities we can write.

### HTTP Clients

```
❌ axios
❌ got, ky
```

Use native `fetch`. It's 2024+.

### Date Libraries

```
❌ moment (deprecated anyway)
❌ dayjs, date-fns
```

Use native `Date` and `Intl`.

---

## Allowed Utility Patterns

Instead of dependencies, use these patterns:

### Collections

```typescript
// ❌ Don't
import { groupBy } from 'lodash';

// ✅ Do
function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
```

### Deep Clone

```typescript
// ❌ Don't
import { cloneDeep } from 'lodash';

// ✅ Do
const clone = structuredClone(original);
```

### Debounce/Throttle

```typescript
// ❌ Don't
import { debounce } from 'lodash';

// ✅ Do (we have src/utils/debounce.ts)
import { debounce } from '../utils/debounce';
```

### UUIDs

```typescript
// ❌ Don't
import { v4 as uuid } from 'uuid';

// ✅ Do
const id = crypto.randomUUID();
```

---

## GeoJSON Handling

GeoJSON is the exception where we rely on types but not runtime dependencies:

```typescript
// ✅ Types only - no runtime cost
import type { FeatureCollection, Feature, Geometry } from 'geojson';
```

For GeoJSON operations:
- Simple operations: implement ourselves
- Complex operations (turf): defer to consuming code or plugins

---

## Adding a Dependency

Process for adding a new dependency:

1. **Propose**: Open issue with justification
2. **Discuss**: Team reviews against criteria
3. **Audit**: Security and bundle size audit
4. **Approve**: Requires maintainer approval
5. **Document**: Add to this file with justification

---

## Bundle Size Budget

| Category | Budget | Current |
|----------|--------|---------|
| Core (no deps) | < 10 KB | ~5 KB |
| With MapLibre | < 500 KB | ~450 KB |

MapLibre is the majority of bundle size. Core code must stay lean.

---

## Auditing Dependencies

Regular dependency audits:

```bash
# Check for vulnerabilities
pnpm audit

# Check for outdated deps
pnpm outdated

# Analyze bundle size
pnpm build && npx source-map-explorer dist/index.js
```

---

## Current package.json

For reference, here's what's allowed:

```json
{
  "dependencies": {
    // Intentionally empty - MapLibre is a peer dep
  },
  "peerDependencies": {
    "maplibre-gl": "^5.0.0",
    "react": "^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true }
  },
  "devDependencies": {
    "@types/geojson": "^7946.0.16",
    "@types/react": "^19.0.0",
    "rimraf": "^6.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.x"
  }
}
```

---

## Questions?

If unsure whether a dependency is allowed, ask:

1. Can we implement this in < 50 lines?
2. Is this solving a problem users have, or a problem we created?
3. Will this still be maintained in 5 years?

When in doubt, don't add it.

