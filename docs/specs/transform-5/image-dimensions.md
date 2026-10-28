# Image dimension migration

Status: root contract approved; implementation in progress. Publication, dependency
changes and removal are not authorized by this document.

Task: [DOCSTOOLS-6946](https://st.yandex-team.ru/DOCSTOOLS-6946).
Baseline: `551a675bc24b5eefacfb8bf92550b145f9ad94c1` (accepted document context).
Branch: `codex/docstools-6946-image-size`.

## Scope and source requirements

Prepare migration from legacy image sizes inside the image destination to modern
adjacent dimension attributes, preserving the existing corpus in Transform 5.
Keep imsize in the standard composition and independently selectable through its
existing ID and public plugin entry. General attrs remain a separate task/default.
No new CSS units, image parser grammar, sanitizer policy, runtime, or gallery
behavior is introduced here.

The three primary comments were read from GitHub on 2026-10-28:

- [Original proposal](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-2778029898): remove default imsize and replace the legacy size with brace attributes, retaining title.
- [Corpus objection](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-5060570394): existing documents depend on that syntax.
- [Explicit plugin route](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-5817398439): imsize can be connected manually.

The live child task and its current comment select preparation and compatibility,
not removal in this major. This supersedes interpreting the first comment as
permission to remove the default plugin now. Earliest removal is Transform 6,
subject to a separately agreed release, published-warning and migration gates.
No Transform 4 warning publication is asserted. Overall issue #519 is referenced,
not closed by this task.

## Current implementation inventory

Owning files are `src/transform/plugins/imsize/{index,plugin,helpers,const}.ts`,
`test/imsize.test.ts`, and the two `test/data/imsize/` fixture files. Modern brace
handling is already implemented by imsize itself, independently of attrs. Relevant
cross-checks are `test/markdown-attrs.test.ts`, image/sanitizer tests and actual CLI
Translation fixtures. Current public plugin option is `enableInlineStyling`.

The inventory below combines source and existing assertions with bounded runtime
probes of the existing compiled imsize/native MarkdownIt 15 installation. Its
imsize sources are byte-identical to this baseline (empty source diff against
`03d2c0b`). This is behavior discovery, not proof of the proposed migrator.

| Form                                                                               | Current behavior                                                                                                                                 | Proposed migration                                                                                                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `=300x200`, `=300x`, `=x200`                                                       | Both or either dimension; lowercase literal x                                                                                                    | Rewrite present values, omit absent attributes                                                                                        |
| `=50%x100%`, `=50%x200`, `=100x50%`, percentage partials                           | Percent values accepted                                                                                                                          | Preserve exact values; no numeric normalization                                                                                       |
| `=0x0`, `=00x020`, `=0%x00`                                                        | Accepted and strings retained                                                                                                                    | Preserve zero/leading zeros exactly; do not invent a positive-only rule                                                               |
| `=x`                                                                               | Accepted, neither dimension emitted; covered by existing fixture                                                                                 | Remove legacy suffix, add no empty braces                                                                                             |
| `=x%`, `=1%%x2%`, `=1%2x3`                                                         | Permissive digit/percent scanner accepts these                                                                                                   | Preserve runtime behavior; leave source unchanged with noncanonical-dimensions diagnostic                                             |
| Decimal, signed, px/em/rem units, uppercase X, spaces after = or within dimensions | Not accepted as legacy image size; complete image can remain literal                                                                             | Do not repair or broaden; diagnose recognizable unprotected legacy-looking candidates conservatively                                  |
| No separator: `img.png=10x20`                                                      | Part of URL, not dimensions                                                                                                                      | Never rewrite or warn as a size                                                                                                       |
| Separator before =                                                                 | Must end in ASCII space; tabs or a bare LF immediately before = fail; LF followed by space can work                                              | Preserve the existing grammar; migrate only with a proven source range                                                                |
| Trailing spaces/LF after size before closing parenthesis                           | Accepted                                                                                                                                         | Preserve untouched whitespace and original line endings                                                                               |
| Title before size                                                                  | Double/single quotes or parenthesized title accepted via MarkdownIt helpers                                                                      | Preserve the complete title source bytes, quotes and escapes                                                                          |
| Title after size                                                                   | Not accepted as legacy syntax                                                                                                                    | Leave unchanged; no reorder or repair                                                                                                 |
| Alt/URL                                                                            | Empty/formatted/escaped alt; normal/angle URL, escapes, parentheses, unicode/entities and queries use existing MarkdownIt helpers and validation | Preserve exact source bytes; compare normalized rendered semantics without reconstructing URL/alt/title                               |
| Full/collapsed/shortcut reference images                                           | References resolve normally; brace dimensions can follow use sites                                                                               | Already-modern references unchanged; legacy dimensions in reference definitions are not a supported legacy form and are not rewritten |
| Adjacent modern braces                                                             | Nonempty modern width/height override the corresponding legacy value; missing modern dimension retains legacy value                              | Existing adjacent brace group is diagnostic-only in the first migrator, even if some cases could be merged                            |
| Mixed brace attrs                                                                  | Foreign text/title/class/ID keeps the brace source available to attrs and Translation; imsize still reads owned dimensions                       | Preserve this behavior exactly; no attribute reserialization, no mixed-group migration                                                |
| Code/frontmatter/raw HTML/escaped image marker                                     | Examples or non-image text, not actual legacy image use                                                                                          | No edits, runtime warnings or migration diagnostics inside protected regions                                                          |

Modern standalone examples: `![alt](image.png "title"){width=300 height=200}`,
`{width=50%}`, `{height='200'}`. Reference use sites also support immediate braces.
This task does not tighten the current permissive modern attribute value parser or
claim every arbitrary modern value is valid CSS. Final sanitization stays intact.
Existing inline styling stays identical: plain sizes produce px; two non-percent
sizes also produce aspect-ratio/height:auto and the existing CSS allowance; percent
combinations retain their separate width/height style values.

## Runtime warning and compatibility contract

Stable proposed code: `IMAGE_SIZE_LEGACY_SYNTAX`. Replacement: immediate
`{width=... height=...}` after the image. Descriptor removal version is `6.0.0`,
documented as the earliest gated major, not an announced removal release.

Both `current` and `legacy` policy values preserve old/new parsing and emit the
same warning in Transform 5, following the accepted table/legacy-engine policy.
The explicit legacy entry records consumer intent; it does not suppress warnings,
enable a disabled plugin, change attrs defaults, or change unrelated features.

Warn only after a successful, non-silent legacy image parse, including `=x` and
legacy sizes overridden by modern braces. Rejected syntax, text/URL/title strings,
reference definitions, modern-only syntax and a disabled imsize plugin do not warn.
No warnings at import or plugin installation. Silent lookahead is side-effect free.

Proposed bounded granularity: once per source path in a document reporter scope.
The inline parser's `state.pos` is relative to its inline buffer, not the original
document; do not print invented document line/column coordinates. Use a nonblank
`state.env.path` or configured path as the source label; if neither is usable, use
the stable option label `imsize legacy image dimensions`, without an empty path.
Exact per-image source coordinates belong to migration diagnostics below. Multiple
images at one path produce one actionable runtime warning; separate included paths
remain distinct; a fresh root produces a fresh warning; replayed cached fragments
produce no new parse/warning side effects.

Use the injected document reporter facade where provided. For direct standalone
`.use(imsize)` without a supplied reporter, create a local reporter per native core
parse invocation, rather than caching a reporter forever at plugin installation.
A small private token marker recorded only on successful emission permits a core
post-inline pass to report actual use and protect silent probes. Use current path
and logging context; preserve arbitrary token.meta fields. An explicitly supplied
reporter retains caller-owned reset semantics. Do not add global registries,
process-wide deduplication or reset existing collected logs.

Add optional typed diagnostic context fields to imsize's installation options as
needed, preserving its current optional `enableInlineStyling` and direct plugin
call. Diagnostic context is not a new plugin feature option in the named builder.
No Reporter is invoked by the pure migration function.

## Pure public migration API

Proposed entry: `@diplodoc/transform/migrations/image-dimensions`.
Proposed function: `migrateImageDimensions(source, {path?} = {})`.
Coordinate the single export-manifest addition with the browser owner/root; no
parallel manifest/lock editing. No CLI command, filesystem traversal or general
migration framework is part of this task.

Return `{output, edits, diagnostics}` with exported, readonly typed records:

- Edit: `{start, end, replacement}`; zero-based UTF-16 offsets into ORIGINAL input,
  end exclusive. Ascending, nonoverlapping edits; applying them in reverse order
  reproduces output exactly.
- Diagnostic: code `IMAGE_DIMENSIONS_NOT_MIGRATED`, finite reason, message, offset,
  one-based line/column, and optional path (label only, never opened). Nested or
  ambiguously mapped images use the original container's first-line anchor (or
  document start without a parser block map), not an exact image/size position.
  Uniquely mapped recognized candidates point to the original size suffix.
