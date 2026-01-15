**english** | [русский](https://github.com/yandex-cloud/yfm-transform/blob/master/README.ru.md)

---

[![NPM version](https://img.shields.io/npm/v/@diplodoc/transform.svg?style=flat)](https://www.npmjs.org/package/@diplodoc/transform)

# @diplodoc/transform

Core transformation package for the Diplodoc platform. Converts Yandex Flavored Markdown (YFM) to HTML with support for interactive components, Liquid templates, and extensible plugin architecture.

Use it in your code to work with text during program execution. For example, to display user-generated content.

## Features

- **YFM to HTML transformation** — Core markdown processing with YFM extensions
- **Liquid template support** — Variable substitution, conditions, cycles
- **Plugin system** — Extensible architecture using extension packages (cut, tabs, file)
- **Client-side runtime** — Interactive components (tabs, cuts, terms, anchors, etc.)
- **SCSS styles** — Comprehensive styling system with CSS variables
- **Multiple output formats** — HTML, metadata, titles, headings
- **HTML sanitization** — Built-in XSS protection with customizable sanitizer
- **YFMLint integration** — Custom markdownlint rules for YFM validation

## Installation {#install}

1. Install a package:

   ```shell
   npm i @diplodoc/transform
   ```

1. Add the package in your code using the `require()` or `import()` function:

   ```javascript
   const transform = require('@diplodoc/transform');
   ```

1. To ensure text is displayed properly, add CSS styles and client scripts to the project:

   ```css
   @import '~@diplodoc/transform/dist/css/yfm.css';
   ```

   ```javascript
   import '@diplodoc/transform/dist/js/yfm';
   ```

## Usage {#use}

The package provides the `transform()` function:

- Input data: [Settings](https://diplodoc.com/docs/en/tools/transform/settings) and a string with YFM.
- Returned value: An object with the `result` and `logs` fields.

### Result field

`result`: Resulting object, contains the fields:

- `html`: A line with HTML.
- `meta`: Metadata from the transmitted content.
- `title`: The document title. Returned if `extractTitle = true` or `needTitle = true`.
- `headings`: A list of document headers.

### Logs field

`logs`: Information about the transformation process, includes arrays:

- `error`: Errors.
- `warn`: Warnings.
- `info`: Additional information.

### Example of a function invocation

```javascript
const fs = require('fs');
const transform = require('@diplodoc/transform');

const content = fs.readFileSync(filePath, 'utf');
const vars = {user: {name: 'Alice'}};

const {
  result: {html, meta, title, headings},
  logs,
} = transform(content, {vars});
```

### Custom HTML Sanitizer

You can replace the default HTML sanitizer with your own implementation by providing a `sanitize` function in the options:

```javascript
const customSanitizer = (html, options) => {
  // Your custom sanitization logic here
  return sanitizedHtml;
};

const {result} = transform(content, {
  sanitize: customSanitizer,
  // Other options...
});
```

This is useful when you need to implement specific sanitization rules or integrate with a different sanitization library. The sanitizer function should accept HTML string as input and return sanitized HTML.

## License

MIT

## CSS public variables

**common**

- `--yfm-color-text`
- `--yfm-color-link`
- `--yfm-color-base`
- `--yfm-color-link-hover`
- `--yfm-color-border`
- `--yfm-color-accent`
- `--yfm-tab-size`
- `--yfm-text-block-margin-block`
- `--yfm-text-block-margin-inline`
- `--yfm-font-size`
- `--yfm-font-line-height`
- `--yfm-font-size-h1`
- `--yfm-font-line-height-h1`
- `--yfm-font-size-h2`
- `--yfm-font-line-height-h2`
- `--yfm-font-size-h3`
- `--yfm-font-line-height-h3`
- `--yfm-font-size-h4`
- `--yfm-font-line-height-h4`
- `--yfm-font-size-h5`
- `--yfm-font-line-height-h5`
- `--yfm-font-size-h6`
- `--yfm-font-line-height-h6`

**code**

- `--yfm-color-inline-code`
- `--yfm-color-inline-code-background`
- `--yfm-color-code-background`
- `--yfm-tab-size-code`

**hightlight**

- `--yfm-color-hljs-background`
- `--yfm-color-hljs-subst`
- `--yfm-color-hljs-comment`
- `--yfm-color-hljs-deletion`
- `--yfm-color-hljs-section`
- `--yfm-color-hljs-pseudo`
- `--yfm-color-hljs-literal`
- `--yfm-color-hljs-addition`
- `--yfm-color-hljs-meta`
- `--yfm-color-hljs-meta-string`

**note**

- `--yfm-color-note-tip`
- `--yfm-color-note-tip-background`
- `--yfm-color-note-warning`
- `--yfm-color-note-warning-background`
- `--yfm-color-note-important-background`
- `--yfm-color-note-info`
- `--yfm-color-note-info-background`

**term**

- `--yfm-color-term-title`
- `--yfm-color-term-title-hover`
- `--yfm-color-term-dfn-background`
- `--yfm-color-term-dfn-shadow`
- `--yfm-color-term-dfn-pseudo-shadow`

**modal**

- `--yfm-color-modal-content`
- `--yfm-color-modal-actions-hover`
- `--yfm-color-modal-wide-content`
- `--yfm-color-modal-wide-content-overlay`

**file**

- `--yfm-file-icon`
- `--yfm-file-icon-color`

**list**

- `--yfm-list-item-margin-block`
- `--yfm-list-text-margin-block`
- `--yfm-list-text-only-margin-block`
- `--yfm-list-text-last-margin-block`

**table**

- `--yfm-color-table`
- `--yfm-color-table-border`
- `--yfm-color-table-background`
- `--yfm-color-table-head-background`
- `--yfm-color-table-stripe-row-background`

## Development

### Setup

```bash
# Install dependencies
npm install

# Build server-side code
npm run build:lib

# Build client-side assets
npm run build:dist

# Build both
npm run build

# Run unit tests
npm test

# Type check
npm run typecheck

# Lint code
npm run lint
```

### Development Workflow

```bash
# Watch mode for server-side code
npm run dev:lib

# Start playground (interactive YFM testing)
npm run playground
```

## Contributing

### Tests

This package features unit tests run by Jest (to be migrated to Vitest) and e2e & visual tests run by Playwright. Playwright tests are located in `e2e` sub-package.

#### Playwright: prerequisites

To ensure maximum reproducibility and to avoid unwanted variance introduced by using different platforms
between CI environments and contributors' dev environments, it is recommended to run Playwright tests locally using
the `test:playwright` package script, which sets up a testing environment in a Docker container.

```sh
$ npm run test:playwright
```

This assumes you have Docker CLI and Docker Engine installed.

To use Playwright in UI mode, instead use the `playwright:docker:ui` script:

```sh
$ cd e2e
$ npm run playwright:docker:ui
```

##### macOS users: unable/unwilling to use Docker Desktop?

Due to somewhat recent licensing changes, using Docker Desktop in enterprise setting is not free anymore.
Consider using [Lima](https://github.com/lima-vm/lima) or some of its wrappers, such as [Colima](https://github.com/abiosoft/colima) or [Rancher Desktop](https://rancherdesktop.io/).

You can pass a `LIMA_INSTANCE` environment variable to `playwright:docker`/`test:playwright`:

```sh
$ LIMA_INSTANCE=instancename npm run test:playwright
```

This ensures the `DOCKER_HOST` is set as necessary.

## Documentation

For detailed information about architecture, development, and contributing, see [AGENTS.md](./AGENTS.md).
