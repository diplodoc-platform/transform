**english** | [русский](https://github.com/yandex-cloud/yfm-transform/blob/master/README.ru.md)

---

[![NPM version](https://img.shields.io/npm/v/@diplodoc/transform.svg?style=flat)](https://www.npmjs.org/package/@diplodoc/transform)

[@diplodoc/transform](https://www.npmjs.com/package/@diplodoc/transform) is a package for converting Yandex Flavored Markdown to HTML.

Use it in your code to work with text during program execution. For example, to display user-generated content.

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

## License

MIT

## CSS public variables

**common**

- `--yfm-color-text`
- `--yfm-color-link`
- `--yfm-color-base`
- `--yfm-color-link-hover`
- `--yfm-color-table`
- `--yfm-color-table-row-background`
- `--yfm-color-border`
- `--yfm-color-accent`

**code**

- `--yfm-color-inline-code`
- `--yfm-color-inline-code-background`
- `--yfm-color-code-background`

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