- Reasons: `noncanonical-dimensions`, `existing-attributes`,
  `unsupported-legacy-form`, `ambiguous-source-range`, `nested-image`,
  `equivalence-check-failed`. Refine only if implementation discovers a concrete
  distinct case; do not silently widen the migration subset.

Successful migration retains all source outside the legacy suffix and insertion
point. Remove the exact =AxB suffix and its necessary separating ASCII space;
other source whitespace is not reformatted. Insert `{width=W height=H}` immediately
after the existing closing parenthesis, in width/height order, omitting missing
values. For =x, insert nothing. No URL escaping, title reconstruction, formatting
serialization or whole-document newline normalization. Keep LF/CRLF/BOM/trailing
newline/astral characters. Existing brace groups are left unchanged with a reason;
do not silently override modern precedence or create adjacent competing groups.

The safe dimension subset is digit strings with at most one terminal percent sign,
or absent width/height. Zero and leading zeros are retained because the real
parser accepts them. Unsupported-looking units/decimals and permissive malformed
percent forms are never normalized into accepted dimension syntax.

A second call on successful output makes no edits. Skipped source may return the
same diagnostic on the second call. Independent unambiguous images may migrate
when another candidate is skipped; never partially edit a single candidate.

## Parser-aware discovery and equivalence

