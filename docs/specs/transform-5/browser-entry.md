# Browser transformation entry points

Status: refreshed SDD for coordinator contract review. Architecture/sanitizer approach
is approved in principle; implementation requires a separately assigned phase.
The ESM-only subpath decision below is a coordinator decision, not an open choice.

Task: [DOCSTOOLS-6940](https://st.yandex-team.ru/DOCSTOOLS-6940).
Design baseline: merged major `551a675bc24b5eefacfb8bf92550b145f9ad94c1`
(DOCSTOOLS-6951 document contexts/capsules plus accepted table changes).
Branch: `codex/docstools-6940-browser-entry-v2`.
The original 358-line proposal at `9fb11cb0bd8842cf5668863a2f5f59db9358ff43`
and old branch remain preserved in the SDD evidence; no source reset/discard occurred.

## Requirements and scope

The live task requires a public browser entry, basic rendering without mandatory
`fs`, `path`, or `process` polyfills or special consumer bundler stubs, documented
extension/runtime/styles composition, and a working browser example.

- [#359](https://github.com/diplodoc-platform/transform/issues/359) identifies
  `css.stringify` as a source of client `fs`/`path` requirements.
- [#473](https://github.com/diplodoc-platform/transform/issues/473) requires ordinary
  application setup without CRACO/webpack `resolve.fallback` changes. Its comments
  discuss CSS source-map dependencies; they do not authorize copying a sanitizer.
- [#446](https://github.com/diplodoc-platform/transform/issues/446) also concerns
  markdown-editor and lowlight/highlight.js. This task covers Transform's reachable
  feature composition and explicit highlighter loading, not the entire editor
  application, an editor dependency migration, or a promised byte reduction.

The Node root, default plugin composition, implicit retained Liquid processing,
and retained YFMLint API remain available. User-authorized deprecation work did
not authorize removing those engines. An explicit browser subpath selects a
different host capability contract; do not redirect the package root with a
top-level `browser` replacement or change Node behavior by environment detection.

No async transformation API, virtual filesystem, generic extension framework,
process cache, new runtime floor, or Node-engine removal is included.

## Evidence and dependency cut

These references describe source at the design baseline, not a verified final
browser package. Genuine installed dependencies from the isolated document-context
checkout were inspected read-only; that checkout contains native MarkdownIt 15,
not the primary workspace's parser 13 installation.

| Current owner                                                                       | Browser consequence and proposed cut                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `md.ts:initMarkdownIt/initPlugins`, `plugin-registry.ts:resolvePluginConfiguration` | Eager Node default registry, preprocessors, sanitizer and utility imports survive through the canonical CJS graph. Extract a shared parser/lifecycle factory receiving a finite host installation, not another whole Transform implementation.    |
| `utilsFS.ts`, `preprocessors/included/index.ts`                                     | Filesystem/path reads and retained Liquid are host capabilities. Exclude these modules entirely from browser transformation.                                                                                                                      |
| `plugins/links`, `plugins/anchors/collect`, `plugins/images`                        | File existence/title lookup, single-page collection, SVG reads/optimization and filesystem asset collection stay Node-only. Ordinary Markdown URL/image rendering does not need these collectors.                                                 |
| `plugins/utils.ts`                                                                  | `process.platform` is used for a legacy newline constant. Separate pure ID/token helpers from the Node collection/newline export; do not ship a process polyfill.                                                                                 |
| `log.ts`, `deprecation.ts`, `document-context.ts`                                   | Diagnostic collection/reporter behavior must be available without forcing the terminal host graph. Extract finite pure factories, keep the existing Node logger/reporter wrappers, and inject the browser diagnostics into shared lifecycle code. |
| `sanitize.ts`                                                                       | Preserve sanitizer policy/CSS validation. Node's `css` package barrel reaches source-map filesystem helpers. Supply a real browser CSS adapter to the shared sanitizer factory.                                                                   |
| `highlighter/renderer.ts`, `highlighter.ts`                                         | The explicit synchronous protocol is reusable. Exclude `highlight.ts` and `/highlighter/legacy`, which own optional `require('highlight.js')`.                                                                                                    |
| `plugins/cut.ts`, `plugins/tabs.ts`, `plugins/file/index.ts`                        | Existing wrappers already use `bundle:false`. Companion packages have ordinary browser/default exports; prove those actual branches and resource writers. Do not resolve their `node` entries in the browser.                                     |
| `scripts/build-public-api.mjs:moduleExport`                                         | Current facades intentionally point to one Node CJS implementation. Browser exports need a separate explicit build target; pointing another facade at `lib/md.js` cannot cut its Node graph.                                                      |

### Bounded sanitizer proof, 2026-10-27

A source-only probe, outside the source tree, bundled the existing sanitizer under
ordinary esbuild browser conditions. It supplied no aliases, fallback modules,
custom resolver plugins, `process`/`Buffer` globals, or define options.

1. The unchanged `import css from 'css'` fails to bundle on unresolved `fs`/`path`.
2. A real CSS adapter importing `css/lib/parse/index.js` and
   `css/lib/stringify/identity.js`, then calling the original identity compiler's
   `compile(ast)`, bundles successfully. This invokes the existing parser and
   serializer without the source-map feature; it is not an empty Node stub or
   copied CSS parser. Private adapter declarations must be checked against the
   installed dependency; do not expose these internal package paths publicly.
3. The resulting bundle ran in real Chromium with both `process` and `Buffer`
   absent. Event handlers/JavaScript links were removed; safe color/width survived;
   dangerous CSS was removed; external SVG `use` references were removed while
   local `#id` references survived; image dimensions and heading IDs survived; a
   CSS sourceMappingURL comment did not trigger a read.

The probe used sanitize-html 2.18.0, CSS 3.0.0, PostCSS 8.5.30 and Cheerio 1.2.0
from that isolated installation. It is feasibility evidence, not acceptance of a
complete browser Transform graph, all browsers, or all sanitizer options.

PostCSS itself publishes ordinary `browser` mappings disabling optional terminal,
source-map, filesystem, path and URL server branches. Those upstream conditional
implementations are permitted by the coordinator's interpretation of the task.
Record them in the artifact graph inventory and prove required rendering/security
does not invoke them. Do not describe this as a graph with zero disabled entries.
Special application `resolve.fallback`, resolver aliases hiding builtins, injected
Node globals and new Transform-specific empty modules remain disallowed.

Preserve sanitize-html/Cheerio/cssfilter and the current policy. A DOMPurify/new
DOM sanitizer is not the selected design and is not justified by the successful
bounded proof. If a required case fails, report that concrete failure before
changing engines, dependencies, or security policy.

## Public API and finite compositions

Add explicit `@diplodoc/transform/browser` and
`@diplodoc/transform/browser/minimal` exports. The former is the standard browser
composition; the latter has a separately reachable minimal dependency graph.
Selecting a runtime flag after importing all standard plugins is insufficient
for the minimal bundle requirement.

Both entries provide:

```typescript
export default function transform(source: string, options?: BrowserTransformOptions): BrowserOutput;

export {transform};
export function createParser(options?: BrowserTransformOptions): DocumentParser;
export {
  createDocumentEnv,
  envMeta,
  parseDocumentFragment,
  parseDocumentFragmentResult,
  replayDocumentFragment,
  createHighlightJsHighlighter,
};
export type {
  DocumentEnv,
  ParsedDocument,
  ParsedDocumentFragment,
  ChildParseOptions,
  ParserEnv,
  Highlighter,
  BrowserTransformOptions,
  BrowserPluginConfiguration,
};
export {BrowserUnsupportedFeatureError};
```

The output retains `{result: {...document.env, html}, logs}`. `createParser` uses
the reviewed DOCSTOOLS-6951 handle/plain-env contract: fresh roots, exact token/env
association, owned handles, fixed installation options, derived-token explicit
handles, child purpose/commit rules, error cleanup, and the documented narrow
legacy env view. No new async, parallel, deterministic-ID or isolated-global-log
claim is added. Browser diagnostics are plain text and use the supplied logger;
they do not initialize Node terminal support. Node collection remains unchanged.

All fragment runtime helpers come from the same selected browser entry/ESM graph,
not the Node `/document` facade. `parseDocumentFragmentResult` captures a genuine
opaque same-parser capsule; `replayDocumentFragment` reuses its finite copied
contributions without parsing, preprocessing, reading, rendering or advancing IDs.
Initial reference captures but commits nothing; include/fragment/reference merges,
first-wins terms/materialized mappings, collision atomicity and failure recovery
match 6951. Tokens stay mutable and retain identity. Foreign/forged capsules fail
before parent mutation; callers own cache keys/lifetime and fixed flags/options.
Shared ESM chunks make helpers/context maps identical between standard/minimal
when imported together. No interoperation with a different Node/browser execution
graph is promised merely because public data types are shared.

`BrowserTransformOptions` is a closed browser contract, not the entire Node
`OptionsType` with unsupported fields silently ignored. Reuse host-independent
domain types rather than copying signatures or forcing browser consumers to load
Node ambient declarations. Supported core settings are parser HTML/linkify/breaks,
disabled rules, language, title/headings/inline output, pinned Markdown attributes,
explicit synchronous highlighter, exact caller ID generator, logger and
compatibility policy. Plugin-specific settings use the existing named composition
rules and typed definitions for the builtins available in that entry.

The implementation must publish the exact accepted field/ID list in its types and
migration guide. Unknown/Node-only options passed from JavaScript throw an
actionable `BrowserUnsupportedFeatureError` before parsing, with a stable feature
code and an alternative such as pre-expanding includes on the host. A Node options
object must not appear to work while silently losing file behavior.

The proposed accepted option names are finite:

```typescript
export interface BrowserTransformOptions {
  allowHTML?: boolean;
  linkify?: boolean;
  linkifyTlds?: string | string[];
  breaks?: boolean;
  disableRules?: string[];
  lang?: Lang;
  extractTitle?: boolean;
  needTitle?: boolean;
  needFlatListHeadings?: boolean;
  renderInline?: boolean;
  enableMarkdownAttrs?: boolean;
  leftDelimiter?: string;
  rightDelimiter?: string;
  highlighter?: Highlighter;
  generateID?: IDGenerator;
  log?: LogConsumer;
  compatibility?: CompatibilityPolicy;
  pluginConfiguration?: BrowserPluginConfiguration;
  sanitizeOptions?: BrowserSanitizeOptions;
}
```

`BrowserPluginConfiguration` keeps the existing `preset`, `enable`, `disable`,
`options`, `plugins` composition shape, ordering constraints and typed callbacks.
Its `preset` values remain exactly `default` and `none`. `default` selects the
entry's available set: empty for minimal, the exact standard list below for browser. Enabling unavailable builtin IDs fails with the
standard-entry/explicit-plugin alternative. Supported per-builtin settings match
the existing typed settings except filesystem `output`; reject that option.
Plugin context path is absent by default and is not a filesystem capability.

`BrowserSanitizeOptions` initially exposes `cssWhiteList`, `allowedTags`,
`allowedAttributes`, `allowedSchemes`, `allowedSchemesByTag`,
`allowedSchemesAppliedToAttributes`, and `allowProtocolRelative`, with the same
underlying policy semantics. Reject parser/source-map options, Node callbacks,
custom sanitizer replacement, `disableStyleSanitizer` and
`needToSanitizeHtml:false` in this new browser contract. This restriction changes
no Node option. Keep final sanitization enabled for plugin/highlighter output.

| Feature                                                                                                                                                                | Minimal entry                                                                      | Standard browser entry                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| CommonMark, links/images by URL, safe HTML/CSS sanitization                                                                                                            | Yes                                                                                | Yes                                                                                        |
| YFM metadata, anchors, notes, code controls, definition lists, sup, monospace, tables, image dimensions, terms, block anchors, inline-code controls, visibility, video | Explicit supplied compatible plugins only                                          | Same finite builtin installation order/algorithms as Node, after the dependency cuts above |
| Cut/tabs/file extension rendering                                                                                                                                      | Explicit compatible browser plugin                                                 | Existing browser implementations with `bundle:false`; URL/resource records only            |
| General Markdown attrs                                                                                                                                                 | Explicit `enableMarkdownAttrs:true` using the pinned implementation; default false | Inherit the one shared Node default (true at551); no independent browser default flip      |
| Explicit synchronous highlighter                                                                                                                                       | Yes                                                                                | Yes                                                                                        |
| Implicit highlight.js/lowlight, legacy highlighter loader                                                                                                              | No                                                                                 | No                                                                                         |
| Liquid/YFMLint engines and implicit interpolation                                                                                                                      | No                                                                                 | No                                                                                         |
| Filesystem includes/included blocks, link-title file inspection, asset copying, SVG filesystem inlining/optimization, single-page collectors                           | No                                                                                 | No                                                                                         |

Minimal has no standard preset imports, table implementation, cut/tabs/file
implementation or runtime side effects unless explicitly composed. Its ordinary
Markdown features and sanitizer remain present; minimal does not mean unsanitized.
Standard is deliberately not advertised as identical to the Node default preset:
Node host services remain unavailable. The table implementation/defaults must
follow the integrated reviewed table task, not another browser scanner variant.

### Executable preset, options and core-prelude contract

The approval fixture `artifacts/browser-entry-sdd-v2/browser-contract.json` is
executable data, with a stdlib-only verifier against this exact baseline. It
freezes all17IDs, Node installation order, browser option keys, core prelude,
export conditions and22source-recognition obligations. The verifier checks source
identity/order/shape only; it does not pretend a browser implementation exists.
An implementation phase must promote that data into ordinary repository tests and
execute it against installed browser entry points. Production must not load task
artifacts. Changes to this list require an explicit reviewed contract update.

```typescript
const standardBuiltinIds = [
  'meta',
  'deflist',
  'cut',
  'notes',
  'anchors',
  'tabs',
  'code',
  'sup',
  'video',
  'monospace',
  'table',
  'file',
  'imsize',
  'term',
  'block-anchor',
  'inline-code',
  'visibility',
] as const;
const minimalBuiltinIds = [] as const;
const defaultBuiltinSettings = {}; // No synthesized user settings.
```

| ID                                                                  | Allowed browser `pluginConfiguration.options[id]` keys                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| meta, deflist, cut, tabs, sup, monospace, block-anchor, inline-code | none                                                                                                                                     |
| notes                                                               | notesAutotitle                                                                                                                           |
| anchors                                                             | supportGithubAnchors, disableCommonAnchors, useCommonAnchorButtons                                                                       |
| code                                                                | codeLineWrapping                                                                                                                         |
| video                                                               | videoUrl, youtube, vimeo, vine, prezi, osf, yandex, vk, rutube, url                                                                      |
| table                                                               | table_ignoreSplittersInBlockCode, table_ignoreSplittersInInlineCode, table_ignoreSplittersInBlockMath, table_ignoreSplittersInInlineMath |
| file                                                                | fileExtraAttrs                                                                                                                           |
| imsize                                                              | enableInlineStyling (preserve6946 warning contract when integrated)                                                                      |
| term                                                                | multilineTermDefinitions                                                                                                                 |
| visibility                                                          | contentAudience                                                                                                                          |

Validate containers/IDs/key shape with the shared resolver and browser value kinds
against its closed declared contract, before feature installation. Node validation
semantics are unchanged. In particular `output` is unavailable for cut/tabs/file.
Their host wrappers force the existing `{bundle:false,directiveSyntax:'disabled'}`;
no collector/copy callback runs. Missing user settings delegate to the current
shared implementation defaults, rather than a copied browser defaults table.
Notes default autotitle true, wrapping false, visibility human, multiline terms
false and all accepted table splitter defaults follow551. Video service defaults
remain the single existing constants object. Registry ordering/duplicate IDs/
requires/before/after checks stay shared; runtime feature-rule ordering is not
reinterpreted as plugin installation ordering.

Minimal supports no builtin enable/disable/options ID: such IDs fail types and
JavaScript runtime validation with the standard-entry alternative. Custom plugin
entries keep the existing `{id,plugin,requires?,before?,after?}` shape and typed
callback context. Standard builtin IDs stay reserved in both entries, so an
explicit custom plugin must use its own ID. Custom callbacks may capture typed
application settings; this task adds no separate browser configuration language
or browser builder subpath. Preset:none does not remove the following prelude or
final sanitizer.

The exact prelude/installation sequence is:

1. Construct MarkdownIt with `html:false,linkify:false,breaks:true` unless explicitly
   overridden, current synchronous highlighter protocol, lang ru and caller-owned
   generator (or the existing random default). Configure fuzzyLink/fuzzyEmail/
   urlAuth true, then disable requested rules.
2. Install shared document activation/lifecycle and host diagnostics; validate and
   resolve the named feature composition before installing feature callbacks.
3. Resolve attrs once: `enableMarkdownAttrs ?? host.attrsDefault`, then optionally
   install the unchanged pinned attrs4.3.1 with delimiters `{` and `}` by default.
4. Install ol-attr-conversion, inline-svg-marker and linkify-strikethrough in that
   exact order. These are core repairs, not members of either feature preset.
5. Install the finite unsupported-content guard in actual parsing, respecting the
   protected-region contract below; it cannot preprocess/evaluate/expand content.
6. Install selected builtin/custom callbacks in the shared resolved order. Apply
   explicit linkify TLD additions after installation, only when linkify is enabled.
7. Parse/compile through the same owned-document/child/capsule lifecycle; retain
   title/headings and final mandatory HTML+CSS sanitizer behavior. No Node default
   preprocessors, file collectors, root-path/base-URL rewriting or implicit Liquid.

Core title/headings/inline flags default false; disabled rules default empty.
Standard attrsDefault references the shared Node policy (true at551); minimal is
explicit-only false. DOCSTOOLS-6944 owns the eventual shared false-default change.
6940 may extract this resolver while preserving551 behavior, but cannot duplicate
or concurrently change it. After root serializes6944, the standard inherits the
new value and the frozen baseline fixture is reviewed/refreshed; minimal stays
false. Anchor/image-dimension parsing is independent of general attrs enablement.

### Unsupported content and resource behavior

- Includes/included directives recognized as actual document constructs outside
  code examples fail explicitly with a source location and the pre-expansion
  alternative. Do not fetch, open, partially expand or silently discard them.
  Document-only terms and nested fragments remain supported through the shared
  child helper. A virtual source resolver is future scope.
- Literal `{{ value }}` text is not evaluated. Consumers may preprocess trusted
  templates before calling the browser API. `vars`, legacy lint options,
  filesystem callbacks and explicit requests for SVG file inlining are rejected
  as unsupported browser settings. Node's retained engines/defaults do not change.
- Ordinary relative/absolute image and link URLs remain URLs. Transform performs
  no network request, existence check, implicit base-path conversion or title
  lookup. Browser DOM insertion may naturally request permitted image resources;
  that is the application's document-loading behavior, not transform-time I/O.
- Preserve imsize dimensions/title/alt parsing and safe style dimensions. Keep
  original anchor IDs/legacy auto URLs and pinned attrs behavior for supported
  input. Do not replace filesystem SVG reads with implicit fetch. An SVG image
  URL remains an image; explicit raw inline SVG passes the existing sanitizer.
- `result.assets` does not become a filesystem manifest. Explicit extension
  `meta.script/style/csp` resource declarations still merge/deduplicate through
  document contexts. The renderer neither imports nor executes arbitrary URLs
  from frontmatter/resource metadata. The example loads known runtime/styles
  explicitly. Application resource policy remains application-owned.
- Custom plugins and highlighters are trusted caller code. Their own Node imports
  or external effects are outside the guaranteed builtin graph. Browser plugin
  documentation must identify required runtime/style imports and host effects.

### Unsupported-input recognizer and fixtures

`BrowserUnsupportedFeatureError` has stable code `BROWSER_UNSUPPORTED_FEATURE`,
feature `include | materialized-include | option | builtin`, and an actionable
alternative. Content errors include the original one-based line/column and source
label `<input>` unless the document/child has an explicit diagnostic label. Options
errors identify the offending key/ID and happen before parsing. No filesystem
meaning is assigned to those labels.

Recognize actual standalone include/notitle forms and standalone materialized
open/close directive lines, including valid opening directives lacking a closing
block. Reject at root or in an actual nested list/quote/table/term child. A malformed
lookalike or prose containing an include-looking substring is not a directive.
Minimal does not recognize YFM tables: the table fixture is standard-only.

Use native parser-aware block/inline recognition in the real parse, with source
positions. Fence/code-block/inline-backtick rules, escapes and multiline spans
must retain their existing boundaries; raw HTML comments/attributes are examples,
not executable directives. No regex over the complete input, second parse that
executes user rules/IDs twice, stripped comments/code as replacement source, or
new Markdown scanner framework. If native hooks require a small position tracker,
prove it on these fixtures before choosing its implementation. The22frozen cases
include the following required distinctions in both entries unless scoped:

| Input/context                                                          | Result                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| `{% include [child](child.md) %}`; notitle with fragment               | throw include                                           |
| Same standalone directive in list or blockquote                        | throw include                                           |
| Same directive in actual YFM table cell (standard only)                | throw include                                           |
| `{% included (child.md) %}` with/without close; standalone endincluded | throw materialized-include                              |
| Fenced/indented examples and single/double/multiline backtick spans    | render as code; no error                                |
| Escaped opener/keyword/endincluded                                     | literal; no error                                       |
| HTML comment or quoted HTML attribute example                          | no error (existing HTML/sanitizer policy still applies) |
| `Example: {% include [child](child.md) %}`                             | literal prose; no error                                 |
| Empty target / includeSomething lookalike                              | ordinary Markdown; no error                             |
| `{{ value }}` and conditional-looking text                             | literal; no implicit engine                             |

Fixtures must also cover CRLF, even/odd escapes, variable backtick runs, nested
source labels and custom child parsing through both tokens-only and capsule APIs.
For all rejected inputs, demonstrate no transform-time network/file attempt or
partial result; guard failures leave the next owned root usable.

## Shared implementation boundary

Extract only the small host-independent parser/render/lifecycle core necessary to
avoid importing Node host services. A finite internal host object supplies:
the builtin installation list, preprocessing policy, diagnostic/reporter factory,
and sanitizer/CSS implementation. Node supplies its current defaults; browser
supplies its explicit composition and unsupported-feature validation.

Parameterize the existing named-plugin resolver with that finite builtin table
instead of importing `DefaultPlugins` in the shared resolver. Preserve existing
ordering, requirements, conflict checks and callback identity. Do not implement a
second plugin configuration language or expose a general service registry.

Split the pure sanitizer policy/value checks from host CSS/HTML traversal plumbing
only as needed. Node keeps its current CSS wrapper and exact sanitizer options;
browser uses the real no-source-map CSS adapter and ordinary upstream browser
exports. Shared fixtures must demonstrate identical required policy decisions,
including CSS escaping, SVG URLs and extension allowances. No removal of the final
sanitizer, weaker URL rules, regex-only HTML filter, or fake CSS parser is allowed.

Keep pure token/ID/URL helpers out of Node filesystem/newline modules. Preserve
Node-only compatibility exports through their existing wrappers. Reuse reviewed
document-context logic; do not copy it into a browser implementation. Any pure
declaration extraction must preserve `ParserEnv` augmentation identity across
`/types`, `/document`, and the new browser entry types.

## Build and package contract

Browser outputs are built from source under ordinary browser package conditions,
not by re-exporting the Node CJS `lib/` graph. **New browser subpaths are ESM-only.**
The exact new manifest entries are:

```json
{
  "./browser": {
    "import": {
      "types": "./dist/browser/standard.d.mts",
      "default": "./dist/browser/standard.mjs"
    }
  },
  "./browser/minimal": {
    "import": {
      "types": "./dist/browser/minimal.d.mts",
      "default": "./dist/browser/minimal.mjs"
    }
  }
}
```

There is no require condition, outer default/types/node condition, CJS browser
artifact or fallback to Node. Even Node24 require(ESM) support must not make
`require('@diplodoc/transform/browser')` succeed: its expected code is
`ERR_PACKAGE_PATH_NOT_EXPORTED`, before loading the Node root. A CommonJS host
may use `await import('@diplodoc/transform/browser')` before entering the synchronous
transform boundary. Document ordinary ESM usage and test CJS static require/type
rejection plus dynamic-import success. A web bundler's require-based entry must
also fail resolution, rather than follow a Node fallback. Existing Node root CJS,
ESM facades, main/module/types, legacy paths and runtime/style exports are unchanged.

Keep browser entry metadata separate from `stableEntries` (whose existing generator
adds both Node formats). A finite `browserEntries` map in the existing public-api
inventory owns only these two paths, output names and import conditions. The
manifest verifier must consume that map without generating Node facades for it.
A separate source build uses esbuild `platform:'browser',format:'esm',bundle:true,
splitting:true,target:'es2018',outdir:'dist/browser',outExtension:{'.js':'.mjs'}`
and linked maps/notices, with standard package resolution conditions and no
alias/fallback/define/polyfill/custom resolver. Module-based dependency browser
branches remain permitted only with the inventory/runtime evidence below.

Emit real `.d.mts` public declarations from the implementation. No browser facade
may export from the full Node typings/configuration/sanitizer declaration graph
just to borrow a type: those imports can require Node ambient declarations even
when runtime tree shaking removes them. Extract only shared pure domain types
needed by both hosts. Keep one canonical ParserEnv/interface augmentation identity
across Node/types, document and both browser entries; preserve existing Node
native declaration behavior through reexports. Browser sanitizer options must
reference the pure allowed data subset, not sanitize-html/htmlparser2 Node parser
options. Private CSS adapter declarations stay private.

Strict installed browser projects use ES2022+DOM libs, `types:[]`,
`skipLibCheck:false`, module ESNext/Bundler resolution, with no @types/node in
their manifest. Inspect the compiler source-file/resolution trace to reject any
transitive @types/node or Node builtin declaration import; negative globals tests
must reject process, Buffer, require and NodeJS. Prove augmented ParserEnv through browser handle/child callbacks
and Node existing augmentation fixtures. Type-negative fixtures reject Node-only
options, unavailable IDs, foreign config shapes and CJS static import/require.

Use separate minimal/standard entry reachability, with shared ESM chunks where
appropriate. Ship all referenced chunks, source maps and third-party notices in
the tarball. Do not accidentally expose temporary files or absolute development
paths. The entry manifest/build must reject export drift. An ESM facade alone
cannot supply tree shaking when its implementation imports the entire CJS graph.

Report raw/minified/gzip/brotli and reachable-module inventories for both example
entries with and without a fixed explicitly selected highlighter grammar. Use
identical bundler/Node/lock settings. Record measurements, not a size threshold
invented for #446. Library runtime/styles and editor assets are separate entries
in the report; do not count editor savings this task has not demonstrated.

## Example to implement and run

Add a small independent example using an installed immutable tarball and a normal
browser bundler configuration. It must work with no webpack fallback settings,
Node polyfill package or resolver alias. This is proposed example code, not a
claim that these entry points already exist:

```typescript
import transform, {createParser} from '@diplodoc/transform/browser';
import '@diplodoc/transform/runtime';
import '@diplodoc/transform/styles';

const documentTarget = globalThis.document.querySelector<HTMLElement>('#preview')!;
const parser = createParser({needTitle: true});
const document = parser.parseDocument('# Browser example\n\nText');
const html = parser.compileDocument(document);
documentTarget.innerHTML = html;

// Or render one document synchronously.
const output = transform('![Example](example.png =320x180)');
console.log(output.result);
```

Show explicit extension composition with `transform({bundle:false})` from the
extension's normal browser export plus its documented runtime/styles imports.
Demonstrate cut/tabs/file resource metadata, behavior after DOM insertion and
repeated rendering without duplicate runtime registration. Do not auto-load
untrusted resource URLs found in metadata.

Show caller-owned lazy loading before the synchronous boundary:

````typescript
import {createHighlightJsHighlighter} from '@diplodoc/transform/browser';

const [{default: hljs}, {default: javascript}] = await Promise.all([
  import('highlight.js/lib/core'),
  import('highlight.js/lib/languages/javascript'),
]);
const highlighter = createHighlightJsHighlighter(hljs, {
  languages: {javascript},
  allowedLanguages: ['javascript'],
});
const output = transform('```javascript\nconst answer = 42;\n```', {highlighter});
````

The example pins the already tested Highlight.js11.12.0; these extensionless core/
grammar paths are its normal exports. The browser entries reexport the shared pure
explicit highlighter helper, not the Node facade; no additional browser/highlighter
subpath is needed. Old10packages require their version-appropriate .js subpaths
as already documented by6939. Never import `/highlighter/legacy`.
No highlighter is required for the basic example; code stays correctly escaped.

## Serialized implementation phases (not authorized by this refresh)

1. **Shared core/diagnostics/registry/sanitizer, preserving Node.** Extract the
   finite host factories and pure types; keep one lifecycle/capsule implementation,
   one attrs-default resolver, existing Node collectors/reporter behavior and CJS
   implementation graph. Keep Node fixtures/CLI/Viewer graphs green. No dependency
   upgrade or public browser export in this prerequisite commit.
2. **Minimal ESM entry.** Introduce the separate minimal graph, closed options,
   real CSS adapter and mandatory sanitizer/guard. Prove its exact empty preset,
   prelude, protected-source distinctions and lack of standard-only imports.
3. **Standard ESM entry.** Reuse the frozen17-ID order/options and actual companion
   browser branches; complete shared pure helper cuts while preserving semantics.
   Reuse current table code/true-inline default/false compatibility. Do not create
   another table scanner or optional-attrs implementation.
4. **Installed package/types/browser example.** Strict DOM-only `.d.mts` projects,
   manifest negative require cases, ordinary esbuild and Rspack consumers,
   real Chromium/Firefox/WebKit including runtime/styles/highlighter/resources,
   immutable tarball and reproducible size/module reports.
5. **Regression/adoption review.** Current-head source/package CI plus actual CLI/
   Viewer regression gates and independent review before integration/publication.

6946 currently owns imsize/\*, its legacy image-size warning/migrator and
finite export insertion on another branch. Do not edit/copy551imsize into a browser
variant or concurrently modify the export generator. Root must serialize6946
first; then a pure imsize factory can be extracted once, preserving its accepted
warning scope, native fallback, legacy grammar and no-removal-before6contract.
Phase1 can avoid imsize and public export-manifest edits meanwhile.

6944A may implement its narrow heading-ID/fragment correction and standalone
YFMLint selector without changing defaults. Root ordering is6940 shared pure
parser/prelude extraction first, preserving551 Node true;6944B then changes that
one shared default to false and adds explicit CLI/Viewer compatibility choices.
The two tasks cannot independently implement the same resolver or flip its
default simultaneously. Root serialization/rebaseline and fixture review are
required before the policy change. 6944 also owns the one
authoritative standalone heading-ID helper used by anchor rendering and fragment
selection; 6940 must preserve it as Node-free shared parsing, not copy the grammar
into another browser selector. Viewer explicit attrs compatibility is separately
owned. No source changes to either other task are part of this SDD refresh.

## Acceptance and remaining gates

1. Installed immutable tarball in a clean example project; record source revision,
   archive hash, dependency versions and exact consumer bundler configuration.
   Test native ESM/declarations, CJS require rejection and CJS dynamic-import usage; strict browser
   TypeScript uses DOM/ES libs with `types:[]`, `skipLibCheck:false`, and Bundler
   resolution. Native Node declaration checks preserve the existing root API.
2. Plain esbuild browser and Rspack application bundles without fallback,
   alias/stub plugins, polyfill dependencies, injected `process`/`Buffer`, or custom
   defines. Inventory ordinary upstream disabled optional branches explicitly;
   inspect runtime references, not just string matches against a metafile.
3. Real Chromium, Firefox and WebKit execute rendering with `process`, `Buffer`,
   Node `require`, and filesystem globals absent. No JSDOM-only acceptance.
   Import/runtime tests, actual DOM insertion and browser console/network capture
   prove no mandatory Node dependency or transform-time resource fetch.
4. Supported standard features, metadata, title/headings, anchors/attrs, table
   defaults, image dimensions, visibility and extension resources. Minimal graph
   contains no standard-only implementations or implicit highlighter. Unsupported
   options/directives produce the documented failures outside protected examples.
5. Hostile HTML/URLs/encoded and escaped CSS, style tags/attributes, malformed CSS,
   sourceMappingURL comments/data, SVG use/SMIL/namespace references, unknown
   highlighter languages and malicious callback HTML. Preserve safe anchor IDs,
   dimensions, local SVG references, necessary runtime attributes and extension
   CSS allowances. Compare required sanitizer decisions with Node fixtures; do
   not weaken policy to make a browser test pass.
6. Document A/B, parseA/parseB/compileA, derived tokens/foreign handles, initializer
   and render errors, child fragments/resources and augmented ParserEnv behavior
   match the reviewed context contract. No concurrency or opaque-generator reset
   claim. Node retained-engine, parser and full package regressions still pass.
7. The example works from the tarball in both basic and explicit highlighter
   modes, with extensions/runtime/styles. Capture reachable graph and reproducible
   size reports. Root/independent review and current-head CI precede integration.

The bounded sanitizer probe is the only executed browser runtime evidence at design
time. The v2 source-only contract verifier is additionally executed, not a rendering
proof. Existing6951/table installed evidence is baseline evidence, not browser acceptance.
Full Transform graph, browser types, extension/runtime interactions, companion
browser exports, size reports and immutable example acceptance remain open.
No dependency/lock changes, publishing, consumer checkout edits, Tracker comments,
or PR actions are authorized by this design task. Node-engine removal remains
outside this task even if a browser bundle intentionally excludes those modules.
