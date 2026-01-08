# MapWise

A modern, type-safe mapping library for JavaScript and TypeScript.

## 📦 Packages

| Package | Description | Version |
| ------- | ----------- | ------- |
| [@mapwise/core](./packages/core) | Core mapping functionality | ![npm](https://img.shields.io/npm/v/@mapwise/core) |
| [@mapwise/layers](./packages/layers) | Layer components | ![npm](https://img.shields.io/npm/v/@mapwise/layers) |
| [@mapwise/plugins](./packages/plugins) | Plugin system | ![npm](https://img.shields.io/npm/v/@mapwise/plugins) |
| [@mapwise/ui](./packages/ui) | UI components | ![npm](https://img.shields.io/npm/v/@mapwise/ui) |

## 📁 Structure

```
├─ .github/
│  ├─ workflows/
│  │  ├─ ci.yml
│  │  └─ release.yml
│  ├─ ISSUE_TEMPLATE/
│  └─ PULL_REQUEST_TEMPLATE.md
│
├─ .changeset/
│  └─ README.md
│
├─ packages/
│  ├─ core/
│  ├─ layers/
│  ├─ plugins/
│  └─ ui/
│
├─ apps/
│  ├─ docs/
│  └─ demo/
│
├─ biome.json
├─ tsconfig.json
├─ tsconfig.base.json
├─ package.json
├─ pnpm-workspace.yaml
├─ README.md
└─ CONTRIBUTING.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/mapwise/mapwise.git
cd mapwise

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## 🛠️ Development

```bash
# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check
pnpm typecheck

# Build all packages
pnpm build

# Start development mode
pnpm dev

# Clean build artifacts
pnpm clean
```

## 📝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 🔄 Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

```bash
# Add a changeset after making changes
pnpm changeset

# Version packages (CI usually handles this)
pnpm version-packages

# Publish packages (CI usually handles this)
pnpm release
```

## 📄 License

MIT © MapWise Contributors
