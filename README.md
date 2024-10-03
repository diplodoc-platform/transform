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
