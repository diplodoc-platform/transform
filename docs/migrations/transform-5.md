# Migrating to Transform 5

**Language:** English | [Русский: самостоятельное руководство по миграции](transform-5-ru.md)

**TL;DR:** Inventory the actual dependency graph and browser assets, prepare Node
24 and markdown-it 15, explicitly configure attributes and highlighting, then
validate document contexts, plugins and rendered output. Keep a genuine Transform
4 for hosts that require it. As of 2 November 2026, stable Transform 5 publication
is held; the merged major source and locally reviewed consumer patches are not published releases.
Recheck the registry and compatible dependencies before migration.

This guide describes the Transform 5 migration contracts. Validate your own
documents and integrations against the exact installed package before adoption.

## Imports and runtime

The package requires Node.js 24 or newer; current validation uses Node.js 24.
The synchronous root API works with both native ESM and CommonJS:

```ts
import transform, {transform as namedTransform} from '@diplodoc/transform';
import type {ParserEnv} from '@diplodoc/transform/types';

const output = transform('# Heading');
```

CommonJS can use `const transform = require('@diplodoc/transform')`. Use the
stable `/parser`, `/types`, `/document`, `/configuration` and `/plugins/<name>`
entries for the corresponding APIs. The explicit `/browser` entry is ESM-only;
CommonJS callers can use dynamic `import()`. Runtime and styles are separate
imports and do not execute automatically. Browser callers must provide their own
include preparation and resource policy. See [public exports](../ADR/ADR-012-public-module-exports.md)
and [browser integration](browser-entry.md).

Transform uses markdown-it 15. Hosts supplying their own MarkdownIt instance or
plugins should validate their actual parser and type versions, registration order,
metadata and output; do not assume every plugin's full parser types are compatible
across versions. Native 13 compatibility of a given adapter does not make an
unpatched 13 installation secure.

## TypeScript module resolution

Use an exports-aware resolver: legacy `moduleResolution: "node"` / `"node10"`
is unsupported and can miss public subpaths (TS2307) or select non-callable legacy declarations
(TS2349). This is a TypeScript setting, not Node.js 10 support; the runtime
requirement remains Node.js 24+.

For Node.js code, set both `"module": "NodeNext"` and
`"moduleResolution": "NodeNext"`; `"Node16"` / `"Node16"` is also supported.
Keep the existing module format: `.cts` is CommonJS, `.mts` is ESM, and `.ts`
follows the nearest `package.json#type` (`"module"` means ESM, otherwise CommonJS).
Do not change package `type` merely to fix lookup. For example, in ESM:

```ts
import sup from '@diplodoc/transform/plugins/sup';
import type {ParserEnv} from '@diplodoc/transform/types';
```

For `.cts` compiled by `tsc`, use `import sup = require('@diplodoc/transform/plugins/sup')`;
the type-only import is unchanged. When running `.cts` directly in Node.js, use
ordinary `require()` instead: Node's type stripping does not support import assignments.
Only for an application built by a bundler,
use `"moduleResolution": "Bundler"` with `"module": "Preserve"`; unbundled Node/SSR
targets need their own Node configuration. `skipLibCheck` does not fix missing
subpaths or consumer callability errors. See the [public import map](../ADR/ADR-012-public-module-exports.md).

## Parser output changes

The markdown-it 13 → 15 upgrade preserves authored Unicode spaces, including
U+00A0 (NBSP), at paragraph edges that 13 trimmed. With line breaks enabled,
preserving a space before a newline can also add a `<br />`. This can change
spacing; review HTML snapshots and rendered layout. Remove unintended spaces in
the Markdown source rather than stripping arbitrary whitespace from output.

The `markdown-it-deflist` upgrade from 2.1 to 4 can add `<p>` wrappers inside
`<dd>`, for example when a definition contains prose followed by a list or when
a blank line separates the term from its definition. Review custom CSS selectors
such as `dd > p`, paragraph margins, and HTML snapshots.

