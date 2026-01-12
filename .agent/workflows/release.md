---
description: Workflow for releasing packages to npm
---

# Release Workflow

This workflow guides you through updating package versions and publishing to npm.

## 1. Create a Changeset
If you have made code changes that need to be released, you need to create a "changeset" file.
Run the following command and follow the interactive prompts:
```bash
pnpm changeset
```
- Select the packages you modified.
- Choose `patch` for bug fixes, `minor` for new features, `major` for breaking changes.
- Enter a brief summary of the changes.

## 2. Version Packages
Once you are ready to apply the version updates (bumping package.json versions), run:
```bash
// turbo
pnpm version-packages
```
This command:
- Reads all files in `.changeset`
- Updates `package.json` versions
- Updates `CHANGELOG.md` files
- Deletes the standard changeset files

## 3. Publish to NPM
Finally, build and publish the packages. You must be logged into npm (`npm login`).
```bash
pnpm release
```
This runs the build script and then `changeset publish`.
