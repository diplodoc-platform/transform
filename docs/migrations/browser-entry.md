# Portable rendering with Transform

Import `/portable` to render prepared Markdown in a browser, a Web Worker or
Node.js. The ESM entry runs without a DOM and leaves includes, Liquid, linting
and filesystem operations to the application. Use the Node entry for its host
services and CommonJS support. The earlier beta paths `/browser` and
`/browser/minimal` remain aliases for `/portable` and `/portable/minimal`.

```typescript
import transform from '@diplodoc/transform/portable';
import '@diplodoc/transform/runtime';
import '@diplodoc/transform/styles';

const output = transform('# Heading\n\n**Browser** content');
document.querySelector('.yfm')!.innerHTML = output.result.html;
```

The runtime and CSS imports are explicit application choices. The standard
browser entry returns sanitized HTML and document metadata. Transform does not
fetch, copy or execute resources.
Treat extension `meta.script/style/csp` as resource declarations and choose trusted
runtime/style bundles in the application. Do not automatically execute arbitrary
frontmatter URLs. The [working example](../../examples/browser/README.md) uses
ordinary esbuild configuration; Rspack needs no Node aliases or fallback modules.

## Two finite compositions

`@diplodoc/transform/portable` includes the actual standard installation order:
meta, deflist, cut, notes, anchors, tabs, code, sup, video, monospace, table, file,
imsize, term, block-anchor, inline-code, visibility, underline, subscript, footnotes
and task-list. See the shared [plugin configuration contract](../specs/transform-5/plugin-configuration.md)
for named composition and settings.
It preserves their current supported rendering algorithms, defaults and options.
General Markdown attributes default to false through the same shared policy as
Node; use `enableMarkdownAttrs:true` explicitly for compatibility. Heading IDs and
image dimensions remain independent features.

`@diplodoc/transform/portable/minimal` has no builtin plugins, companion extension
imports or built-in sanitizer. It retains native Markdown parsing, shared core
repairs and explicit highlighting. Pass an application sanitizer before using
the output as HTML. Its attrs default is explicitly false. Explicit true is
supported. Enabling, disabling or configuring
an unavailable builtin fails. An application can supply an explicit compatible
plugin through named configuration.

Both entries export default/named `transform`, `createParser`, `createDocumentEnv`,
`envMeta`, `parseDocumentFragment`, `parseDocumentFragmentResult`,
`replayDocumentFragment`, `createHighlightJsHighlighter`, `definePlugin`,
`defineLegacyPlugin`, and `BrowserUnsupportedFeatureError`, with public types.

## Supported settings

The closed browser core settings are `allowHTML`, `linkify`, `linkifyTlds`,
`breaks`, `disableRules`, `lang`, `extractTitle`, `needTitle`,
`needFlatListHeadings`, `renderInline`, `enableMarkdownAttrs`, `leftDelimiter`,
`rightDelimiter`, `highlighter`, `generateID`, `log`, `diagnostics`, `compatibility`,
`pluginConfiguration`, and `sanitizeOptions`.

Named composition retains `preset:'default'|'none'`, `enable`, `disable`,
`options`, and typed custom `plugins`. Standard builtin settings match Node's
named configuration except filesystem `output` is unavailable for cut/tabs/file.
Plugin context has no default filesystem path. Unknown settings and unsupported
Node capabilities fail before caller plugin installation with
`BrowserUnsupportedFeatureError`; malformed supported values throw `TypeError`.

The data-only sanitizer settings are `cssWhiteList`, `allowedTags`,
`allowedAttributes`, `allowedSchemes`, `allowedSchemesByTag`,
`allowedSchemesAppliedToAttributes`, and `allowProtocolRelative`. The standard
browser entry uses these settings in its built-in policy for all rendered HTML,
including plugin and highlighter output.

The minimal entry accepts an application-owned synchronous `sanitize` function in
`transform` and `createParser` options. It receives the final renderer HTML
and the optional validated `sanitizeOptions` object. Transform uses the returned
string as the document HTML and propagates callback errors.
**Without `sanitize`, minimal returns unsanitized HTML.** Pass your own HTML and
CSS policy before inserting any rendered output into the DOM. `sanitizeOptions`
alone only describes settings for a callback and does not sanitize the output.
The content guard and default Markdown HTML escaping still run. They do not
sanitize the output of plugins or highlighters.

For development, set `warnOnUnsanitizedHtml: true` on minimal to record a warning
when it compiles nonempty HTML without a callback. The warning is off by default.
It appears in `transform(...).logs.warn` or the compiled document's `logs.warn`
and is forwarded to a supplied diagnostic collector or logger.

```typescript
import {createParser} from '@diplodoc/transform/portable/minimal';
import {sanitizeDocumentHtml} from './application-sanitizer.js';

const parser = createParser({sanitize: sanitizeDocumentHtml});
const document = parser.parseDocument(source);
const html = parser.compileDocument(document);
```

### HTML extension preview

The [working HTML extension example](../../e2e/fixtures/html-extension/app.mjs)
uses two sanitizer policies. The extension's `htmlBlockDefaultSanitizer`
sanitizes the block head and body before they go into the iframe. The application
passes a document `sanitize` callback to minimal that preserves `srcdoc` and
`sandbox` on the generated iframe. Raw Markdown HTML is disabled, and the HTML
extension is the only enabled plugin. Keep that distinction when adapting the
document policy to your own set of plugins.

