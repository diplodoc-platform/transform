# Changelog @diplodoc/transform@1.0.0

## It's major update of @doc-tools/transform@3.11.0 with security changes.

### New term's linter

The main feature of term is generating a hidden content, that will be show on click. Terms plugins creates MarkadownIt tokens at place, where term was defined and it can brake our `@doc-tools/docs` navigation. Now `@diplodoc/transform` has new yfmlint rule: `no-term-definition-in-content`. There are several restrictions: - You can't define content between term-def - All term-def should be placed at the end of file.

### Enabling `needToSanitizeHtml` by default

The sanitizer includes default options with safe, allowed tags, and attributes. However, by default, both the `style` tag and the `style` attribute are also allowed. The values will be processed by the [cssfilter](https://github.com/leizongmin/js-css-filter) module to prevent XSS attacks. The cssfilter module includes a default CSS whitelist.

You can override the options for sanitizer like this:

```javascript
const transform = require('@doc-tools/transform');
const {defaultOptions} = require('@doc-tools/transform/lib/sanitize');

const sanitizeOptions = Object.assign({}, defaultOptions);

// Allow css property
sanitizeOptions.cssWhiteList['position'] = true;

// Disallow css property
delete sanitizeOptions.cssWhiteList['color'];

// Disable `style` tag
sanitizeOptions.allowedTags = sanitizeOptions.allowedTags.filter((tag) => tag !== 'style');

// Disable `style` attribute
sanitizeOptions.allowedAttributes['*'] = sanitizeOptions.allowedAttributes['*'].filter(
  (attr) => attr !== 'style',
);

const {
  result: {html},
} = transform(content, {sanitizeOptions});
```
