# Optional general Markdown attributes

Status: approved SDD; phase A heading recognition and local standalone lint selector
implemented. Phase B default-policy and consumer changes await coordinator sequencing.
The current Transform default remains TRUE.
Task: [DOCSTOOLS-6944](https://st.yandex-team.ru/DOCSTOOLS-6944).
Baseline: `551a675bc24b5eefacfb8bf92550b145f9ad94c1`.
Branch: `codex/docstools-6944-optional-attrs`.

## Outcome and boundaries

General-purpose Markdown attributes become opt-in in Transform 5. An omitted
`enableMarkdownAttrs` behaves as `false`; explicit `true` preserves the pinned
`markdown-it-attrs` 4.3.1 behavior. Explicit `false` must survive configuration
normalization and consumer forwarding. This is an intentional default change,
not removal or deprecation of the explicit compatibility option.

Supported heading-anchor syntax and image dimensions remain independently
available through their existing plugins. This does not mean every brace block
is literal: cut/directive-owned attributes, modern imsize dimensions/gallery
metadata, table alignment syntax and term syntax retain their own owners.

No parser upgrade, attrs dependency update, sanitizer change, new general brace
parser, generic migration framework, snapshot blanket update or engine removal
belongs here. CLI-owned parseTokens and Translation retain their MarkdownIt 13 contexts.
Standalone YFMLint retains its unchanged declared/dev MarkdownIt 13 contracts,
while its locked markdownlint fork actually embeds MarkdownIt 14.1.0. The accepted
published YFMLint 1.11.0 bundle also embeds that exact parser: its actual plugin
constructor and complete embedded parser source match the candidate. CLI root
markdownlint 0.32.1 resolves MarkdownIt 13.0.2 separately; that root resolution is
not the SDK embedded runtime. No SDK parser upgrade occurs in phase A.
No consumer install, companion release, PR or publication is authorized by this
specification. Consumer modifications require separate reviewed branches.

## Sources and current behavior

The full live issue and both upstream discussions were read on 2026-10-28. The
current [major manifest](https://github.com/diplodoc-platform/transform/issues/519)
explicitly requires compatibility for block IDs, fragment includes, mixed
attributes and generated OpenAPI content. Do not close that umbrella issue.
The original [#722](https://github.com/diplodoc-platform/transform/issues/722)
reproducer is `transform('Hello {name}').result.html`: its final placeholder is
consumed by attrs today. The maintainer's
[existing workaround](https://github.com/diplodoc-platform/transform/issues/722#issuecomment-3027133853)
is `enableMarkdownAttrs: false`. Closing #722 requires the exact reproducer with
omitted options on the final installed package, not only an explicit-false test.

Relevant owning source at the baseline:

- `src/transform/md.ts:initPlugins` installs attrs when the flag is not false,
  before custom/default feature plugins; custom delimiters are forwarded.
- `src/transform/typings.ts:OptionsType` exposes the boolean and default-on docs.
- `src/transform/plugin-configuration.ts` derives closed `TransformCoreOptions`
  from named options. Thus the existing flag belongs in `core`, not under
  `plugins.options`, and attrs is not a new builtin plugin ID.
- `src/transform/yfmlint/index.ts` separately defaults its top-level flag to true.
  It currently installs attrs only when `customPlugins` is present. Its optional
  plugin list must not decide the new flag's meaning.
- `plugins/anchors/{index,custom-id}.ts` already recognizes simple heading IDs
  without attrs. Mixed attributes and custom-delimiter attrs are a different
  grammar. Preserve pre-attrs title capture, deduplication, labels and lint marks
  in explicit compatibility mode.
- `plugins/imsize/plugin.ts` already handles owned width/height/inline/gallery
  data without general attrs. A mixed group containing a foreign key/class is
  deliberately left in the source after owned dimensions are read.
- `plugins/includes/index.ts`, `utils.ts:findBlockTokens`, and `utilsFS.ts` expose
  an important fragment-selection dependency described below.

Bounded behavior probes used the already installed immutable 840 candidate
(source `73915ca656db35f1ff0d1b9acff3de32498f2270`); relevant md, anchors, imsize,
includes and bundled-lint source diffs against 551 are empty. They establish
current behavior, not implementation acceptance or an install of this branch.

## One option policy, separate host compatibility

Coordinate with DOCSTOOLS-6940's shared pure parser prelude. That stream may
extract the existing policy while preserving 551 behavior; this stream owns the
subsequent reviewed default change. The coordinator serializes those changes.
There must be one Transform default constant/resolver and no independent browser
copy. DOCSTOOLS-6946 owns image warnings/migration; its narrow brace parser and
existing imsize selector are unchanged by this task.

| Caller/configuration                                                | Final general attrs policy                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| Node root or `/parser`, omitted flag                                | false                                                      |
| Standard browser transform/parser, omitted flag                     | false, same shared policy                                  |
| Browser minimal preset, omitted flag                                | false; no feature plugins implied                          |
| Any supported Transform host, explicit true/false                   | exactly that boolean                                       |
| `defineTransformOptions({core: {enableMarkdownAttrs: true}})`       | true                                                       |
| Flat legacy `OptionsType.enableMarkdownAttrs`                       | same meaning as named core                                 |
| Named preset none or legacy `plugins: []`                           | does not override the core flag                            |
| Builtin anchors/imsize selected                                     | does not implicitly enable general attrs                   |
| Custom plugin configuration object containing a similarly named key | remains local plugin data, not a core override             |
| Bundled Transform YFMLint, omitted flag                             | false                                                      |
| Standalone `@diplodoc/yfmlint`, omitted new selector                | preserve its current true default                          |
| CLI compatibility integration                                       | explicitly true at renderer and standalone lint boundaries |

Use existing supported boolean semantics; this task does not introduce runtime
coercion rules for invalid arbitrary JS values. The builder need not materialize
a default value: resolve once at parser/lint installation. Only the explicit core
field controls attrs; do not infer it from arbitrary plugin data or names.

For bundled lint, form the attrs/custom-plugin list independently, including no
custom list and an empty list. Forward the same left/right delimiters to attrs.
Test rule-disabled/no-parser cases through real markdownlint rather than assuming
installation guarantees parsing. Preserve diagnostics, source maps, suppression,
paths and existing legacy-engine warnings; no lint cache redesign is included.

Standalone lint needs a bounded companion change before CLI can honestly pass a
selector: add typed top-level `enableMarkdownAttrs?: boolean`, retain default
true, honor false, and apply it independently of custom-plugin-list length. The
current public API and installed CLI package have no such selector and cannot be
claimed to support it. A flag inside `pluginOptions` alone is insufficient. The
caller passes one resolved value to the new top-level selector and to plugins
that need to observe it. There is no second competing selector in pluginOptions.
Validate a local immutable companion tarball/normal generated lock on a separate
branch; no publication or master merge is assumed. Default-on behavior with no
custom plugins is currently inconsistent; this small corrective change must have
an explicit regression rather than be silently hidden in the companion update.

## Finite syntax and compatibility corpus

| Case                                                                | Default false / explicit false                                                      | Explicit true                                                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Hello {name}`                                                      | Preserve `<p>Hello {name}</p>` (normal trailing newline allowed)                    | Retain current consumption; sanitizer may remove the resulting unknown boolean attribute |
| Prose `text {.class}`, `{title="text"}`, `{id="p"}`, `{hidden}`     | Visible literal text                                                                | Existing attribute parsing and sanitization                                              |
| `## Heading {#custom}`                                              | Preserve explicit heading ID/link/title                                             | Same supported heading behavior                                                          |
| Multiple simple heading groups `{#one} {#two}`                      | Preserve aliases and exact legacy grammar                                           | Preserve current aliases/deduplication                                                   |
| `## Heading {#custom .wide}` or `{id="custom" data-role="section"}` | Literal mixed group and existing automatic slug; not falsely preserved as custom ID | Preserve ID/classes/data, clean title and links                                          |
| `[#custom]` with configured square delimiters                       | General attrs disabled; no new heading grammar promised                             | Existing custom delimiter behavior                                                       |
| Empty shorthand ID, code/escaped/nonterminal examples               | Existing anchor rules; no new silent stripping                                      | Preserve YFM021/YFM024, title capture and literal cases                                  |
| `Paragraph {#p}`                                                    | Literal paragraph text, no p ID                                                     | Existing paragraph ID and fragment semantics                                             |
| Simple heading fragment include `child.md#id`                       | Must remain usable after the bounded selection fix below                            | Existing output unchanged                                                                |
| Paragraph/mixed-attribute fragment include                          | Explicit compatibility required until migrated                                      | Preserve exact selected slice, not whole file or empty fallback                          |
| `![alt](a.png "title" =20x30)`                                      | Existing imsize, coordinated 6946 warning                                           | Same image behavior                                                                      |
| `![alt](a.png){width=20 height=30}`                                 | Same width/height; no attrs dependency                                              | Same dimensions                                                                          |
| `![alt](a.png){width=20 .wide}`                                     | Width read; mixed group remains visible, no class                                   | Existing width+class consumption                                                         |
| Cut-owned `{.json-schema-combinators data-marker=anyOf}`            | Still owned and consumed by cut extension                                           | Same behavior                                                                            |
| OpenAPI `_Example:_{.json-schema-reset .json-schema-example}`       | General inline class group remains literal                                          | Existing classes and styling                                                             |
| Table `::{align="center"}` and legacy alignment class syntax        | Existing 6945 table behavior, independent of general attrs                          | Same generated alignment classes                                                         |
| Wide table `{wide-content title="Path \\"}`                         | General attrs literal                                                               | Preserve pinned literal-backslash title semantics                                        |
| Term definition/reference `[Title](*key)`                           | Preserve actual term contract; test definitions/includes/code                       | Same semantic output except explicitly authored general attrs                            |

Do not strip mixed groups or silently retain only their IDs to make a snapshot
pass. The migration choices are finite: keep attrs true while the source still
needs it; simplify heading IDs into supported standalone groups when the author
can drop the other attributes; migrate image dimensions through 6946; handle
OpenAPI generator output in its owner. Paragraph IDs have no proven equivalent
for all fragment-selection semantics, so a blanket rewrite to a standalone block
anchor is not proposed. Opt-in is a valid long-term supported choice.

## Blocking heading-fragment dependency

A real probe with existing `test/mocks/include-anchor.md`, `[includes, anchors]`,
and `{% include [section](include-anchor.md#test1) %}` returns empty HTML with
attrs false and the expected heading/content with true. This is a pre-existing
explicit-false limitation that becomes unacceptable as the standard default.
The child anchor rule skips `state.env.includes`, while `findBlockTokens` only
matches an existing token `id`; attrs previously assigned that ID first.

Proposed bounded implementation: reuse the existing simple heading-ID grammar
for heading fragment selection when a heading token has no usable explicit ID.
Keep attrs-created IDs authoritative. Do not parse arbitrary attrs, mutate cached
fragment tokens, generate global IDs, install attrs secretly, or replace the
existing section-end rules. Preserve multiple legacy aliases, notitle behavior,
nested/repeated includes, relative paths and document resource replay. Share the
small recognition routine with heading handling rather than copy a divergent
regex into includes. Exact placement/API remains a source-review decision.

Tests must establish heading selection at attrs false with nested/materialized
children before enabling the new default. Paragraph and mixed-attribute blocks
are explicitly outside that narrow fallback. Missing fragments must not turn
into successful whole-file includes. Viewer has its own id-only helper, so a
Transform-only fix is not proof of Viewer compatibility.

## Actual consumer adoption plan

CLI source checkpoint `5d0cce8aa35c2c4dd2f8e7b53be6378e8ef94cd9`:

- `src/commands/build/run.ts:transformConfig` sets `enableMarkdownAttrs: true`
  explicitly for compatibility, shared by render and lint preparation.
- `transform-configuration.ts:configureTransform` forwards it into the closed
  core; passing it only through `defineLegacyPlugin(legacyOptions)` cannot install
  the core attrs prelude.
- `Run.lint` forwards the resolved value to standalone YFMLint's new top-level
  selector through `lintWithLocalAnchors`; all wrapper re-entry paths preserve it.
- Keep the renderer's native15 and CLI-owned parseTokens native13 ownership.
  Standalone YFMLint's unchanged markdownlint fork embeds native14.1.0 despite
  declared/dev13 plugin contracts; it has its own attrs installation. Never cast
  one parser as the other or describe every lint context as native13.
- Real HTML, MD, MD→MD→HTML, merge-includes, paragraph/heading fragment links,
  local-anchor diagnostics, terms and generated OpenAPI must preserve output
  under explicit true. Preserve core-false tests separately from CLI compatibility.

Viewer source checkpoint `a401950a37ce12ca1b2f7f865637f2710a1a8016`:
its own `plugins/utils.ts:findBlockTokens` also relies on token IDs; its include
fixture explicitly installs attrs for `{#id}`. Existing generated content and
mixed IDs therefore justify a compatibility flag before its corpus migration.
Plan explicit true at the actual `transform-document.ts` owning boundary plus
`services/server/components/models/notification-content.ts` and
`packages/models/src/doc-info.js` transform boundaries, without changing worker messages or
security options. Confirm option merge order so user-selected false is not
unintentionally replaced where that configuration is already supported. Native
workers and offline browser/style checks remain required on an exact tarball.
This SDD does not authorize Viewer source edits or assume every app opts out.

Translation source checkpoint `42325734052e9e0aa2053f27720b18c6aaebfd55`:
the main skeleton constructs native13 directly and installs its finite plugins;
it does not inherit Transform's root prelude. The experimental parser installs
its local attrs fork explicitly. Preserve both routes, authored source bytes,
image/title extra-attrs extraction, placeholder IDs and frontmatter snapshots.
Actual CLI seeded translation and identity extract/compose are acceptance gates;
no parser upgrade, dependency cleanup or blanket attrs installation is needed.

## Verification and rollout gates

1. Default-resolution tests cover omitted/true/false through flat options, strict
   named core, default/none presets, explicit plugin arrays, Node/browser, parser
   handles and document fragments. Strict native CJS/ESM types accept the core
   flag and reject a fictitious builtin attrs option. No defaults leak from one
   configured parser/document to another.
2. Preserve `heading-attrs`, `anchors`, `block-anchor`, `markdown-attrs`, imsize,
   table and sanitizer/XSS tests. Compatibility-purpose tests set true explicitly;
   add separate default-off assertions. Review every intended snapshot difference
   against the finite matrix, never batch-update expectations.
3. Include corpus covers plain/mixed/paragraph IDs, multiple aliases, duplicate
   headings, heading title extraction, fragments/notitle, repeated/diamond/nested
   and materialized includes, failed parse/retry, terms whose definitions come
   from includes, and unchanged resources/paths/section bounds.
4. Test original #722 exact input, `Hello { name }`, middle-of-sentence braces, escaped/code text,
   quoted/backslash values and custom delimiters; no HTML sanitization bypass.
5. Bundled lint and standalone companion matrix: omitted/true/false; missing,
   empty and populated custom plugin lists; actual embedded14 standalone plugin contexts plus CLI-owned native13; matching
   renderer token IDs and diagnostics, YFM021/YFM024/YFM025, suppressions and source
   maps. External lint callbacks/isLintRun markers must not trigger bundled-lint
   warnings. Do not repurpose global lint cache or hide a parse failure.
6. Actual generated OpenAPI local schemas must exercise entity heading anchors,
   inline Example classes, combinator cut classes/data-marker and links. Report
   which constructs are independently owned and which require compatibility.
   No network schema fetch or new generator rewrite is part of this gate.
7. Build/pack exact Transform and companion SHA tarballs; verify installed bytes,
   native module types and real nested resolutions. Use genuine generated locks
   without peer bypasses. CLI explicit-on adoption must precede default rollout;
   Viewer compatibility and Translation regressions must be recorded separately.
8. Full appropriate Transform tests/typecheck/lint/build/package and browser
   host checks, bounded CLI tests/real binary cases, Viewer model/native workers
   and browser styles, Translation suites. Keep public legacy options and pinned
   attrs4.3.1 unchanged. Future warning/migration work does not block deliberate
   explicit compatibility; no removal deadline is invented here.

## Decisions requested before implementation

Approve the narrow heading-fragment recognition fix as part of this task, the
standalone lint selector companion with retained default true, and explicit-on
CLI/Viewer adoption sequencing. The coordinator must assign one owner/order for
shared prelude edits with 6940 and preserve 6946's independent image handling.
The coordinator has accepted the narrow heading-fragment and lint-companion
direction; implementation remains pending final SDD review. No unresolved product
question requires a human response now: the live issue,
existing consumer corpus and compatibility choices determine a bounded proposal.
