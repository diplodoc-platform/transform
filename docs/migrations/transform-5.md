# Migrating to Transform 5

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

The standard preset has 21 IDs in this order: `meta`, `deflist`, `cut`, `notes`,
`anchors`, `tabs`, `code`, `sup`, `video`, `monospace`, `table`, `file`, `imsize`,
`term`, `block-anchor`, `inline-code`, `visibility`, `underline`, `subscript`,
`footnotes`, and `task-list`. The last four are
enabled by default and independently selectable; their settings are empty. Task
list checkboxes are disabled. Superscript retains its caret syntax. See
[inline syntax](../inline-syntax.md) and [footnotes and task lists](../footnotes.md)
for callback lists and document ownership.

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

## Highlighting and document ownership

Highlighting is no longer loaded implicitly. Without a caller-supplied
`highlighter`, code is rendered as escaped plain text. Install and load a supported
Highlight.js version explicitly, then construct the synchronous adapter with
`createHighlightJsHighlighter` from `/highlighter`. See the [highlighter guide](transform-5-highlighter.md)
for ESM loading and supported versions.

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
change. Use `/types` for public types. See [cut, tabs and types migration](../migration/cut-tabs-types.md).

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
