# Transform in a browser

Import the explicit ESM browser entry from a Transform version containing this
API. Existing Node entrypoints retain their host services and CommonJS support.

```typescript
import transform from '@diplodoc/transform/browser';
import '@diplodoc/transform/runtime';
import '@diplodoc/transform/styles';

const output = transform('# Heading\n\n**Browser** content');
document.querySelector('.yfm')!.innerHTML = output.result.html;
```

The runtime and CSS imports are explicit application choices. Transform returns
sanitized HTML and document metadata; it does not fetch, copy or execute resources.
Treat extension `meta.script/style/csp` as resource declarations and choose trusted
runtime/style bundles in the application. Do not automatically execute arbitrary
frontmatter URLs. The [working example](../../examples/browser/README.md) uses
ordinary esbuild configuration; Rspack needs no Node aliases or fallback modules.

## Two finite compositions

`@diplodoc/transform/browser` includes the actual standard installation order:
meta, deflist, cut, notes, anchors, tabs, code, sup, video, monospace, table, file,
imsize, term, block-anchor, inline-code, visibility, underline and subscript.
It preserves their current supported rendering algorithms, defaults and options.
General Markdown attributes default to false through the same shared policy as
Node; use `enableMarkdownAttrs:true` explicitly for compatibility. Heading IDs and
image dimensions remain independent features.

`@diplodoc/transform/browser/minimal` has no builtin implementations or companion
extension imports. It retains native Markdown parsing, shared core repairs,
explicit highlighting and mandatory final HTML/CSS sanitization. Its attrs default
is explicitly false; explicit true is supported. Enabling, disabling or configuring
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
`rightDelimiter`, `highlighter`, `generateID`, `log`, `compatibility`,
`pluginConfiguration`, and `sanitizeOptions`.

Named composition retains `preset:'default'|'none'`, `enable`, `disable`,
`options`, and typed custom `plugins`. Standard builtin settings match Node's
named configuration except filesystem `output` is unavailable for cut/tabs/file.
Plugin context has no default filesystem path. Unknown settings and unsupported
Node capabilities fail before caller plugin installation with
`BrowserUnsupportedFeatureError`; malformed supported values throw `TypeError`.

The data-only sanitizer settings are `cssWhiteList`, `allowedTags`,
`allowedAttributes`, `allowedSchemes`, `allowedSchemesByTag`,
`allowedSchemesAppliedToAttributes`, and `allowProtocolRelative`. They use the
existing sanitizer policy. Final sanitization applies to trusted plugin and
highlighter output too. Custom sanitizer replacements, style-sanitizer bypasses
and parser callbacks are unavailable in this browser API.

```typescript
import {createParser, definePlugin} from '@diplodoc/transform/browser/minimal';

const badge = definePlugin({
  id: 'app/badge',
  setup(md, options: {label: string}, context) {
    md.renderer.rules.text = (tokens, index) =>
      md.utils.escapeHtml(options.label + tokens[index].content);
    // context.generateID is the exact caller generator when supplied.
  },
})({label: 'Article: '});

const parser = createParser({pluginConfiguration: {plugins: [badge]}});
const article = parser.parseDocument('Content');
const html = parser.compileDocument(article);
```

Builtin installation order and dependency/ordering constraints remain shared.
`preset:'none'` removes feature callbacks while keeping core repairs, the content
guard and final sanitizer. Browser diagnostics are collected and forwarded to
`log` using plain labels; Node collectors and terminal formatting remain separate.
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
import transform, {createHighlightJsHighlighter} from '@diplodoc/transform/browser';

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

Both browser subpaths have **import-only** package conditions and `.d.mts`
declarations. CommonJS `require('@diplodoc/transform/browser')` fails with
`ERR_PACKAGE_PATH_NOT_EXPORTED`; a CommonJS caller can use `await import(...)`.
The existing Node `require('@diplodoc/transform')` behavior is unchanged.

Browser TypeScript projects can use `lib:['ES2022','DOM']`, `types:[]`,
`skipLibCheck:false`, and Bundler or NodeNext resolution. The declarations do not
require Node ambient types. Node/types/document and browser aliases reference one
physical augmentation carrier; mixed applications retain their existing
`ParserEnv`/`DocumentEnv` augmentation identity.