Use an isolated native MarkdownIt parser with the actual imsize implementation and
quiet local diagnostics. Do not run Transform's root, Liquid, includes,
preprocessors, highlighters, user callbacks, generators, filesystem/network
helpers or module-global logs. Reuse the actual size/image recognition internally;
do not replace Markdown image grammar with a standalone global regex.

Discover successful image candidates through actual inline parsing, retaining
private source-span facts from the imsize rule. Exclude fenced and indented code,
inline code, raw HTML blocks/comments and frontmatter before considering edits;
respect escapes and link/image nesting. If a normalized inline buffer cannot be
mapped uniquely to contiguous original source, leave the affected candidate
unchanged with ambiguous-source-range. In particular, do not guess offsets after
multiline blockquote/list-prefix removal. Single-line lists/quotes/emphasis/links
are eligible when the original range is unique and the semantic proof succeeds.
Keep an explicit normalization-to-original-offset map rather than writing the
normalized text back. Malformed legacy-looking syntax may be diagnosed only when
an unprotected image-shaped range is identifiable; do not scan every = string.

For each proposed candidate, compare before/after canonical tokens using this
same isolated parser and the pinned attrs implementation in BOTH attrs-disabled
and attrs-enabled modes, with inline styling both false and true. Compare tags,
nesting, all rendered image attributes (including src/alt/title/dimensions/style),
children/content, and surrounding text/structure. Ignore only source positions
and private migration/warning markers. Compare CSS allowances when inline styling
creates them. This proof is additional defense for the finite subset, not a reason
to rewrite arbitrary syntax. On mismatch discard the candidate's edits and return
equivalence-check-failed. An implementation that cannot establish original ranges
must report that bounded limitation rather than silently alter content.

Tests also compare final sanitized HTML for successful legacy-to-modern pairs.
Keep parser-specific canonical comparison pure; do not call the full Transformer
from the production migrator merely to establish equivalence.

## Acceptance matrix

| Layer               | Required cases                                                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing behavior   | Existing imsize fixtures, images, Markdown attrs and mixed Translation title assertions unchanged; both current/legacy modes and explicit plugin enable/disable                                                                                 |
| Dimensions          | Both/partial/empty =x; zero/leading zero; numeric/percent combinations; malformed percent; decimal/unit/sign/uppercase/whitespace rejection; adjacent modern precedence                                                                         |
| Source fidelity     | URL angle brackets/escaped parentheses/query =/unicode; formatted/empty/escaped alt; all title delimiters/escapes; multiple images; original LF/CRLF/BOM/astral offsets; edit reconstruction and idempotence                                    |
| Protected/ambiguous | Fences of different lengths, indented code, inline code runs, frontmatter, HTML/comments, escaped !, image-looking URL/title text, full/collapsed/shortcut refs and definitions, mixed/unclosed braces, nested images, multiline containers     |
| Warnings            | Successful legacy only; no import/install/silent/protected/modern warnings; actual and blank/whitespace/missing paths; independent source paths/roots; supplied Reporter; standalone repeated native render; logger routing and no cleared logs |
| Purity              | No filesystem/network/template/include/user callback/generator execution; no global collected-log changes; stable repeated results; negative option/type fixtures                                                                               |
| Document context    | A/B and repeated includes; warning scope belongs to document; cache replay has no new warning/parse effects; CSS allowances stay document-local                                                                                                 |
| Package             | Full source gates and normal hooks; installed native CJS/ESM migration exports; strict types and exact packed payload; no dependency/lock/runtime-floor change                                                                                  |
| Consumers           | Actual CLI HTML/MD/MD-to-HTML, mixed image attrs/Translation roundtrip and Viewer image rendering; legacy and migrated pairs with attrs explicitly false/true. New browser6940 composition later consumes the same imsize contract, not a fork  |

## Implementation ownership and review choices

After approval, own imsize source, a narrow private position helper if needed,
migration module, focused tests, migration docs and coordinated public-entry
addition. Preserve notes/directives/general attrs defaults and the 6940 shared
host extraction. Do not touch consumer source without a separate assignment.

Root contract review choices are explicit: accept the once-per-source-path runtime
warning granularity; accept conservative diagnostics for existing brace groups,
noncanonical percent forms and unprovable source ranges; accept unchanged default
imsize composition and no removal before6. These choices need no new human input
unless the root identifies a conflict with an existing user decision.

Implementation source gates now cover 56 focused cases plus the existing suite.
The isolated installed tarball passes native CJS/ESM exports, strict declarations,
require-cache/graph purity and the inherited package probes. No consumer adoption,
PR, dependency update or publication has occurred. Root/independent review and
normal commit hooks remain pending at this working-diff checkpoint.

One proven source boundary is `![a](a\n =20x30\n)`: deleting the suffix and its
single separating space leaves a blank line inside the destination. The four-mode
proof rejects this with equivalence-check-failed, rather than silently reformatting
other whitespace. Single newline variants and unambiguous single-line list,
blockquote and link containers are covered as successful migrations.
