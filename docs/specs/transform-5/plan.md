# Transform 5: specification and acceptance plan

Status: implementation in progress. This document records acceptance gates, not a
claim that the major is ready to release.

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

| Workstream          | Required result                                                                               | Completion dependencies                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| DOCSTOOLS-6934 / 1  | Shared deprecation diagnostics, scoped deduplication and compatibility policy                 | None                                                                           |
| DOCSTOOLS-6935 / 2  | Supported markdown-it and compatible dependencies; intentional parsing differences documented | Coordinate packaging with 3; validate extensions, CLI, yfmlint and translation |
| DOCSTOOLS-6936 / 3  | ESM sources, working ESM/CJS entries, public exports and import migration map                 | 1 before restricting used paths; coordinate with 2                             |
| DOCSTOOLS-6937 / 4  | Typed core/custom options, stable plugin IDs, deterministic composition and dependencies      | 1 before removing legacy configuration                                         |
| DOCSTOOLS-6938 / 5  | Standalone Liquid/YFMLint composition and removal of bundled legacy implementations           | 1, ready consumer replacements, previously published warnings                  |
| DOCSTOOLS-6939 / 6  | Explicit synchronous highlighter injection after optional external lazy loading               | 4; compatible public imports                                                   |
| DOCSTOOLS-6940 / 7  | Browser entry without required Node APIs, globals, polyfills or bundler stubs                 | 3; Node dependencies and implicit highlighting addressed by 5/6                |
| DOCSTOOLS-6941 / 8  | Replacement imports for removed cut/tabs/typings forwarding paths                             | 3 and the deprecation/removal policy in 1                                      |
| DOCSTOOLS-6942 / 9  | Separate notes extension preserving syntax, localization, titles, HTML and accessibility      | 3/4; 1 before removing the previous path                                       |
| DOCSTOOLS-6943 / 10 | Specified directive grammar, finite extension inventory and safe migrator                     | 4; 1 for warnings after equivalent replacements exist                          |
| DOCSTOOLS-6944 / 11 | General Markdown attributes opt-in; anchors and image dimensions preserved                    | 1; cross-check 13/17 and explicit CLI compatibility                            |
| DOCSTOOLS-6945 / 12 | Inline-code table splitters handled by default; alignment warnings and migration              | Splitter change independent; alignment migration uses 1                        |
| DOCSTOOLS-6946 / 13 | Legacy image-size warnings and safe migration to modern dimension attributes                  | 1; dimensions also tested with general attrs disabled                          |
| DOCSTOOLS-6947 / 14 | `inlineSvg` migration to `svgInline.enabled` with specified precedence                        | 1                                                                              |
| DOCSTOOLS-6948 / 15 | Independently controllable footnotes, underline, subscript and task lists                     | 4 for final plugin controls                                                    |
| DOCSTOOLS-6949 / 16 | Migration guide, changelog and installed-package/consumer acceptance                          | All other sixteen workstreams, including 17                                    |
| DOCSTOOLS-6951 / 17 | Typed per-document env lifecycle with isolated metadata and resources                         | 1/4; coordinate exports with 3 and includes/attrs with 11                      |

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

### Public API and plugins

- Build the export map from real consumer imports, including low-level parser,
  plugin helpers, types, sanitization, filesystem helpers and runtime/styles.
  Every path that is closed needs an available, tested replacement.
- Standard plugin ordering remains stable unless an intentional difference is
  specified and tested. Duplicate IDs, missing dependencies and conflicting
  composition settings need deterministic, actionable diagnostics.
- Provide a supported typed custom-option mechanism before restricting arbitrary
  plugin configuration. Configuration changes must cover CLI and custom extensions.
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

## GitHub issue accounting

Use related references for the overall manifest and partially covered issues.
Do not close the major manifest from a child PR. In particular, dependency issue
1067, browser/editor issue 446, Node/export issue 284, parser reuse issue 605 and
the four syntax-feature issues require checking their full original scope before
automatic closure.
