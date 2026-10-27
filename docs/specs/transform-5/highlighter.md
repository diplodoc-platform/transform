# Explicit synchronous highlighter

Status: Approved by the coordinator for implementation on the Transform 5 branch.

Task: [DOCSTOOLS-6939](https://st.yandex-team.ru/DOCSTOOLS-6939).
Base: `8a33e2bd9f708b5b12dab8e5ea011a2f9299440f` (reviewed native modules and typed plugin configuration).
Branch: `codex/docstools-6939-highlighter`.

## Problem and scope

`src/transform/md.ts` always invokes `makeHighlight(highlightLangs)`. The factory
in `highlight.ts` resolves `highlight.js` even when the caller did not request
highlighting. It registers additional grammars on that imported instance, assumes
`getLanguage` is callable, and returns a MarkdownIt callback. This makes the
optional installed peer affect default HTML and makes a bundler select a large
implementation without an explicit application decision.

The replacement makes loading an application responsibility. Transform stays
synchronous. An omitted highlighter never resolves, imports, registers or invokes
Highlight.js. It renders escaped source with the ordinary MarkdownIt fence
renderer, including its language class. A highlighter can be loaded asynchronously
before the existing synchronous Transform call.

Source requirements:

- [#305](https://github.com/diplodoc-platform/transform/issues/305) reports an unused
  1.5 MB Highlight.js chunk. Acceptance requires a real import graph check.
- [#756](https://github.com/diplodoc-platform/transform/issues/756) reports
  `hljs.getLanguage is not a function` with version 11 and bundler module resolution.
  Validate instance/default/namespace shapes explicitly, including an installed
  package bundled reproduction. The original report does not provide a complete
  bundler configuration; do not claim its exact environment was reproduced.
- [#519 comment](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-2364164717)
  requests loading an implementation outside transformation, including `import()`.
- [#446](https://github.com/diplodoc-platform/transform/issues/446) also concerns the
  editor and broader client packaging. This task only references it. It does not
  complete DOCSTOOLS-6940 or provide a browser-safe Transform entry point.

No async Transform API, loader registry, global cache, language autodetection,
editor changes, Liquid/YFMLint removal or code syntax changes are included.

## Core contract

Add `highlighter?: Highlighter` to `OptionsType`. The closed
`TransformCoreOptions` builder derives this named option automatically. It is a
core option, not an option of the `code` feature: MarkdownIt fences also exist
when that feature is disabled or the plugin preset is `none`.

```typescript
export interface HighlightResult {
  /** An HTML fragment inside code, never a pre/code wrapper. */
  readonly html: string;
  /** Individual CSS class tokens; escaped by Transform at the attribute boundary. */
  readonly classes?: readonly string[];
}

export interface Highlighter {
  (source: string, language: string): HighlightResult | undefined;
  /** @deprecated Compatibility hook for highlightLangs, removed no earlier than Transform 6. */
  registerLanguage?: (name: string, factory: HighlightLanguageFactory) => void;
}
```

`source` is exactly the source that reaches MarkdownIt's highlighter after the
existing prompt stripping and term placeholder preparation. `language` is the
first fence-info word supplied by MarkdownIt, or the empty string. Transform does
not infer a language from source. A generic callback may decide how to handle an
empty language; the Highlight.js adapter never autodetects it.

`undefined` means render the original source escaped using the ordinary fence
renderer. A result with `html: ''` intentionally represents empty output; it is
not a fallback sentinel. For a result, Transform emits a single
`<pre><code class="...">...</code></pre>` wrapper; it omits the class attribute if
no classes are supplied. Each supplied class must be a nonempty token without
whitespace; malformed values produce an actionable `TypeError`. Escape class
attribute values, including quotes, rather than interpolating them as markup.
Do not accept full pre/code wrapper output as a second public protocol.

The fragment contract is trusted renderer output, just like other plugin output.
The existing final sanitizer still runs by default. This option neither bypasses
that sanitizer nor forces sanitization on consumers that explicitly disabled it.
All fallback source is escaped even when `needToSanitizeHtml: false`.

A custom callback exception propagates; silently dropping an application bug is
not part of this new contract. A Promise, string, null or otherwise malformed
result is a clear `TypeError` naming the highlighter contract. A nonfunction or
Promise supplied as `highlighter` fails during parser initialization, before
plugins or parsing. Types reject async callbacks and async module values. Runtime
checks protect JavaScript callers as well.

The deprecated registration property is optional. Plain callbacks implement no
Highlight.js API and have no dependency on it. It is the finite bridge required
to retain the existing grammar option while consumers migrate.

## Explicit Highlight.js adapter

Expose named `createHighlightJsHighlighter` and the public core types at the stable
`@diplodoc/transform/highlighter` entry. This module has no static or dynamic
Highlight.js import, no peer resolution and no import side effects.

The instance contract has callable `getLanguage(name)` and a `highlight` method
returning a string `value`. Modern and versioned legacy call shapes are accepted;
the peer-floor amendment below defines the exact dispatch. An optional `registerLanguage` is required only when language
factories need registration. Public declarations use structural types, not an
import from Highlight.js, and remain valid without that optional peer installed.
Use a generic adapter signature so `languages` factory types are inferred from
the supplied instance's `registerLanguage` parameter; actual Highlight.js 10 and
11 `LanguageFn` values must typecheck without unsafe consumer casts. Do not widen
consumer callbacks to `any` or falsely provide a typed library API through the
core's opaque `HighlightLanguageFactory` compatibility type.

The planned exported adapter signature is structurally expressed as follows;
its implementation must prove inference with the real peer declarations:

```typescript
export interface HighlightJsModernApi {
  readonly versionString?: string;
  getLanguage(name: string): unknown;
  highlight(
    source: string,
    options: {
      language: string;
      ignoreIllegals: boolean;
    },
  ): {value: string};
}

export interface HighlightJsLegacyApi {
  readonly versionString: string;
  getLanguage(name: string): unknown;
  highlight(language: string, source: string, ignoreIllegals: boolean): {value: string};
}

export type HighlightJsApi = HighlightJsModernApi | HighlightJsLegacyApi;

export type HighlightJsLanguage<Api> = Api extends {
  registerLanguage(name: string, factory: infer Factory): void;
}
  ? Factory
  : never;

export interface HighlightJsOptions<Api> {
  readonly languages?: Readonly<Record<string, HighlightJsLanguage<Api>>>;
  readonly allowedLanguages?: readonly string[];
}

export declare function createHighlightJsHighlighter<Api extends HighlightJsApi>(
  module: Api | {readonly default: Api},
  options?: HighlightJsOptions<Api>,
): Highlighter;
```

A raw Highlight.js instance is accepted by the adapter, not directly by the core
option. This keeps the core callback independent of one library's API and module
interop. Passing only a MarkdownIt-style string callback would make wrapper
ownership and fallback ambiguous; the small fragment result makes both explicit.
The separate legacy loader is the only module that depends on the optional peer
at runtime; the ordinary structural adapter does not need a library dependency.

Adapter options:

- `languages`: a finite readonly name-to-factory map to register immediately on
  the supplied instance, before transformation. Omit it when the application
  already registered its languages. Preserve each factory's original identity.
- `allowedLanguages`: optional readonly list of fence language identifiers.
  Omitted means any language recognized by the supplied instance; an empty list
  disables all highlighting. Matching is exact and case-sensitive, including
  aliases: an alias must be listed itself when filtering is enabled. The adapter
  does not import a grammar from its name. Unknown names safely fall back.

`languages` controls registration; `allowedLanguages` controls selection. Use the
core Highlight.js entry plus explicitly imported grammars to reduce the loaded
implementation. Choosing the full entry intentionally retains all its languages.

The adapter accepts these finite forms:

1. A direct instance, including CommonJS `require('highlight.js')` and ESM default
   import.
2. An object with a single default export containing that instance, including the
   namespace returned by `await import('highlight.js')` or `import * as`.

Prefer a valid direct instance when both shapes are present. Otherwise unwrap
one `default` level and validate. Do not recursively guess nested defaults,
execute callable factories or infer a module from named language exports. Bind
method calls to the validated instance; never call detached methods. A missing
method, Promise, null, unrelated module or unsupported nested namespace causes a
`TypeError` at adapter construction with the required method and accepted forms.
This resolves the module-shape failure before document rendering.

The adapter returns `{html, classes: ['hljs', language]}` for a recognized,
allowed, nonempty language. This preserves existing Highlight.js wrapper classes.
Missing, unknown and filtered languages return escaped source with `['hljs']`,
matching the old installed-peer plain-code output. A Highlight.js exception while
highlighting a recognized language falls back to escaped source and retains the
recognized language class, as the old factory does. Invalid return shapes fail
with an actionable error rather than rendering `[object Object]`. Registration
and `getLanguage` errors propagate: neither is an expected code-parse failure.

Registration mutates only the caller-supplied instance. There is no Transform
singleton or cloning promise. Applications requiring isolation should supply
independent instances (for example Highlight.js 11 `newInstance()`); reuse is
owned by the application. Do not call `configure()` or change global options.
Freeze/copy the selection list so subsequent mutation of the caller's list does
not silently change an existing adapter.

````typescript
import transform from '@diplodoc/transform';
import {defineTransformOptions} from '@diplodoc/transform/configuration';
import {createHighlightJsHighlighter} from '@diplodoc/transform/highlighter';

// Highlight.js 11 native Node.js / bundler paths. Loading precedes transform.
const [module, javascript] = await Promise.all([
  import('highlight.js/lib/core'),
  import('highlight.js/lib/languages/javascript'),
]);
const highlighter = createHighlightJsHighlighter(module, {
  languages: {javascript: javascript.default},
  allowedLanguages: ['javascript', 'js'],
});
const options = defineTransformOptions({core: {highlighter}});
const output = transform('```js\nconst answer = 42;\n```', options);
// output is an ordinary synchronous Transform result, never a Promise.
````

For Highlight.js 10.x native Node.js consumers, replace only the import pair with
its version-specific paths, then use the same adapter construction:

```typescript
const [module, javascript] = await Promise.all([
  import('highlight.js/lib/core.js'),
  import('highlight.js/lib/languages/javascript.js'),
]);
```

Extensionless 10.x subpaths may resolve in bundlers but fail in native Node.js.
Conversely, 11 does not export `lib/core.js`, and its language `.js` entry is a
deprecated shim. There is no single selected-core subpath spelling promised across
both majors. The full root import is portable across all tested peer versions:

```typescript
const module = await import('highlight.js');
const highlighter = createHighlightJsHighlighter(module);
const output = transform(content, {highlighter});
```

Native selected-core/grammar fixtures use the explicit paths above on 10.7.0 and
11.12.0; full-root runtime fixtures cover all four audited versions. The typed
shape is verified against the actual 10.7/11 published declarations. The adapter does not invent support for untested engines;
a different engine uses the small callback contract directly.

## Legacy migration and defaults

Removing implicit initialization changes output when Highlight.js happens to be
installed. This is the explicit default change requested for Transform 5. It is
not an assertion that a warning shipped in Transform 4. Announce it in the major
migration guide and verify CLI and Viewer adapters before release.

`highlightLangs` remains accepted and marked deprecated, with descriptor code
`HIGHLIGHT_LANGS`, replacement `createHighlightJsHighlighter(instance, {languages})`
and announced removal **no earlier than 6.0.0**, subject to the release-before-
removal requirement in ADR-009. The Transform 5 warning release is a future release
gate; this task does not authorize publication or modifying master.

When an explicit highlighter supplies `registerLanguage`, nonempty legacy entries
are registered during parser initialization with the original callbacks. Emit
one scoped warning for this actual legacy use using the existing reporter and
`option: 'highlightLangs'`, plus path if supplied. Empty/undefined maps do not warn
or trigger loading. The adapter's selection filter still applies. Prefer the new
adapter's `languages` option, which registers once at adapter construction instead
of on every transform call. The adapter implements the compatibility registration
method as a closure bound to its supplied instance.

With nonempty `highlightLangs` and no compatible explicit highlighter, fail before
parsing with an error giving both migration routes below. Do not silently discard
custom grammars or resume automatic loading. This is a documented migration
error, not removal of the option. A callback with no registration hook is valid
when legacy grammars are not requested. The compatibility policy entry does not
silence warnings or magically provide a missing implementation; `current` and
`legacy` both require an explicit adapter in Transform 5. No new policy entry is
needed solely to select the highlighter.

Provide an explicitly imported finite convenience factory at
`@diplodoc/transform/highlighter/legacy`:

```typescript
import {createLegacyHighlighter} from '@diplodoc/transform/highlighter/legacy';

// Explicit opt-in to full optional peer loading and old output.
const highlighter = createLegacyHighlighter(highlightLangs, {log});
transform(content, {highlighter, log});
```

Only invoking this factory resolves the optional `highlight.js` peer. Importing
the root, parser, configuration, or dependency-free highlighter adapter never
references this loader. The legacy factory registers the supplied factories and
uses the same adapter/wrapper contract. It issues a scoped
`LEGACY_HIGHLIGHTER_FACTORY` warning naming the explicit-import replacement and
6.0.0 removal target. Missing optional peer preserves the previous safe plain-code
fallback; malformed installed modules and registration failures get clear errors.
Its logger scope is factory-owned, not a global warning registry.

The existing callable `lib/highlight` / `lib/highlight.js` compatibility entry stays
available with its old map argument and MarkdownIt-callback return shape. Implement
it as a thin wrapper around the explicit legacy factory, with an optional second
logger scope argument; do not redirect that existing callable to a structurally
incompatible return value. The new legacy stable entry and this old alias share
one loader implementation. Keep both entirely outside the default import graph.
Do not remove the existing optional peer range (`^10.0.3 || ^11`) in this task.

Preferred migration, without the legacy convenience loader:

```typescript
import hljs from 'highlight.js';
import {createHighlightJsHighlighter} from '@diplodoc/transform/highlighter';

const highlighter = createHighlightJsHighlighter(hljs, {languages: highlightLangs});
transform(content, {highlighter});
```

| Caller                                          | Transform 5 behavior                                          |
| ----------------------------------------------- | ------------------------------------------------------------- |
| No highlighter and no legacy grammars           | Escaped MarkdownIt output; no HLJS resolution                 |
| Explicit callback                               | Synchronous fragment contract; callback errors propagate      |
| Explicit adapter, default options               | All languages already present on supplied instance            |
| Adapter with selection list                     | Only listed identifiers; unknown/filtered source escaped      |
| Explicit adapter plus nonempty `highlightLangs` | Legacy factories retained; scoped warning                     |
| Nonempty `highlightLangs` alone                 | Actionable migration error before parsing                     |
| Explicit legacy factory                         | Optional full peer resolution and legacy HTML; scoped warning |

## Consumer migration

CLI's `src/commands/build/run.ts` currently constructs a parser through
`configureTransform()` in `src/commands/build/transform-configuration.ts`. The
strict builder enumerates core keys. Add the explicit highlighter to that mapping
and initialize the full existing CLI-owned Highlight.js dependency at an
application/module boundary. CLI already owns `highlight.js ^11.10.0`, and uses
its styles separately. Preserve the current full language set and HTML by using
the adapter without `allowedLanguages`. Do not narrow languages, remove theme
assets or introduce a new user setting during this compatibility migration.
Audit other direct Transform calls used by CLI features as well as parser calls.

Viewer's actual `packages/models/src/transformer/transform-document.ts` passes
`highlightLangs` from `utils/highlights.js`, containing YQL and YQLS from the
intranet plugin package. The models package owns `highlight.js ^11.11.1`. Build
an explicit adapter at the owning model/worker initialization boundary, register
those two factories there, and pass `highlighter`. Each native worker initializes
its own module; no callback crosses the serialized worker message protocol.
Preserve standard languages, YQL/YQLS, wrapper classes and code feature behavior.
Viewer currently sets `needToSanitizeHtml: false`; preserve that explicit consumer
policy and its separately owned security boundary. Do not advertise default
Transform sanitization as covering this Viewer path.

Consumers are separate preserved worktrees. Their owners implement and validate
the migrations after root approval; this spec does not authorize edits to them.

## Acceptance and implementation plan

1. Implement core types/normalization and dependency-free adapter; split the
   optional loader from `md.ts`'s import graph. Add stable export metadata through
   the established facade generator. Keep CJS/ESM functions backed by the canonical
   implementation graph. Validate generated declarations without the peer.
2. Add migration docs and both scoped descriptors. Keep existing aliases and
   opaque legacy grammar types; preserve identity of grammar callbacks forwarded
   to actual Highlight.js. Do not bypass deprecated-use diagnostics in adapters.
3. Test source behavior and installed consumers against the immutable package;
   migrate real CLI and Viewer independently, then review all evidence.

Required functional fixtures:

- No peer installed and peer installed but no option: identical escaped output,
  including `<`, `>`, `&`, quotes and literal HTML; no automatic highlighting.
- Full adapter reproduces current snapshots for real TS/YAML/shell code, terms
  whose placeholders are split by grammars, malicious term titles, prompts,
  multiline spans, `linenos`, `wrap`, copy buttons and original token restoration.
  Migrate highlighting-dependent tests explicitly; do not bulk-accept snapshots
  that silently lose highlighting.
- Selected JavaScript with aliases, unknown language, empty language, empty
  selection, excluded installed language, empty source/result, and two separate
  instances with different custom grammars. No detection or unexpected grammar
  registration. Verify callback `this` binding.
- Generic callback, undefined fallback, unsafe output through the default
  sanitizer, escaped fallback without sanitizer, throwing callback, Promise and
  malformed result. Preserve all existing security fixtures.
- Direct CJS instance, ESM default and dynamic namespace for actual HLJS 10 and
  11; malformed and Promise modules; bad register/getLanguage/highlight methods;
  unsupported nested namespace; factory and highlight exceptions follow policy.
- Legacy grammars through explicit adapter: exact factory/API identity, warning
  reaches injected logger and collected diagnostics, independent transform scopes,
  empty map has no warning; nonempty map without adapter has actionable error.
  Legacy factory with and without peer, old callable deep import, both aliases,
  and warning lifetime have separate coverage.

Strict type fixtures under Node16, NodeNext and bundler resolution:

- `defineTransformOptions({core: {highlighter}})` and ordinary Transform accept
  the callback/adapter, retaining synchronous and `tokens: true` return types.
- Actual HLJS 10/11 grammar factories infer their library's API types; no peer is
  needed for a plain callback consumer. ESM/CJS package declarations stay strict.
- Negative checks reject async callbacks, missing result HTML, invalid class lists,
  unsupported module shape, mismatched grammar signatures and Promise instances.

Real loading and bundle evidence for #305/#756:

- A fresh installed-package Node child intercepts/records actual module resolution
  and checks `require.cache` after importing root/parser/configuration and rendering
  fenced code without a highlighter. No `highlight.js` resolution/cache entry is
  allowed even with the optional peer installed. Repeat with no peer installed.
- Build a minimal external consumer using esbuild with `bundle: true`, a real
  installed Transform tarball and a metafile. Bundle the Transform-owned graph;
  mark unrelated external dependencies individually, never externalize Transform
  itself or broadly externalize everything. Assert zero Highlight.js inputs or
  generated imports/chunks in the no-highlighter case and in the structural-adapter
  import-only case. It is a graph test, not a promised byte-size/browser-support
  claim. Confirm the intentionally imported legacy entry is the only loader path.
- In a second mini consumer, use caller-owned dynamic imports of HLJS core and a
  selected grammar. Verify they appear only in the explicitly selected dynamic
  graph, await them, then render synchronously. Use real namespace interop with
  bundler module resolution to cover the #756 failure mode.
- Full tests, typecheck, lint, build and installed native CJS/ESM package acceptance;
  CLI full tests and real build fixture; Viewer model and native worker tests plus
  custom YQL/YQLS highlighted output. Existing code output/sanitizer assertions are
  mandatory and cannot be replaced by a mock-only adapter test.

## Review and release gates

Implementation starts only after root approves this design. Child PR targets the
major integration branch, never master. Root review, green GitHub checks, further
independent reviews, and real CLI/Viewer acceptance remain merge gates. No
publication or removal is authorized here. No source issues close solely from
this proposal: #305 needs loading/bundle proof, #756 needs the supported real
module-shape reproduction, and #446/#519 remain references.

No unresolved product question prevents this proposal. The coordinator must
approve the explicit default change, finite legacy route, and callback failure
policy before implementation; this is the requested SDD gate rather than a new
user approval requirement.

## Peer floor audit: implementation gate

The official npm `highlight.js@10.0.3` archive was inspected on 2026-10-27:
`https://registry.npmjs.org/highlight.js/-/highlight.js-10.0.3.tgz`, SHA-1
`5effcc58420f113f279a0badb8ac50c4be06e63b`. Its `lib/core.js:957` implements
`highlight(languageName, code, ignore_illegals, continuation)` only. A real
`highlight(source, {language, ignoreIllegals})` call fails with `Unknown language`,
whereas the legacy call highlights JavaScript correctly. The archive contains no
`.d.ts` files and its manifest declares no `types` field. Runtime support must not
be described as validation against nonexistent bundled declarations.

Additional official archives establish the boundary:

- 10.6.0, SHA-1 `0073aa71d566906965ba6e1b7be7b2682f5e18b6`: legacy-only
  implementation at `lib/core.js:1581`.
- 10.7.0, SHA-1 `2b4232f45f000a72ae6ef05fe83b831d75add6cb`: modern overload
  at `lib/core.js:1587`; the legacy-call deprecation starts at this version.

Approved amendment: keep `^10.0.3 || ^11` and
select the legacy call for a validated `versionString` in 10.0.x through 10.6.x.
Use the modern call for 10.7+, 11, and versionless structural modern instances.
Do not guess from function arity or execute a trial call. Extend the structural
input type with a legacy-signature alternative requiring a version string validated
at construction. Released 10.x/11.x instances are supported; malformed versions
are actionable errors. Do not infer call semantics from their TypeScript signatures.
Keep module normalization, selected languages and fallback behavior unchanged.

Add real runtime acceptance at 10.0.3, 10.6.0, 10.7.0 and 11; verify no library
deprecation console warning from the chosen call. At 10.0.3 use an independently
typed structural fixture and actual JS runtime, and clearly distinguish that
from real bundled-declaration validation at 10.7/11. The peer range remains unchanged; this amendment is approved for implementation.

### Declaration discrepancy and verified implementation

The official 10.7.0 archive still declares only the legacy call in
`types/index.d.ts:18`, even though its runtime implements the modern overload.
`versionString` is declared as broad `string` at line 37. The approved public
contract therefore uses a simple modern-or-legacy structural union; the legacy
alternative requires a version string, and runtime validation/dispatch remains
unchanged. Consumers need no cast. A conditional generic that tried to reject
literal non-10 legacy versions was deliberately omitted because it harmed
inference for valid union-typed instances and did not improve runtime truth.

The implementation now passes actual installed package checks for runtime
10.0.3, 10.6.0, 10.7.0 and 11.12.0, native/bundler strict declarations for 10.7/11,
no-peer core/structural types, fresh resolution/cache checks, and esbuild's real
installed dependency graph with caller-owned dynamic imports. Source tests retain
existing highlighting snapshots by explicitly supplying a known highlighter;
new tests cover the unhighlighted code feature pipeline. Real CLI and Viewer
migration/validation remain separately owned acceptance gates.

User migration instructions: [Transform 5 highlighter](../../migrations/transform-5-highlighter.md).
