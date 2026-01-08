# Contributing to MapWise

Thank you for your interest in contributing to MapWise! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Adding Changesets](#adding-changesets)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mapwise.git
   cd mapwise
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Build all packages:
   ```bash
   pnpm build
   ```

## Development Workflow

### Available Scripts

| Command               | Description                          |
| --------------------- | ------------------------------------ |
| `pnpm build`          | Build all packages                   |
| `pnpm dev`            | Start development mode               |
| `pnpm lint`           | Run Biome linter                     |
| `pnpm lint:fix`       | Fix linting issues                   |
| `pnpm format`         | Format code with Biome               |
| `pnpm typecheck`      | Run TypeScript type checking         |
| `pnpm clean`          | Clean build artifacts                |
| `pnpm changeset`      | Add a changeset for your changes     |

### Working on Packages

Each package is located in the `packages/` directory. To work on a specific package:

```bash
cd packages/core
pnpm dev
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes that don't modify src or test files

### Examples

```
feat(core): add new mapping function
fix(utils): handle edge case in isDefined
docs: update contributing guidelines
chore: update dependencies
```

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes and commit following the commit guidelines

3. Add a changeset if your changes affect published packages:
   ```bash
   pnpm changeset
   ```

4. Push your branch and open a Pull Request

5. Ensure all CI checks pass

6. Request review from maintainers

7. Address any feedback

8. Once approved, your PR will be merged

## Coding Standards

### TypeScript

- Enable strict mode
- Avoid `any` types - use `unknown` when type is uncertain
- Prefer interfaces over type aliases for object shapes
- Document public APIs with JSDoc comments

### Formatting

We use Biome for formatting and linting. The configuration is in `biome.json`:

- Tabs for indentation
- Double quotes for strings
- Trailing commas
- Semicolons required

Run `pnpm lint:fix` to auto-fix issues.

### File Naming

- Use `kebab-case` for file names
- Use `PascalCase` for React components
- Use `.ts` for TypeScript files, `.tsx` for React components

## Adding Changesets

For any changes that affect published packages, you need to add a changeset:

```bash
pnpm changeset
```

This will prompt you to:
1. Select the packages affected
2. Choose the type of version bump (patch, minor, major)
3. Write a summary of the changes

Changesets are consumed during the release process to update package versions and generate changelogs.

### When to Add a Changeset

- ✅ New features
- ✅ Bug fixes
- ✅ Breaking changes
- ✅ Performance improvements
- ❌ Documentation-only changes
- ❌ Internal refactoring with no public API changes
- ❌ CI/build configuration changes

## Questions?

If you have questions, feel free to:
- Open a Discussion on GitHub
- Check existing issues and PRs
- Read the documentation

Thank you for contributing! 🎉