For a definition list, align the term and its `:` or `~` marker with the surrounding
text. Transform 5 allows up to three extra spaces before the marker. After a blank
line, four or more start an indented code block. To keep the definition and its
inline formatting in both versions, put the marker directly below the term. Leave
intentional code blocks indented.

```markdown
**Open the curtains**
: Set a _schedule_.

**Adjust the opening**
: Choose a percentage.
```

A line containing only `:` or `~` after a term now creates an empty definition. Even
a line containing only a non-breaking space can serve as an empty term. To show the
punctuation as text, write `\:` or `\~`.
[Definition-list parser 4.0 changes](https://github.com/markdown-it/markdown-it-deflist/blob/4.0.0/CHANGELOG.md)

## Coexisting with Transform 4

Keep a real Transform 4 package for hosts whose peer contract still requires it.
Use a separate dependency name for owned Transform 5 runtime or validation code
when those hosts share an application. Check actual package resolution from each
host; an alias or a successful build does not prove its peer parser changed.

A genuine 4.78.12 and 5.0.0-transform5.0 installation currently fails strict
TypeScript 6/7 with `TS2374` when its two Utils versions both declare a global
Window symbol index. The validated local graph replaces only the legacy
Utils 2.3.6 copy with `2.3.7-transform5-compat4.0`; Transform 5 retains its own
Utils candidate. This compatibility patch preserves runtime code but removes
broad ambient symbol typing, which can affect callers using arbitrary Window
symbols. It is not published. Validate an approved dependency fix before adoption;
`skipLibCheck` does not establish compatibility of those declarations.

## Diagnostic ownership

`Output.logs` now contains only that root document's diagnostics and is a detached
snapshot. Later roots, parser reuse, and collector clearing do not change earlier
outputs. Included sources and fragments share the enclosing document's sink.
A reusable parser exposes `parser.logs`; owned handles expose `document.logs`,
including diagnostics produced when that older handle is compiled later.

For build-wide history, opt in explicitly:

```ts
import transform from '@diplodoc/transform';
import {createDiagnosticCollector} from '@diplodoc/transform/log';

const diagnostics = createDiagnosticCollector();
const page = transform(source, {path, diagnostics, log: applicationLogger});
const documentLogs = page.logs;
const buildLogs = diagnostics.get();
// Handle the build snapshot, then release its retained diagnostics explicitly.
diagnostics.clear();
```

The shared collector is an aggregate mirror; `page.logs` remains document-only.
`get()` returns copies, `add()` retains supplied duplicates/order, and generic
logging deduplicates identical formatted messages. The existing exported global
`log` retains its mutable methods but receives only explicit writes/forwarding or
`diagnostics: log`. Reading `log.get()` no longer retrieves all ordinary calls.
Parser setup runs once, so its diagnostics belong to the first root only. For
standalone Liquid/lint helpers that return no logs, pass `diagnostics` and/or an
external `log` to retain/forward messages. See the
[lifetime contract](../specs/transform-5/diagnostic-lifetime.md).

## Select plugins explicitly

The existing flat options and legacy `plugins` callback array remain supported.
A supplied callback array replaces the standard list; preserve your own callbacks
and their order. For new code, use the closed configuration builder:

```ts
import transform from '@diplodoc/transform';
import {defineTransformOptions} from '@diplodoc/transform/configuration';

const options = defineTransformOptions({
  core: {enableMarkdownAttrs: true},
  plugins: {disable: ['video'], options: {notes: {notesAutotitle: false}}},
});
const output = transform(source, options);
```

`preset: 'none'` removes builtin feature callbacks, not core parsing or the final
sanitizer. Do not supply the legacy callback array and named configuration in the
same call. See the [plugin configuration contract](../specs/transform-5/plugin-configuration.md).

To extend an existing spread preset, use the [named composition recipe](cut-tabs-types.md).
Explicit callback arrays still warn; retain their disabled directive modes when
migrating to the named preset.

The standard preset has 21 IDs in this order: `meta`, `deflist`, `cut`, `notes`,
`anchors`, `tabs`, `code`, `sup`, `video`, `monospace`, `table`, `file`, `imsize`,
`term`, `block-anchor`, `inline-code`, `visibility`, `underline`, `subscript`,
`footnotes`, and `task-list`. The last four are
enabled by default and independently selectable; their settings are empty. Task
list checkboxes are disabled. Superscript retains its caret syntax. See
[inline syntax](../inline-syntax.md) and [footnotes and task lists](../footnotes.md)
for callback lists and document ownership.

If you explicitly use the legacy `checkbox` callback, disable `task-list` in
the named configuration, or omit its callback from your replacement plugin
array. The standard preset does not enable legacy `checkbox`.

Existing link labels starting with a caret can now be parsed as footnotes:
`[^^name]` with `[^^name]: ...` has footnote label `^name`. Rename both the
reference and the definition to a label without a leading caret, or disable
`footnotes` to retain the old interpretation.

## Attributes, tables, images and SVG

General Markdown attributes now default to off. Set `enableMarkdownAttrs: true`
in flat options, or `core.enableMarkdownAttrs` in the builder, when the document
corpus requires them. Heading anchors and adjacent image dimensions remain
independent and work with general attributes disabled.

Table separators inside inline code are protected by default. For the old
omitted-option behavior set `table_ignoreSplittersInInlineCode: false`; if also
using block-code compatibility, review both splitter settings. Legacy cell alignment
remains supported with an actual-use warning. Prefer `::{align="center"}` after
the cell marker; [table migration](transform-5-tables.md) documents supported
values and `migrateTableAlignment`.

Legacy image dimensions such as `![Alt](image.png =300x200)` still render and
warn on actual use. Prefer `![Alt](image.png){width=300 height=200}`. The pure
`migrateImageDimensions` helper reports ambiguous cases for manual review; see
[image dimensions](image-dimensions.md). Both helpers return original UTF-16
edit offsets and diagnostics; neither writes files or expands includes.

Replace `inlineSvg` with `svgInline.enabled`. If both are supplied,
`svgInline.enabled` takes precedence even when false. `inlineSvg` remains a
compatibility alias in 5 and emits an actual-use diagnostic; its scheduled removal
is Transform 6. Preserve the SVG sanitizer and existing entity-limit policy.

An incomplete `svgInline` object now consistently inherits the 2 MiB file-size
limit. Transform 4 could lose that limit with `{enabled: true}`; this was a
normalization bug. If your application intentionally inlines larger SVG files,
choose an explicit limit, for example:

```ts
transform(source, {svgInline: {enabled: true, maxFileSize: 4 * 1024 * 1024}});
```

Without an explicit override, a file larger than 2 MiB stays an image reference.
The existing image attribute `{inline=true}` still forces inlining; XML entity
safeguards and sanitization remain active. See the [SVG option ADR](../ADR/ADR-011-svg-inline-option.md).
The existing check counts UTF-16 units in the SVG text; the MiB values correspond
to ASCII content, not a new encoded-byte measurement.

## Highlighting and document ownership

Highlighting is no longer loaded implicitly. Without a caller-supplied
`highlighter`, code is rendered as escaped plain text. Install and load a supported
Highlight.js version explicitly, then construct the synchronous adapter with
`createHighlightJsHighlighter` from `/highlighter`. See the [highlighter guide](transform-5-highlighter.md)
for ESM loading and supported versions.

Different installed Highlight.js versions can produce different classes and
nested `<span>` elements even when the code text is unchanged. Pin the intended
version and review highlighting styles and HTML snapshots.

A reusable parser owns a separate environment for each document. Retain the handle
from `parseDocument` and pass it to `compileDocument`; use `state.env.meta` and
`state.env.assets` in plugins. For child content use the documented fragment API
and explicit include/reference purpose. The caller owns cache lifetime and source
mapping; failed or reference-only children do not commit parent resources. See
[document contexts](document-context.md) and [footnote ownership](../footnotes.md).

## Retained APIs and extension resources

Bundled Liquid and YFMLint remain available with their existing behavior in 5.
Actual use emits scoped warnings; imports alone do not. Root Liquid runs unless
`disableLiquid` or `isLiquided` is set, but `isLiquided` alone does not disable
Liquid in child helpers. Standalone YFMLint is asynchronous: await it outside the
synchronous Transform pipeline. See [bundled engines](bundled-engines.md).

The retained Transform cut/tabs callbacks and old typings forwarding paths are
deprecated in 5 and scheduled for removal in 6, subject to release and consumer
migration gates. Standard builtin behavior remains available. Replace explicit
callbacks with direct extension dependencies and public factories, preserving
options, `generateID`, registration order and `collect`; callback identities
change. Use `/types` for public types. See [cut, tabs and types migration](cut-tabs-types.md).

Notes remain enabled and keep their existing Transform paths and styles. A host
owning its callback list may use `@diplodoc/notes-extension/plugin`; supply its
existing formatter and title options. Avoid importing standalone Notes CSS again
when Transform already supplies it. Sass consumers compiling Transform's public
sources need Sass `NodePackageImporter` for the `pkg:` imports. See [Notes migration](notes-extension.md).

## Block directives

[The merged integration](https://github.com/diplodoc-platform/transform/pull/1142)
adds colon forms for Cut, Notes and Tabs and a conservative source migrator. Its
standard preset defaults to `directiveSyntax: 'enabled'`, accepting legacy and
colon syntax together. Explicit legacy callbacks and standalone extension
factories retain their `disabled` default; configure their factories when a host
owns its callback list. `disabled` retains old-only parsing; `only` selects
colon-only parsing. These modes are per feature; they do not migrate source files.
The integration is accepted on `codex/transform-5-major` at `e8c57378`.
Genuine-version local consumer checks passed; publication is a separate gate.

For example, Transform 5 accepts this Cut spelling:

```md
:::cut [Details]
Content
:::
```

The migrator changes only supported source occurrences, preserves original UTF-16
edit positions and refuses ambiguous or nonequivalent cases. Code examples,
protected content and unsupported attributes need the documented refusal policy.
Outside positively closed frontmatter, unresolved Liquid output or unknown
template tags leave the whole document unchanged with `unresolved-liquid-template`,
even when they occur inside a protected example; safe siblings cannot be assumed
independent. An unclosed frontmatter opener does not shield subsequent content.
The candidate proof budget is 32 actual full-input parser calls, after which
unproved groups get `equivalence-budget-exceeded`. Setup and the mandatory
uncached final whole-document proof in both attributes profiles are outside that
budget; final failure restores the original source with no edits. Supported
syntax can therefore still require manual migration.
The [block directives guide](../block-directives.md) describes the
complete grammar, examples and migration limits. These contracts cover the three
supported owners.

## Accepted local consumers and asset delivery

The genuine `5.0.0-transform5.0` archive was normally installed and checked in
CLI, Translation, SDK/yfmlint, request-time Viewer and VS Code integrations.
Their reviewed adaptations are committed on separate local branches; none is a
published consumer release. These checks use real peer dependencies and retain
real Transform 4 where an unrelated UI/editor contract requires it.

Translation preserves item anchors and `{selected}` markers in both pipelines
using direct Tabs `3.10.8-transform5.4`; Transform retains its own reviewed Tabs
`3.10.8-transform5.3`. Installed CJS/ESM extraction and composition protect
poisoned markers, and CLI forwards refused-title warnings, including quiet mode.
The selected Page Extension → Gravity server → Transform path resolves to 5,
without a nested Transform 4 renderer. Real Page collect, SSR and CSR data pass.

Use `@diplodoc/html-extension/transform-host` for the reviewed HTML extension
factory in a Transform 4/5 host. Its default entry retains native MarkdownIt 13
types and an optional Transform peer; the separate typed entry uses the same
runtime factory. Page Extension retains its required Transform peer and public
`collect` method. These are bounded host contracts, not support for every native
MarkdownIt version or a change to the HTML sanitizer policy.

A parser upgrade alone does not replace prebuilt browser assets. The accepted
local Client 5.14.8 rebuild supplies actual Transform 5 JavaScript and CSS, while
all 44 public declarations remain byte-identical to its published baseline. The
packaged CLI copies all 14 manifest assets byte for byte. Real browser checks
exercise mixed Transform 4/5 Cuts, Notes and Tabs, disabled tasks, Page content,
footnotes and history in light/dark styles. Enter in the visible search control
opens a new document: main and search each execute one runtime, with no page
errors. Cut/Tabs standalone resources are filtered when the client owns them;
Page's explicit resources remain. Artificial same-document app/search co-loading
still executes twice, as in the published baseline.

Viewer keeps ordinary Transform 4 and stable Gravity UI providers for its UI
peers, uses Transform 5 in models/server, and selects one canonical Transform 5
browser runtime and stylesheet in each external/internal language build. Local
SSR and Chromium cover retained editor-produced 4 markup and 5 content, a single
Tabs handler and code-wrap mutation, footnote/history and no extra DocsAPI call.
VS Code similarly upgrades its owned validator to 5 while its editor and toc
webviews retain real 4/native13; its evidence covers tests, builds and VSIX contents, not
running the VS Code UI. This hybrid graph is intentional. No whole-UI migration
or live production acceptance is claimed.

Legacy block-syntax warnings are a separate conditional phase. They require
replacement and migration parity, an approved diagnostic descriptor/removal policy
and a truthful eligibility rule for the original occurrence. They are not wired
into the integrated major. No removal version has been agreed for this syntax. The existing explicit Cut/Tabs callback deprecations described above
remain separate.

## Validation limits before adoption

Use the final installed package graph for release acceptance. Current local
checks retain these known baseline limits:

- Repeated cached Tabs can reuse panel IDs; the checks do not establish unique IDs
  or unrestricted accessibility acceptance.
- Earlier limited dark-theme fixtures recorded low contrast for Cut, nested
  Notes and some Tabs controls. Current mixed-markup Note computed-style checks
  pass in light and dark themes; neither observation is a universal contrast or
  accessibility assessment.
- Dropdown Tabs can change the visible panel, label and active classes while
  leaving the selected item's `aria-selected` false. This reproduces with both
  the published Client 5.14.8 runtime and the candidate on legacy and new markup;
  functional interaction checks are not full accessibility acceptance.
- Compact Translation V2 can change generic bold-only body/tab-label whitespace;
  CRLF normalization and unsupported legacy V2 Tabs variants remain documented
  baseline behavior. This is not a universal source-exact round-trip guarantee.
- Translation's strict declaration probes retain 87 all-file and 20 entrypoint
  errors, identical to the baseline with the same dependency graph. Source
  typechecks and matching baseline diagnostics do not make those probes pass.
- CLI manual declaration emission retains its accepted baseline of 2 library and
  6 root errors. The build script masks emission failures with `|| true`; a zero
  exit status does not establish declaration acceptance. The source graph also
  retains the optional tsconfck TypeScript 5 peer warning under TypeScript 6;
  selected runtime peers and the installed production CLI tree pass separately.

The bounded genuine-version local consumer checks and major integration are
accepted. Release completion requires publication of stable `5.0.0`, its
changelog and this guide, followed by installation and verification of that exact
published package. An RC or an accepted local candidate alone does not satisfy
that release criterion. Transform master remains outside this integration; the
release source and npm tag must be explicitly agreed before publication.
