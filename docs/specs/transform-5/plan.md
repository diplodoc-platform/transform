# Transform 5: specification and acceptance plan

Agreed implementation scope and acceptance gates. This document records the
contracts and their validation boundaries.

Preparation snapshot (2026-10-30): [PR #1142](https://github.com/diplodoc-platform/transform/pull/1142)
is merged only into `codex/transform-5-major` at
`e8c57378eb425aae1c6a9afc2f897d451b87fe8d`, with the reviewed source tree preserved.
Sixteen of 17 implementation workstreams are closed; DOCSTOOLS-6949 remains in
progress. Genuine-version local consumers, normal post-hook package identities,
CLI canonical browser assets and Viewer's single runtime/styles are accepted.
All consumer changes remain local. Stable `5.0.0` publication is not complete.
These counts describe task accounting, not final package or publication acceptance.

The public requirements are tracked in [the Transform 5 manifest](https://github.com/diplodoc-platform/transform/issues/519).
The implementation baseline is `c4ba31468acf7229deef0fb64846eed00b0730a5`.

## Delivery boundary

- `codex/transform-5-major` is the integration branch. All Transform work in this
  programme targets that branch. No programme PR targets or merges into `master`.
- Child changes use separate branches and isolated checkouts. Consumer changes
  remain in separate consumer branches until their migration is adopted.
- Keep the public transformation API synchronous. Asynchronous processing, CLI
  scheduling, parser caching and unrelated architectural rewrites are out of scope.
- Preserve both CommonJS and ESM consumption. Do not raise runtime requirements
  simply because the development toolchain uses Node 24.
- Preserve existing security behaviour, SVG parser patches, runtime assets and
  CSS/SCSS delivery. Dependency updates must not silently change those contracts.
- Publication and release tags are separate release actions. A merged child PR
  does not imply that a package or compatibility warning has been published.

## Controlled SDD phases

1. **Specify:** inventory the existing behaviour and consumers; record the
   proposed API, defaults, old-to-new mapping, dependencies and acceptance cases.
2. **Review the contract:** the coordinator checks the proposal against the
   manifest and child acceptance criteria before implementation starts.
3. **Implement and verify:** implement only the agreed scope, retain meaningful
   regression fixtures and record exact commands, revisions and results.
4. **Review and open a PR:** the coordinator reviews the diff and acceptance
   evidence. The implementer then opens the child PR against the integration branch.
5. **Accept:** require successful GitHub checks for the current head revision,
   local checks in the affected consumers, and one or two additional coordinator
   reviews after CI. Fixes invalidate the affected evidence and require a fresh
   review. Merge only when all applicable gates pass.
6. **Release acceptance:** after all workstreams, test the final installable
   tarball across the complete matrix and reconcile changelog and migration guide.

Each workstream records unmet criteria explicitly. Preparing a replacement is not
equivalent to completing a removal or satisfying a preceding release requirement.

## Scope and dependencies

There are **17** workstreams. The document-context workstream was added after the
original sixteen-item manifest breakdown; final acceptance includes it.
Dependencies below govern completion. Independent specification, fixtures and
replacement implementations can start earlier.

| Workstream          | Required result                                                                                                  | Completion dependencies                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| DOCSTOOLS-6934 / 1  | Shared deprecation diagnostics, scoped deduplication and compatibility policy                                    | None                                                                           |
| DOCSTOOLS-6935 / 2  | Supported markdown-it and compatible dependencies; intentional parsing differences documented                    | Coordinate packaging with 3; validate extensions, CLI, yfmlint and translation |
| DOCSTOOLS-6936 / 3  | ESM sources, working ESM/CJS entries, public exports and import migration map                                    | 1 before restricting used paths; coordinate with 2                             |
| DOCSTOOLS-6937 / 4  | Typed core/custom options, stable plugin IDs, deterministic composition and dependencies                         | 1 before removing legacy configuration                                         |
| DOCSTOOLS-6938 / 5  | Retained bundled Liquid/YFMLint APIs/defaults, actual-use deprecations and standalone migration                  | 1; consumer preservation; removal deferred to 6+ with release gates            |
| DOCSTOOLS-6939 / 6  | Explicit synchronous highlighter injection after optional external lazy loading                                  | 4; compatible public imports                                                   |
| DOCSTOOLS-6940 / 7  | Browser entry without required Node APIs, globals, polyfills or bundler stubs                                    | 3; Node dependencies and implicit highlighting addressed by 5/6                |
| DOCSTOOLS-6941 / 8  | Deprecate legacy Cut/Tabs callbacks and old typings forwarding paths in 5; removal in 6 subject to release gates | 3 and the deprecation/removal policy in 1                                      |
| DOCSTOOLS-6942 / 9  | Separate notes extension preserving syntax, localization, titles, HTML and accessibility                         | 3/4; 1 before removing the previous path                                       |
| DOCSTOOLS-6943 / 10 | Specified directive grammar, finite extension inventory and safe migrator                                        | 4; 1 for warnings after equivalent replacements exist                          |
| DOCSTOOLS-6944 / 11 | General Markdown attributes opt-in; anchors and image dimensions preserved                                       | 1; cross-check 13/17 and explicit CLI compatibility                            |
| DOCSTOOLS-6945 / 12 | Inline-code table splitters handled by default; alignment warnings and migration                                 | Splitter change independent; alignment migration uses 1                        |
| DOCSTOOLS-6946 / 13 | Legacy image-size warnings and safe migration to modern dimension attributes                                     | 1; dimensions also tested with general attrs disabled                          |
| DOCSTOOLS-6947 / 14 | `inlineSvg` migration to `svgInline.enabled` with specified precedence                                           | 1                                                                              |
| DOCSTOOLS-6948 / 15 | Independently controllable footnotes, underline, subscript and task lists                                        | 4 for final plugin controls                                                    |
| DOCSTOOLS-6949 / 16 | Migration guide, changelog and installed-package/consumer acceptance                                             | All other sixteen workstreams, including 17                                    |
| DOCSTOOLS-6951 / 17 | Typed per-document env lifecycle with isolated metadata and resources                                            | 1/4; coordinate exports with 3 and includes/attrs with 11                      |

The first implementation wave is 1 and 2 in parallel, with consumer acceptance
preparation from 16. Broad ESM conversion follows the parser update because both
own import boundaries, package metadata and the lockfile. Maintain one owner for
each manifest/lockfile at a time. At most five workstreams run concurrently;
available agent capacity may impose a smaller limit.

## Contract decisions

### Deprecation and removal

- A diagnostic identifies a stable code, deprecated feature, source occurrence or
  option, replacement, and removal version and/or date.
- Deduplication belongs to an explicitly owned document/build scope with an
  explicit reset. It must not suppress all future builds for one process.
- Preserve the existing logger and forwarding to consumer logs. Generic logging
  behaviour must not change as a side effect of introducing deprecations.
- Compatibility is explicit per feature. A compatibility policy must not silently
  enable or disable unrelated parser features.
- The sequence is replacement and migration instructions, warnings published in
  the supported preceding major, explicit transition mode, then agreed removal.
- The current branch alone does **not** prove that preceding warnings were
  released. Until an authorized release path and evidence exist, affected removal
  criteria remain open. Do not invent a removal date or old-major support period.
- Legacy Cut/Notes/Tabs **syntax** warnings are conditional on replacement,
  migrator and consumer parity, an approved descriptor/removal policy and
  occurrence eligibility. They are not wired into the integrated major, and
  no syntax-removal version has been agreed. Grammar delivery can precede these
  warnings. Keep them separate from the existing explicit Cut/Tabs **callback**
  deprecations and the agreed forwarding-alias transition in 5/removal in 6.
  The stable public `/types` entry remains supported.

### Public API and plugins

- Build the export map from real consumer imports, including low-level parser,
  plugin helpers, types, sanitization, filesystem helpers and runtime/styles.
  Every path that is closed needs an available, tested replacement.
- Standard plugin ordering remains stable unless an intentional difference is
  specified and tested. Duplicate IDs, missing dependencies and conflicting
  composition settings need deterministic, actionable diagnostics.
- Provide a supported typed custom-option mechanism before restricting arbitrary
  plugin configuration. Configuration changes must cover CLI and custom extensions.
- Workstream 5 retains bundled Liquid/YFMLint engines, exports, synchronous APIs
  and defaults in Transform 5 because the audited consumers still use them.
  It supplies actual-use warnings and standalone composition guidance. Removal is
  deferred to Transform 6 or later, subject to published-warning and migration
  gates; there is no claim that a Transform 4 warning release exists. See
  [the legacy-engine design](legacy-engines.md) for the proposed diagnostic contract.
- Workstream 7 must exclude retained server-only legacy engines from its new
  browser entry by choosing an explicit composition boundary. That boundary does
  not remove these engines from the Node entries or compatibility exports.
- A highlighter may be loaded asynchronously by its caller, but the supplied
  callback and transformation remain synchronous. No-highlighter output escapes
  code correctly; selected and unknown languages have explicit tests.

### Syntax and defaults

- General Markdown attrs default to disabled in the new major. CLI explicitly
  retains compatibility until its documents and generated Markdown are migrated.
  Heading anchors and modern image dimensions must work independently.
- Preserve notes automatic, explicit and empty titles, localization and
  `notesAutotitle`; extraction does not authorize their removal.
- Do not remove legacy directive or image-size syntax merely because a migrator
  exists. Their removal follows the deprecation policy.
- Specify a finite directive extension list, grammar, quoting, nesting and malformed
  input handling before implementing the directive migrator.
- Migrators are idempotent, preserve content and code examples, and leave
  ambiguous input unchanged with a diagnostic.
- When both SVG settings are supplied, an explicitly supplied
  `svgInline.enabled` takes precedence, including `false`. Diagnose legacy usage.
- Specify each new syntax feature's default independently. The four original
  feature issues request defaults; an opt-in-only implementation is partial
  coverage and must not automatically close those issues.

### Document context

- Separate parser configuration from data owned by a document. Specify fresh/reset,
  parse-to-compile, inline and error lifecycles for the supported low-level API.
- Includes preserve parent frontmatter and deterministically merge required
  assets, runtime and CSP information. Repetition must not accumulate duplicates.
- Cover sequential reuse and nested calls. Do not claim one parser is concurrently
  safe, fixes a memory leak, or is faster without separate evidence.

## Release completion

The parent DOCSTOOLS-6933 requires a published stable `5.0.0`, a changelog and a
migration guide. Completion of code workstreams, green CI, an RC or local tarball
acceptance does not satisfy that criterion. Verify a clean installation of the
exact published stable archive before marking the parent complete. No Transform
programme changes merge into master; agree the release source and npm tag before
publication.

## Acceptance matrix

For each candidate, record its source SHA, tarball SHA-256, consumer SHAs, resolved
package paths/versions, fixture selection, commands and results. Use isolated
installations of actual tarballs, not only source/workspace aliases. Check nested
resolutions from yfmlint and other plugins so an old parser cannot hide failures.

| Layer               | Required checks                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Transform           | Typecheck, lint, complete unit suite, build, installable package verification and relevant E2E                              |
| Package             | Native ESM import and CJS require, TypeScript consumers, public plugin/type paths, SSR, runtime and styles                  |
| Browser             | Minimal and standard compositions from the packed entry, no required Node polyfills/stubs, runtime/CSS smoke                |
| Extensions          | Changed parser/plugin contracts, cut/tabs/file behaviour, custom plugins, required runtime and styles                       |
| CLI                 | HTML and Markdown, MD to MD to HTML, includes/fragments, lint, translation, vars/conditions, changelogs and packaged binary |
| Public client       | Bundle, typecheck, runtime/style imports and generated page interactions                                                    |
| Request-time viewer | Real transformer, native workers, custom highlighting, metadata/includes, notification rendering and browser assets         |
| Document lifecycle  | A to B, A to A, failure to B, parse/compile context, nested/repeated/fragment includes and attrs compatibility              |

The representative corpus includes titles/headings/frontmatter, links and explicit
anchors, terms, paragraph IDs, generated OpenAPI, nested resources, raw HTML and
sanitization, SVG, visibility audiences, cut/tabs/file/notes, code and custom
languages, tables, Liquid and lint suppression/re-enablement. Compare semantic
output against the baseline and explain each intentional difference.

Consumer adaptations are committed on separate branches, with an import/options
migration map and the candidate tarball identity. Preserve unrelated dirty work.
Do not call a consumer validated when only a mocked transform or old prebuilt
runtime was exercised.

### Accepted genuine-version snapshot

The reviewed core archive is `5.0.0-transform5.0`, SHA-256
`02c95f52a5790b49ab5708430a3b99862858d67ccafe1ff2f9facadf14507bb8`,
from reviewed source `f229e48f5438603a5d54e1ad0945bfe0333a87cb`, whose tree
is preserved by major merge `e8c57378`. It passes normal install/ci, typecheck,
lint, build, package checks and 2143 tests (1 skipped). Companion registry inputs
are immutable; direct consumer Tabs 5.4 and core Tabs 5.3 have separate ownership.
Local `file:` inputs and unchanged consumer version labels are validation inputs,
not publishable release metadata or registry acceptance.

| Local consumer commit                                  | Frozen artifact SHA-256                                                 | Bounded acceptance                                                                                                                                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI `dfea0363e61ca9879d8e40c4d9e83251e62f6fb9`         | `822a28539806bf3e9cfada7acb987c7b401ac87435e3330c303f1e881dda0624`      | Normal install/ci, source types/lint/build, 3043 tests (1 skip), 47 E2E; 6 affected E2E after final asset change. Installed binary and actual Chromium main/search flow pass.                                                          |
| Translation `1185717bf458b19583705742e419960fee1a2542` | `b9b3496384fab1f607a2cd0cc391784e547cc431e51fd391d52eebd13be23d38`      | 1028 tests (4 skips), 276 targeted cases, source types/lint/build and installed CJS/ESM extract/compose pass.                                                                                                                          |
| Client `b205f8e01ead72a8befbb6a3396e1af5c16dc1b2`      | `eb9dbdd03e95abbf384dc4c712315da77224ad26e6a786c5fe9b8d0e4719fc69`      | Normal types/lint/build/pack; 44 declarations match published baseline. All 106 installed files and 14 delivered manifest assets match the archive. Actual 5 JS/CSS, SSR and browser interaction pass.                                 |
| SDK/yfmlint `f9ab18e55f128ed8a0cb54b2488315b769755683` | `d87bc75e2147d62dd2cd271a2a26a52be5bd5898b5b58ac39183b963382ea3c9`      | 252 tests, source types/lint/build, 8 packed cases and 64 paired actual CLI cases (128 runs) plus 2 legacy comparisons pass.                                                                                                           |
| VS Code `2f008d84927a2262d62546031b67dc7620bf1aa4`     | VSIX `a19efb2b524916709d82c35c9d9aff9c13c83dde0e9a335d4b8d0cf23c044e93` | 826 tests, source types/lint, extension/webview/VSIX builds pass. Validator has 117 Transform 5 inputs; editor/toc each retain 68 Transform 4 inputs. No running VS Code UI claim.                                                     |
| Viewer Arc `ccea9ce5d477be3e7bc8eff07ca5f93f5c68c539`  | Frozen installed graph and 5071 archive-owned file matches              | Models: 992 tests (4 skips), 29 snapshots; client: 410 tests; TS6/TS7, lint, models build pass. External/internal builds, real SSR/Chromium and all 4 language/compiler runtime/style lanes pass. Local service stubs limit the claim. |

Normal hooks preserved every reviewed source/lock hash; post-hook npm packs match
the frozen archives. Viewer post-hook frozen installation also preserves its
14-file review. None of these consumer commits is pushed, merged or published.

HTML `2.9.16-transform5.0`, Page `0.13.18-transform5.0` and Gravity
`8.23.3-transform5.0` remain review-only prerelease companions. HTML's optional
peer/default native13 entry is preserved; Transform hosts use its explicit
`/transform-host` entry. Page retains public `collect`. The selected Page/Gravity
renderer resolves actual 5; unrelated UI/editor hosts keep genuine 4/native13.
CLI and Viewer select canonical 5 browser JS/CSS without upgrading those hosts.
Actual visible CLI search Enter navigates to a fresh document/realm with one
runtime per document and zero page errors. Synthetic same-document app/search
co-loading retains the published baseline's two executions.

Retained limits are part of acceptance: dropdown `aria-selected=false` reproduces
with published and candidate clients on 4/5 markup despite visible interaction
passing; the original red probe remains. Earlier limited dark Cut/nested Notes/
Tabs contrast observations are not universal; current Note computed light/dark
styles pass. Cached panel IDs and compact Translation V2 whitespace/CRLF limits
remain. Translation strict installed declarations retain 20 entrypoint errors
(and the historical 87 all-file probe); CLI emission retains 2 library/6 root
errors despite its masked script exit. The optional tsconfck TS5/TS6 source peer
warning remains. Genuine dual4/5 strict types need the unpublished narrow Utils
compat4 fix described in the [guide](../../migrations/transform-5.md#coexisting-with-transform-4).
No security audit, full accessibility, whole-UI5 or live production claim follows.

## GitHub issue accounting

Use related references for the overall manifest and partially covered issues.
Do not close the major manifest from a child PR. In particular, dependency issue
1067, browser/editor issue 446, Node/export issue 284, parser reuse issue 605 and
the four syntax-feature issues require checking their full original scope before
automatic closure.

The following accounting covers all 18 original GitHub issues and the referenced
manifest comments, checked against their bodies and all 17 Tracker tasks on
2026-10-30. All listed GitHub issues were open at that snapshot. "Covered" means the stated implementation scope, not a published fix or an
authorization to close an issue. Final installed-package acceptance remains in
DOCSTOOLS-6949.

| Original requirement                                                                                                                                                                                                                                                                                                                   | Workstreams    | Coverage and remaining boundary                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Major manifest #519](https://github.com/diplodoc-platform/transform/issues/519)                                                                                                                                                                                                                                                       | All 17         | Partial overall. Shared manifest remains open; no child PR closes it. Major integration/defaults and the bounded genuine-version local matrix are accepted. Stable release/publication and installation of that exact stable package remain.               |
| [Parser updates #397](https://github.com/diplodoc-platform/transform/issues/397), [#448](https://github.com/diplodoc-platform/transform/issues/448), [MarkdownIt 15 request](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-5915781869)                                                                        | 6935           | Transform uses 15 and the selected companion graph has compatibility evidence. Genuine-version local consumer graphs are accepted; final published graph and consumer adoption remain. Adapter compatibility does not secure old native 13 installations.  |
| [Dependency/security scope #1067](https://github.com/diplodoc-platform/transform/issues/1067)                                                                                                                                                                                                                                          | 6935/6936/6940 | Partial. Parser/public-import and isolated patched SVG delivery are covered by their accepted contracts. A floating SVGO range, every ecosystem package, fresh security inventory and the reporter's AIKit scenario are not established by these gates.    |
| [ESM #280](https://github.com/diplodoc-platform/transform/issues/280), [Node/exports #284](https://github.com/diplodoc-platform/transform/issues/284)                                                                                                                                                                                  | 6936           | ESM sources, dual entries, finite retained aliases and Node >=24 contract are implemented. Final artifact publication remains; this does not expose every historic internal path.                                                                          |
| [Plugin configuration #285](https://github.com/diplodoc-platform/transform/issues/285), [typed options request](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-2379654980)                                                                                                                                     | 6937/6951      | Named typed configuration, scoped factories and document env cover the agreed replacement. Legacy flat/callback options remain compatible; no claim of rewriting every third-party plugin's configuration.                                                 |
| [Liquid/YFMLint removal/default request](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-3155018015)                                                                                                                                                                                                            | 6938           | Partial by agreement: retained APIs/defaults, actual-use diagnostics and standalone migration in 5. Removal/default inversion and a supported-major warning publication are not completed.                                                                 |
| [Unused highlighting #305](https://github.com/diplodoc-platform/transform/issues/305), [external loading request](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-2364164717), [HLJS v11 #756](https://github.com/diplodoc-platform/transform/issues/756)                                                       | 6939           | Explicit synchronous injection, caller-owned lazy loading, no-highlighter output and supported installed HLJS adapters are covered. Recheck the final artifact and the original bundler scenario before closure.                                           |
| [Client Node dependencies #359](https://github.com/diplodoc-platform/transform/issues/359), [webpack fallbacks #473](https://github.com/diplodoc-platform/transform/issues/473)                                                                                                                                                        | 6940           | The new browser entry has packed/browser evidence without Node stubs. Migration is to that entry; final original CRA/webpack application reproduction is not recorded here.                                                                                |
| [Combined client/editor bundle #446](https://github.com/diplodoc-platform/transform/issues/446)                                                                                                                                                                                                                                        | 6939/6940      | Partial: Transform composition/highlighting boundary only. The original editor application, markdown-editor changes and combined transfer-size acceptance are outside the evidence.                                                                        |
| [Cut/Tabs re-export removal request](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-2413871082) and manifest typings requirement                                                                                                                                                                               | 6941           | Agreed transition implemented: retained/deprecated in 5, replacement imports and all five local consumers; removal in 6 remains subject to release gates. Original immediate deletion is not claimed.                                                      |
| [Notes extraction/autotitle proposal](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-5817381720)                                                                                                                                                                                                               | 6942           | Extraction and preserved automatic/empty/explicit/localized titles are covered. Removing autotitle or making it a separate opt-in plugin was not the accepted scope.                                                                                       |
| Manifest block directives and legacy-syntax warnings                                                                                                                                                                                                                                                                                   | 6943           | Agreed grammar/migrator/default scope accepted: finite Cut/Notes/Tabs owners, enabled standard preset, genuine-version local consumers and PR1142 merged into major. Syntax warnings remain conditional and unwired; no syntax-removal target is approved. |
| [Placeholder loss #722](https://github.com/diplodoc-platform/transform/issues/722)                                                                                                                                                                                                                                                     | 6944           | General attrs default off addresses the original placeholder case, while anchors/dimensions and CLI's explicit compatibility remain. Final package reproduction is required before closure.                                                                |
| Manifest tables/alignment                                                                                                                                                                                                                                                                                                              | 6945           | Splitter default, retained alignment, scoped diagnostics and migrator cover the accepted implementation; bounded genuine-version corpus/package checks pass. Final stable publication remains.                                                             |
| [Image-size replacement](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-2778029898), [existing-corpus concern](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-5060570394), [manual imsize proposal](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-5817398439) | 6946           | Warnings/migrator and modern attrs are implemented; legacy syntax and builtin imsize remain in 5. Immediate removal from defaults was deliberately not performed.                                                                                          |
| Manifest `inlineSvg` migration                                                                                                                                                                                                                                                                                                         | 6947           | Alias, actual-use warning, explicit modern-option precedence and migration example are covered; scheduled removal in 6 is a later gated action.                                                                                                            |
| Default [footnotes #72](https://github.com/diplodoc-platform/transform/issues/72), [underline #71](https://github.com/diplodoc-platform/transform/issues/71), [subscript #70](https://github.com/diplodoc-platform/transform/issues/70), [task lists #73](https://github.com/diplodoc-platform/transform/issues/73)                    | 6948           | All four are enabled by default and independently selectable in the accepted major, with disabled task checkboxes. Genuine-version local runtime/style checks pass. Stable release publication remains.                                                    |
| [Parser initialization/memory #605](https://github.com/diplodoc-platform/transform/issues/605)                                                                                                                                                                                                                                         | 6951           | Partial: supported sequential parser reuse and isolated document lifecycle. The reported browser memory growth, automatic parser caching, concurrency and performance are not proved fixed.                                                                |
| Manifest release preparation                                                                                                                                                                                                                                                                                                           | 6949           | Frozen local graph, consumer matrix and intended deltas are accepted; guide/changelog review is in progress. Baseline failures remain explicit. Stable publication, exact published-package installation and release decisions remain open.                |
