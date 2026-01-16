# AGENTS.md

This file contains instructions for AI agents working with the `@diplodoc/transform` project.

## Common Rules and Standards

**Important**: This package follows common rules and standards defined in the Diplodoc metapackage. When working in metapackage mode, refer to:

- **`.agents/style-and-testing.md`** in the metapackage root for:
  - Code style guidelines
  - **Language requirements** (commit messages, comments, docs MUST be in English)
  - Commit message format (Conventional Commits)
  - Pre-commit hooks rules (**CRITICAL**: Never commit with `--no-verify`)
  - Testing standards
  - Documentation requirements
- **`.agents/core.md`** for core concepts
- **`.agents/monorepo.md`** for workspace and dependency management
- **`.agents/dev-infrastructure.md`** for build and CI/CD

**Note**: In standalone mode (when this package is used independently), these rules still apply. If you need to reference the full documentation, check the [Diplodoc metapackage repository](https://github.com/diplodoc-platform/diplodoc).

## Project Description

`@diplodoc/transform` is the core transformation package for the Diplodoc platform. It converts Yandex Flavored Markdown (YFM) to HTML, providing both server-side transformation and client-side runtime components.

**Key Features**:

- **YFM to HTML transformation** — Core markdown processing with YFM extensions
- **Plugin system** — Extensible architecture using extension packages
- **Client-side runtime** — Interactive components (tabs, cuts, terms, etc.)
- **SCSS styles** — Comprehensive styling system with CSS variables
- **Multiple output formats** — HTML, metadata, titles, headings
- **HTML sanitization** — Built-in XSS protection with customizable sanitizer

> **Note**: Liquid template support and YFMLint integration are deprecated in this package. Use separate packages (`@diplodoc/liquid` and `@diplodoc/yfmlint`) instead. The legacy code still exists in `src/transform/liquid/` and `src/transform/yfmlint/` for backward compatibility but should not be used in new projects.

**Primary Use Case**: Core transformation engine for the Diplodoc documentation platform. Used by `@diplodoc/cli` and other tools to process YFM documents into HTML with interactive features.

## Project Structure

### Main Directories

- `src/` — source code
  - `transform/` — **Server-side transformation** (Node.js)
    - Core transformation logic and MarkdownIt initialization
    - `plugins/` — Built-in plugins and extension integrations (cut, tabs, file, anchors, code, notes, term, table, etc.)
    - `liquid/` — Liquid template engine implementation (deprecated, use `@diplodoc/liquid`)
    - `preprocessors/` — Content preprocessing
    - `yfmlint/` — Custom markdownlint rules (deprecated, use `@diplodoc/yfmlint`)
    - HTML sanitization and utility functions
  - `js/` — **Client-side runtime** (browser)
    - Interactive components for anchor handling, code blocks, inline code, terms, wide mode, print functionality
    - Runtime code for browser execution
  - `scss/` — **Styles** (SCSS)
    - Main stylesheets (forwards extension styles)
    - Base styles, component styles, and print-specific styles
- `test/` — **Unit tests** (Jest/Vitest)
  - Test files for transform functionality, plugins, and HTML output snapshots
  - Legacy tests for Liquid and YFMLint (deprecated)
- `e2e/` — **E2E tests** (Playwright, separate package)
  - Visual regression and integration tests
  - Storybook-based test fixtures
- `playground/` — **Interactive playground** (separate package)
  - Published to gh-pages for interactive YFM syntax testing
- `lib/` — compiled server-side code (generated, CommonJS)
- `dist/` — compiled client-side assets (generated)
  - Bundled JavaScript, compiled CSS, and source SCSS files

### Configuration Files

- `package.json` — package metadata and dependencies
- `tsconfig.json` — TypeScript configuration (development, includes test/)
- `tsconfig.transform.json` — TypeScript configuration (for building lib/)
- `jest.config.js` — Jest configuration (to be migrated to Vitest)
- `CHANGELOG.md` — change log (managed by release-please)
- `CONTRIBUTING.md` — contribution guidelines

## Architecture: Server vs Client

This package has a **dual architecture**:

### Server-Side (`src/transform/`)

- **Purpose**: Transform YFM to HTML on the server
- **Runtime**: Node.js
- **Output**: `lib/` directory (CommonJS)
- **Entry**: `lib/index.js`
- **Dependencies**: Uses extension packages as plugins
  - `@diplodoc/cut-extension` — cut plugin
  - `@diplodoc/tabs-extension` — tabs plugin
  - `@diplodoc/file-extension` — file plugin

**How extensions are used**:

- Extensions provide `transform()` function that returns a MarkdownIt plugin
- Transform imports and uses these plugins in `src/transform/plugins.ts`
- Example: `src/transform/plugins/cut.ts` imports from `@diplodoc/cut-extension`

### Client-Side (`src/js/` and `src/scss/`)

- **Purpose**: Interactive behavior and styling in the browser
- **Runtime**: Browser
- **Output**: `dist/` directory (bundled JS and CSS)
- **Dependencies**: Uses extension runtime components
  - `@diplodoc/cut-extension/runtime` — cut runtime
  - `@diplodoc/tabs-extension/runtime` — tabs runtime
  - `@diplodoc/file-extension/runtime` — file runtime (via SCSS)

**How extensions are used**:

- Client JS imports runtime from extensions: `import '@diplodoc/cut-extension/runtime'`
- SCSS forwards extension styles: `@forward '@diplodoc/cut-extension/runtime'`
- Bundled into `dist/js/yfm.js` and `dist/css/yfm.css`

## Tech Stack

This package follows the standard Diplodoc platform tech stack. See `.agents/dev-infrastructure.md` and `.agents/style-and-testing.md` in the metapackage root for detailed information.

**Package-specific details**:

- **Language**: TypeScript
- **Server build**: `tsc` (TypeScript compiler) for `lib/` output
- **Client build**: Custom esbuild scripts for `dist/` output
- **Testing**: Jest (to be migrated to Vitest) for unit tests, Playwright for E2E
- **Styling**: SCSS (compiled to CSS via PostCSS)
- **Dependencies**:
  - `markdown-it` — Markdown parser
  - `@diplodoc/cut-extension`, `@diplodoc/tabs-extension`, `@diplodoc/file-extension` — extension plugins
  - `cheerio` — HTML manipulation
  - `sanitize-html` — HTML sanitization
  - `js-yaml` — YAML parsing (frontmatter)
  - Various markdown-it plugins
- **Dev Dependencies**:
  - `@diplodoc/lint` — linting infrastructure
  - `@diplodoc/tsconfig` — TypeScript configuration
  - `jest` / `vitest` — testing framework
  - `esbuild` — client-side bundling
  - `sass` — SCSS compilation
  - `postcss` — CSS processing

## Usage Modes

This package can be used in two different contexts:

### 1. As Part of Metapackage (Workspace Mode)

When `@diplodoc/transform` is part of the Diplodoc metapackage:

- Located at `packages/transform/` in the metapackage
- Linked via npm workspaces
- Dependencies are shared from metapackage root `node_modules`
- Can be developed alongside other packages
- Changes are immediately available to other packages via workspace linking

**Development in Metapackage**:

```bash
# From metapackage root
cd packages/transform

# Install dependencies (from root)
npm install

# Build server-side code
npm run build:lib

# Build client-side assets
npm run build:dist

# Build both
npm run build

# Run unit tests
npm test

# Run E2E tests (requires Docker)
npm run test:playwright

# Type check
npm run typecheck

# Lint
npm run lint
```

### 2. Standalone Mode

When `@diplodoc/transform` is used as a standalone npm package:

- Installed via `npm install @diplodoc/transform`
- All dependencies must be installed locally
- Can be used in any Node.js project

**Usage in Standalone Mode**:

```bash
# Install
npm install @diplodoc/transform

# Use in code
const transform = require('@diplodoc/transform');
// or
import transform from '@diplodoc/transform';

// Use client assets
import '@diplodoc/transform/dist/js/yfm';
import '@diplodoc/transform/dist/css/yfm.css';
```

## Build System

The package uses **two separate build processes**:

### Server-Side Build (`build:lib`)

- **Tool**: TypeScript compiler (`tsc`)
- **Config**: `tsconfig.transform.json`
- **Entry**: `src/transform/**/*`
- **Output**: `lib/` directory
- **Format**: CommonJS (for Node.js compatibility)
- **Output files**:
  - `lib/index.js` — main entry point
  - `lib/**/*.js` — compiled JavaScript
  - `lib/**/*.d.ts` — TypeScript declarations

### Client-Side Build (`build:dist`)

- **Tool**: Custom esbuild scripts
- **Script**: `scripts/build-static.mjs`
- **Entry**: `src/js/` and `src/scss/`
- **Output**: `dist/` directory
- **Output files**:
  - `dist/js/yfm.js` — bundled JavaScript
  - `dist/js/yfm.min.js` — minified JavaScript
  - `dist/css/yfm.css` — compiled CSS
  - `dist/css/yfm.min.css` — minified CSS
  - `dist/scss/` — source SCSS files (for advanced usage)

**Build Process**:

1. `build:lib` — Compiles server-side TypeScript to `lib/`
2. `build:dist` — Bundles client-side JS and compiles SCSS to `dist/`
3. `build` — Runs both build steps sequentially

## Extension Integration

This package integrates with extension packages in two ways:

### Server-Side Integration

Extensions are used as MarkdownIt plugins:

```typescript
// src/transform/plugins/cut.ts
import {transform} from '@diplodoc/cut-extension';

export = transform({bundle: false, directiveSyntax: 'disabled'});
```

The plugin is then registered in `src/transform/plugins.ts`:

```typescript
import cut from './plugins/cut';

const defaultPlugins = [
  // ...
  cut,
  // ...
];
```

### Client-Side Integration

Extensions provide runtime components:

**JavaScript** (`src/js/index.ts`):

```typescript
import '@diplodoc/cut-extension/runtime';
import '@diplodoc/tabs-extension/runtime';
```

**SCSS** (`src/scss/yfm.scss`):

```scss
@forward '@diplodoc/cut-extension/runtime';
@forward '@diplodoc/file-extension/runtime';
@forward '@diplodoc/tabs-extension/runtime';
```

These are bundled into the final `dist/` output.

## Testing

The package has **multiple testing layers**:

### Unit Tests (`test/`)

- **Location**: `test/` directory
- **Framework**: Jest (to be migrated to Vitest)
- **Coverage**: Enabled via `jest --coverage`
- **Test files**: `*.test.ts`
- **Snapshots**: HTML output snapshots in `__snapshots__/`

**Test Commands**:

```bash
# Run unit tests
npm test

# Run with coverage
npm test  # coverage is enabled by default
```

**Test Structure**:

- Tests for individual plugins
- Tests for HTML sanitization
- Legacy tests for Liquid template engine (deprecated)
- Legacy tests for YFMLint rules (deprecated)
- Snapshot tests for HTML output

### E2E Tests (`e2e/`)

- **Location**: `e2e/` directory (separate package)
- **Framework**: Playwright
- **Purpose**: Visual regression and integration testing
- **Prerequisites**: Docker (for reproducible environment)

**Test Commands**:

```bash
# Run E2E tests (builds first)
npm run test:playwright

# Run E2E tests without building
npm run test:playwright:nobuild

# Run in UI mode
cd e2e && npm run playwright:docker:ui
```

**Note**: E2E tests are in a separate directory and have their own `package.json`. They are not part of the main package infrastructure updates.

## Linting and Code Quality

Linting is configured via `@diplodoc/lint`:

- ESLint for JavaScript/TypeScript
- Prettier for code formatting
- Stylelint for SCSS
- Git hooks via Husky
- Pre-commit checks via lint-staged

Configuration files are automatically managed by `@diplodoc/lint`:

- `.eslintrc.js`
- `.prettierrc.js`
- `.stylelintrc.js`
- `.editorconfig`
- `.lintstagedrc.js`
- `.husky/pre-commit`
- `.husky/commit-msg`

**Lint Commands**:

```bash
# Update lint configurations
npm run lint

# Fix linting issues
npm run lint:fix

# Pre-commit hook (runs automatically)
npm run pre-commit
```

## Important Notes

1. **Metapackage vs Standalone**: This package can be used both as part of the metapackage (workspace mode) and as a standalone npm package. All scripts must work in both contexts.

2. **Dual Architecture**: Remember that this package has both server-side (`src/transform/`) and client-side (`src/js/`, `src/scss/`) code. Changes to one may affect the other.

3. **Extension Dependencies**: This package depends on extension packages (`@diplodoc/cut-extension`, `@diplodoc/tabs-extension`, `@diplodoc/file-extension`). When updating extensions, ensure compatibility.

4. **Build Outputs**: The package has two build outputs:
   - `lib/` — server-side code (CommonJS)
   - `dist/` — client-side assets (bundled JS and CSS)

5. **TypeScript Version**: Currently uses TypeScript 4.7.4. Upgrading to TypeScript 5.x should be done as a separate task due to potential breaking changes.

6. **Testing**: Unit tests use Jest (to be migrated to Vitest). E2E tests use Playwright and are in a separate `e2e/` directory.

7. **Playground**: The `playground/` directory is a separate package used for interactive YFM testing. It's published to gh-pages and should not be modified as part of infrastructure updates.

8. **package.json Maintenance**: Periodically check that `package.json` fields (description, repository URL, bugs URL, etc.) are accurate and up-to-date. Verify that dependency versions are current and compatible with the project standards.

## CI/CD

The package includes GitHub Actions workflows:

- **ci.yml**: Runs tests, type checking, linting, and build
- **deps.yaml**: Dependency updates
- **e2e.yml**: E2E tests
- **package-lock.yaml**: Package lock updates
- **prerelease.yaml**: Pre-release checks
- **release.yml**: Publishes package to npm when a release is created

### Release Process

The package uses **release-please** for automated versioning and publishing:

1. **Release-please workflow** (`.github/workflows/release-please.yml`):
   - Runs on push to `master`
   - Analyzes conventional commits to determine version bumps
   - Creates release PRs with updated version and CHANGELOG.md
   - When release PR is merged, creates a GitHub release with tag `v4.0.0`

2. **Publish workflow** (`.github/workflows/release.yml`):
   - Triggers automatically when a release is created
   - Runs tests, type checking, and build
   - Verifies package contents and version matching
   - Publishes to npm with provenance

**Workflow**:

1. Developer makes conventional commits (e.g., `feat: add new feature`)
2. Release-please creates/updates release PR with version bump and changelog
3. Release PR is reviewed and merged
4. Release-please creates GitHub release
5. Publish workflow automatically publishes to npm

**Version Bump Rules**:

- `feat`: Minor version bump
- `fix`: Patch version bump
- Breaking changes (e.g., `feat!: breaking change`): Major version bump
- `chore`, `docs`, `refactor`: No version bump (unless breaking)

## GitHub Integration

- **Issue templates**: Bug reports and feature requests (`.github/ISSUE_TEMPLATE/`)
- **Pull request template**: Standardized PR format (`.github/pull_request_template.md`)
- **CODEOWNERS**: Code ownership configuration (`.github/CODEOWNERS`)

## Documentation Files

- **README.md**: Package documentation with usage examples
- **README.ru.md**: Russian version of README
- **CHANGELOG.md**: Change log (managed by release-please)
- **CHANGELOG.diplodoc.md**: Diplodoc-specific changelog
- **CONTRIBUTING.md**: Contribution guidelines and development workflow
- **AGENTS.md**: This file - guide for AI coding agents
- **LICENSE**: MIT license

## Additional Resources

- Metapackage `.agents/` - Platform-wide agent documentation
- `@diplodoc/lint` documentation - Linting and formatting setup
- `@diplodoc/tsconfig` - TypeScript configuration reference
- Extension packages (`@diplodoc/cut-extension`, `@diplodoc/tabs-extension`, `@diplodoc/file-extension`) - Extension documentation