`buildYfmHtmlBlockOptions` builds a policy for the contents of the block. Fields
such as `nonBooleanAttributes` fall outside the browser `sanitizeOptions`
schema. Use the extension's `sanitize` setting for a custom block policy.

The example loads the HTML extension runtime and switches the iframe body between
light and dark themes. Its browser build uses a
[CSS adapter](../../e2e/fixtures/html-extension/build.mjs) because this version
of the extension imports the Node sanitizer. The adapter uses the CSS parser
and serializer without filesystem source maps.

From the Transform checkout, run:

```sh
npm ci
npm run build
npm ci --prefix e2e
node e2e/fixtures/html-extension/build.mjs
```

Serve `build/html-extension-example` over HTTP to open the preview. The
[Playwright test](../../e2e/tests/html-extension.spec.ts) checks both themes
and verifies that the iframe grows and shrinks when the viewport changes.

### Custom browser plugins

```typescript
import {createParser, definePlugin} from '@diplodoc/transform/portable/minimal';
import {sanitizeDocumentHtml} from './application-sanitizer.js';

const badge = definePlugin({
  id: 'app/badge',
  setup(md, options: {label: string}, context) {
    md.renderer.rules.text = (tokens, index) =>
      md.utils.escapeHtml(options.label + tokens[index].content);
    // context.generateID is the exact caller generator when supplied.
  },
})({label: 'Article: '});

const parser = createParser({
  sanitize: sanitizeDocumentHtml,
  pluginConfiguration: {plugins: [badge]},
});
const article = parser.parseDocument('Content');
const html = parser.compileDocument(article);
```

Import one portable callback directly when building a minimal bundle.

```typescript
import transform, {definePlugin} from '@diplodoc/transform/portable/minimal';
import monospace from '@diplodoc/transform/plugins/monospace';
import {sanitizeDocumentHtml} from './application-sanitizer.js';

const samples = definePlugin({
  id: 'app/samples',
  setup(md) {
    md.use(monospace);
  },
})({});

const output = transform('Output: ##sample##', {
  sanitize: sanitizeDocumentHtml,
  pluginConfiguration: {preset: 'none', plugins: [samples]},
});
```

Only import callbacks verified for browser bundling. Node helpers such as
`/utils/fs` and `/plugins/includes` require host services. Builtin IDs stay
reserved even in the minimal entry.

Builtin installation order and dependency/ordering constraints remain shared.
`preset:'none'` removes feature callbacks while keeping core repairs and the content
guard. The final HTML policy is selected by the entry and, in minimal, the
application callback. Browser diagnostics belong to each document and are
returned as detached snapshots, with plain labels. Use the browser entry's
`createDiagnosticCollector()` and `diagnostics` option for explicit build history;
`log` still forwards to an embedding logger. Node terminal formatting remains
separate. See the [shared lifetime contract](../specs/transform-5/diagnostic-lifetime.md).
A supplied ID generator retains its state across parser reuse.

## Host preparation and document ownership

Filesystem includes and materialized include markers recognized outside protected
code, escaping, HTML comments/attributes or other literal examples fail explicitly
with a source location and host pre-expansion alternative. Browser transformation
does not run Liquid, YFMLint, image copying, SVG file optimization or link-title
lookups. `{{ value }}` stays literal. Relative image/link URLs stay URLs; DOM
insertion may then load allowed resources normally.

`createParser` uses the same owned document lifecycle as Node. Compile the handle
created by that parser; derived token arrays require their explicit document.
Root metadata/resources stay document-local and child purpose/rollback semantics
remain unchanged. Fragment capture/replay uses genuine opaque capsules owned by
the same native parser, preserving mutable token identity. Import runtime helpers
from the selected browser graph; sharing public data types does not make a Node
capsule transferable into a separately bundled browser graph. Cache keys, content
lifetime and fixed parser flags remain application-owned. See
[document context](./document-context.md) for the detailed handle contract.

## Optional highlighting and ESM loading

No Highlight.js implementation loads by default. Await an explicit caller import,
then keep the transform pipeline synchronous:

````typescript
import transform, {createHighlightJsHighlighter} from '@diplodoc/transform/portable';

const [backend, language] = await Promise.all([
  import('highlight.js/lib/core'),
  import('highlight.js/lib/languages/javascript'),
]);
const highlighter = createHighlightJsHighlighter(backend, {
  languages: {javascript: language.default},
  allowedLanguages: ['js', 'javascript'],
});
const output = transform('```js\nconst value = 1;\n```', {highlighter});
````

This example uses Highlight.js11 exports. Native ESM callers using10.x must use
the version-appropriate `.js` subpaths described in the
[highlighter migration guide](./transform-5-highlighter.md).

Both portable subpaths and their aliases have **import-only** package conditions
and share the same `.d.mts` declarations for each composition. CommonJS
`require('@diplodoc/transform/portable')` fails with
`ERR_PACKAGE_PATH_NOT_EXPORTED`; a CommonJS caller can use `await import(...)`.
The existing Node `require('@diplodoc/transform')` behavior is unchanged.

Browser TypeScript projects can use `lib:['ES2022','DOM']`, `types:[]`,
`skipLibCheck:false`, and Bundler or NodeNext resolution. The declarations do not
require Node ambient types. Node/types/document and browser aliases reference one
physical augmentation carrier; mixed applications retain their existing
`ParserEnv`/`DocumentEnv` augmentation identity.
