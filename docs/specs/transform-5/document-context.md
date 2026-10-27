# Document context and parser reuse

Status: Approved for implementation; validation and review pending.

Task: [DOCSTOOLS-6951](https://st.yandex-team.ru/DOCSTOOLS-6951).
Inventory base: `18856b846ce06b27ab3739b11f5195967048307d`.
Implementation baseline: registry refresh `87d076745e905bdaaa1cc774668ef30520197d38`,
plus reviewed retained-engine bridge `b54abbdaa713061f2dd8051bd6750f9668c01196`.
Branch: `codex/docstools-6951-document-context`.

## Result and boundaries

Every top-level parse gets a fresh plain document environment. The returned token
array and its environment remain associated through compilation, including
`parse(A); parse(B); compile(tokensA)`. Builtin document data cannot survive into B
because the parser previously parsed A or encountered an error. A document handle
makes that association explicit without changing the synchronous API.

Keep the current parser installation model: parser rules, plugin options and
extension instances are created once. This work does not make arbitrary plugin
closures stateless, clone application options/generators, create a parser cache,
or promise parallel/reentrant top-level use. Existing filesystem/title caches and
module-global logs are outside this lifecycle change.

[#605](https://github.com/diplodoc-platform/transform/issues/605) describes a memory
report after repeated initialization and an application reuse workaround. Fresh
functional state is not proof of fixing that report or improving memory/time.
[#285](https://github.com/diplodoc-platform/transform/issues/285) concerns plugin
configuration isolation, supplied separately by DOCSTOOLS-6937.
[#519](https://github.com/diplodoc-platform/transform/issues/519) remains parent
context. None is automatically closed by this child.

## Evidence and finite inventory

The inventory is from the base above, plus read-only inspection of the current
Translation checkout and isolated CLI/Viewer consumers. It is not evidence that
those consumers have already migrated.

| Owner/source                                              | Current behavior                                                                                           | Proposed responsibility                                                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `md.ts`                                                   | One env closed over by parse/compile; meta/assets forward to md; title/headings survive until reassignment | Allocate document env, associate tokens, activate exact context, finalize resources                                     |
| `index.ts`                                                | New parser per ordinary transform; emits env and global logs                                               | Use explicit document handle internally; retain synchronous output and global logging contract                          |
| `plugins/meta.ts`                                         | Initializes `md.meta` at installation and replaces it with parsed YAML                                     | Initialize/write `state.env.meta`, including raw MarkdownIt usage                                                       |
| `plugins/images/index.ts`                                 | Initializes `md.assets` at installation and pushes image paths                                             | Initialize/write `state.env.assets`; keep image/SVG security and path behavior                                          |
| `utilsFS.ts:getFileTokens`                                | Shallow-copies env, saves/restores `md.meta` only on success                                               | Explicit child context, try/finally activation, purpose-specific success merge                                          |
| `plugins/includes/index.ts`                               | Push/pop `env.includes`; reads `md.included`; cycles call `process.exit(1)`                                | Document-owned traversal/content, finally-pop, recoverable typed cycle error                                            |
| `preprocessors/included/index.ts`                         | Stores materialized source in `md.included`                                                                | Store in active document's non-enumerable `env.included`                                                                |
| `plugins/links/index.ts:getTitle`                         | Uses the same getFileTokens helper to inspect another page                                                 | Reference-purpose child: return tokens/title without merging that page's resources/terms                                |
| `plugins/term/termDefinitions.ts`                         | Uses `env.terms`; calls `md.parse(title, state.env)`                                                       | Explicit fragment parse, keep document term semantics and isolate fragment frontmatter                                  |
| `plugins/term/index.ts`, `anchors/index.ts`               | Check include stack to distinguish root/subparse; local slugger per rule run                               | Preserve distinction and root term/anchor ordering                                                                      |
| `plugins/checkbox/checkbox.ts`                            | `lastId` is captured by installation closure                                                               | Move this builtin counter into document-private state, shared by its included fragments                                 |
| `plugins/video/index.ts`                                  | Appends CSP records to `state.env.meta.csp`                                                                | Keep writer working; normalize/merge finite CSP resource shape                                                          |
| `plugins/visibility.ts`, `ol-attr-conversion.ts`          | Write env metadata and CSS allowances                                                                      | Preserve writers; fresh document storage and selected child merges                                                      |
| Cut/tabs/file extension core rules                        | Write `env.meta.script/style`; add hidden `env.bundled` Sets                                               | Preserve plain env and these writers; fresh root/child env, merge resources                                             |
| `plugins/code.ts`, terms, tabs                            | Capture the supplied ID generator                                                                          | Preserve application generator identity; no automatic reset of its opaque closure                                       |
| `log.ts`, Liquid, sanitizer, frontmatter                  | Shared collected logs and direct global log calls                                                          | Retain current behavior; no claim of document-isolated diagnostics arrays                                               |
| Translation `skeleton/hooks/meta.ts`                      | Reads `this.md.meta` in a BeforeRender hook                                                                | Read its actual hook argument `env.meta`                                                                                |
| Translation `skeleton/index.ts`                           | Uses external markdown-it-meta, MarkdownIt 13, and `md.render()`                                           | Replace the old meta writer with env-aware plugin and pass explicit fresh env; validate parser compatibility separately |
| Translation `renderer/index.ts`                           | Already passes the same env into render hooks and inline rendering                                         | Use existing hook parameter; no new renderer lifecycle framework                                                        |
| CLI `commands/build/run.ts`, `transform-configuration.ts` | Destructures `{parse, compile, env}` before parse; fixed options per parser                                | Migrate to explicit handle while preserving legacy destructuring for other callers                                      |
| Viewer `transformer/plugins/utils.js`                     | Manual `md.meta` save/restore around nested includes, own token cache                                      | Adopt supported child helper; retain separately owned cache policy                                                      |
| Viewer `transformer/plugins/code/index.js`                | Manual meta save/restore for included code fragments                                                       | Adopt supported fragment/include context; keep fragment extraction semantics                                            |

Cut/tabs utilities define `env.bundled` as non-enumerable, non-writable and
non-configurable. Clearing enumerable keys on one reused env cannot reset this
state. Fresh objects, rather than a generic deep-reset utility, are required.
Tabs also owns a module run counter/slugger store; this task does not promise to
reset third-party module internals or fix their retention behavior.

## Public contract

`ParserEnv` remains the augmentable interface established in task 4. Add named
core fields to it without removing its existing extension compatibility. Expose
the following at `@diplodoc/transform/document` and re-export the relevant types
from `/types`. Preserve native CJS/ESM declaration identity through the existing
facade generator.

```typescript
export interface DocumentMeta {
  [name: string]: unknown;
  script?: string[];
  style?: string[];
  csp?: Record<string, string[]>[];
}

export interface DocumentEnv extends ParserEnv {
  title: string;
  headings: Heading[];
  meta?: DocumentMeta;
  assets?: string[];
  included?: Record<string, string>;
}

export interface ParsedDocument {
  readonly tokens: Token[];
  readonly env: DocumentEnv;
}

export interface DocumentParser {
  parseDocument(input: string, initialize?: (env: DocumentEnv) => void): ParsedDocument;
  compileDocument(document: ParsedDocument): string;
  parse(input: string): Token[];
  compile(tokens: Token[], document?: ParsedDocument): string;
  readonly env: EnvType;
}

export declare function createDocumentEnv(): DocumentEnv;

export interface ChildParseOptions {
  purpose: 'include' | 'reference' | 'fragment';
  path?: string;
}

export declare function parseDocumentFragment(
  md: MarkdownIt,
  source: string,
  parentEnv: ParserEnv,
  options: ChildParseOptions,
): Token[];
```

The handle is created/owned by one parser; it is not a user-constructible proof of
ownership merely because the public structural type can be described. Internally
validate ownership when compiling. Its `tokens` array is mutable as today; the
handle's bindings are readonly. Neither env nor custom metadata is deep-frozen.
`initialize` runs once on the new env before preprocessing, inside that document's
scope. It is the explicit place for per-document application fields. It does not
change parser options. `envMeta` and its structural `MetaParser` type are also exported from `/document`;
they provide the metadata writer without importing a full native parser type.
`createDocumentEnv()` is the plain-data initializer for
raw MarkdownIt consumers such as Translation; it does not register rules or
install parser services.

Do not add every internal service to enumerable env. Include content and internal
ownership/traversal bookkeeping must not appear as new result fields. Keep current
output presence: title/headings exist; meta/assets are initialized by the feature
that owns them, including empty objects/arrays when that feature currently does
so. `ParserEnv` augmentation remains the extension path; runtime/custom fields
are not silently copied from a previous document.

```typescript
import parser from '@diplodoc/transform/parser';

const md = parser(options);
const a = md.parseDocument(sourceA, (env) => {
  env.requestLabel = 'A';
});
const b = md.parseDocument(sourceB, (env) => {
  env.requestLabel = 'B';
});
const htmlA = md.compileDocument(a); // Uses a.env, never b.env.
const htmlB = md.compileDocument(b);
```

`requestLabel` requires the application's augmentation of `ParserEnv`, for
example an optional `requestLabel?: string` in its declaration file. Optional
augmentation is important: a generic fresh env cannot promise that an application
initializer has already populated its custom field. Core reserved field types cannot be redefined
by that augmentation. Avoid requiring custom context data in plugin configuration;
the options/context separation from task 4 remains intact.

## State ownership and fixed options

Parser-owned: MarkdownIt rules/renderers, plugin installation closures, configured
highlighter, static options, source callbacks and the finite compatibility
adapter. A top-level call cannot change `options.path/root/lang`, plugin options
or highlighter. Many existing plugins capture these at installation; changing
`env.path` alone would not change all their behavior. Therefore parser reuse is
for multiple inputs under the same parser configuration. For different document
paths/options requiring different closures, construct another parser. Included
source paths are an explicit existing child-parse mechanism, not a promise of
arbitrary per-document option overrides.

Document-owned: env meta/assets/title/headings/terms/changelogs/CSS allowances,
materialized include content, extension flags and hidden Sets, include traversal,
builtin checkbox counter, and occurrence deduplication for deprecation warnings.
Default parser-owned weak token/context associations only retain data while
corresponding tokens/handles or the last-root compatibility view remain retained.
This is ownership design, not a memory bound or leak claim.

Each root has a fresh deprecation reporter. Plugin installation receives a small
stable reporter facade whose methods delegate to the active document scope;
registration-time warnings use a separate parser-installation scope. This
supports plugins that capture `opts.deprecations` once. Nested includes share the
root reporter and use their source path for occurrences. A failed document's scope
is never reused for B. Completing parse/compile clears activation in `finally`;
there is no global current-document singleton.

The supplied logger remains the same caller-owned logger. Existing collected
`Output.logs` is module-global and remains so; do not clear it when starting B or
claim errors are erased. Metadata isolation and deprecation occurrence reset do
not imply isolated historical diagnostic arrays. Changes to global log ownership
would require a separate design.

If `options.generateID` is supplied, preserve that exact function and its state;
do not clone, reset, reinstantiate or reinterpret it as a factory. Its output may
advance across A/B and repeated compilation. If omitted, a stable internal
forwarder can use a fresh default random generator per root and share it with
nested children. No deterministic-HTML promise is made for random/custom IDs.
Tests compare document data/resources, and use explicit application generators
where stable IDs are part of a fixture. No unrelated change to default ID strategy.

## Parse/compile association and compatibility

The explicit handle is the primary API. `compileDocument(handle)` verifies that
this parser created it and uses exactly its env for all render hooks, including
title/inline rendering and the sanitizer's CSS allowances. A foreign or forged
handle fails clearly before rendering.

Legacy `parse(input)` delegates to parseDocument and returns its tokens. A
per-parser WeakMap associates that returned array with the handle. Thus ordinary
`compile(tokensA)` remains correct after parsing B. Mutating the same array in
place preserves association. This map is not a parse-result cache and is not
shared across parser instances.

Derived/unrecognized arrays (`tokens.slice()`, separately generated arrays,
arrays from another parser) cannot be assigned a document by guessing token
contents. The supported explicit migration is `compile(derivedTokens, handle)`;
this validates the supplied handle's owner and renders those tokens in its env.
Passing another parser's handle is an error. The caller owns the deliberate
choice to render arbitrary replacement tokens inside an explicit document.

For the transition, legacy `compile(unassociatedTokens)` retains its current
last-root-env behavior with an `UNASSOCIATED_DOCUMENT_TOKENS` warning, a replacement
example and removal no earlier than 6.0.0. It must not pretend the inferred context
is the original token source. With no root parse, the existing preparse env is
used with the same warning. This is a documented compatibility escape hatch, not
the correctness guarantee of the handle/original-token APIs. Existing callers
that pass the original returned array need no warning.

### Legacy env view

Existing code destructures `env` before calling parse. A property getter returning
a newly allocated env would leave that reference stale. Keep one narrow forwarding
Proxy for this old result-view surface only. Actual `state.env` and `handle.env`
are plain fresh objects. Forward custom augmented fields, enumeration
and ordinary mutations correctly; view descriptors are virtual and configurable
even when the underlying plain env property is non-configurable, preserving Proxy
invariants rather than claiming descriptor identity; do not expose hidden fields merely because
underlying extensions defined them. No generic proxy registry or recursive proxy.
The view has its own extensible target; reject attempts to freeze/seal it or
install non-configurable properties with an actionable migration to handle.env,
rather than violating JavaScript Proxy invariants. This constraint affects only
the legacy view, never the plain extension env where hidden properties are legal.

The view targets the active root document while a root operation runs, never an
included child. Outside a root operation it targets the most recently successful
root parse or compile; `compile(tokensA)` after B makes A the last successful root.
If a root operation fails, restore the previous successful target. A handle always
retains its own object regardless of view movement. Taking a copy/spread of the
view remains a snapshot, as today.

Before the first parse, the view points to a pending plain env. Explicit writes
there, or to legacy md fields during plugin setup, seed only the first root call;
then the pending env is consumed and later roots start fresh. If the first attempt
fails before any successful root exists, replace the implicit pending fallback with
a fresh feature-initialized env, dropping first-attempt seed writes. Both legacy
views use that clean fallback; the failed object does not become implicit current. Builtin setup writes
are migrated to their document rules, so they are not dependent on this seed.
After a completed parse, writes through the view edit that document, not a hidden
configuration template for the next one. Use initialize/core rules for per-document
defaults. Opaque application values are passed by reference; no deep clone of
application metadata/options is promised.

### Legacy md fields

Install only finite `md.meta`, `md.assets`, and `md.included` accessors. During a
parse/render frame they forward to that frame's actual env; outside frames they
forward to the last successful root or preparse pending env. Child activation is
always restored in `finally`, so save/restore compatibility consumers cannot
leave the parser pointing at a failed child. Warn on actual legacy field reads or
writes, not merely plugin registration: `MD_META`, `MD_ASSETS`, `MD_INCLUDED` with
`state.env.*` replacements, option/source location, and removal target 6.0.0.

Owned plugins/helpers must use env directly and therefore emit none of these
warnings. Bare MarkdownIt usage with the public meta/images plugins remains
supported: a small idempotent compatibility installation around native parse,
parseInline and render boundaries supplies the active/last-env pointer for old
md-field consumers. Do not initialize shared metadata at plugin installation.
Native `md.render(source)` must create or receive a fresh env; explicit supplied
raw env reuse remains the native caller's responsibility. Internal direct calls
must use the active env and restore nesting, never reset the outer document.
Each native `md.render`/`md.renderInline` call encloses both parsing and rendering
in one scope. A renderer exception cannot promote its already parsed env to the
last successful root: legacy fields retain the previous successful objects by
identity, and the next render uses a fresh env.

## Nested contexts and resources

A root parse operation cannot be reentered through the public parser's top-level
parse/compile methods while it is active: throw an actionable synchronous error.
This prevents ambiguous activation from custom callbacks. Nested native parsing
needed by includes, terms and renderers is supported through a finite child helper
with purpose `include`, `reference` or `fragment`; no async or parallel safety.

`getFileTokens` gains an explicit purpose option, defaulting to `include` for
compatibility. Its includes caller selects include; links/autotitle selects
reference. An exported `parseDocumentFragment(md, source, parentEnv, options)`
helper gives consumer-owned nested include/code
plugins the same supported boundary without imposing Transform filesystem reads.
The options contain purpose and optional child source path, not arbitrary parser
configuration overrides.

- Every child has fresh meta, assets, extension flags and hidden bundling storage.
  Parent metadata is never reassigned from child frontmatter.
- Include children inherit a snapshot of the visible term dictionary, traversal
  ancestry and materialized include sources. Commit newly defined terms on success
  using the existing first-definition-wins rule. Share the root ID generator,
  checkbox counter and deprecation scope. Restore parent path/activation in finally.
- Include/fragment success merges only assets, `meta.script/style/csp` and CSS
  allowances into the parent, plus the documented term additions for includes.
  Successful includes also commit child materialized-source mappings by absolute
  path: an explicit parent mapping or earlier successful include wins conflicts.
  Reference and failed children never commit mappings. The child preprocessor now
  runs inside its own context; physically nested materialized sources previously
  disappeared because getFileTokens preprocessed without md. A baseline probe
  of root→physical child→materialized grandchild plus root title reference failed
  with ENOENT. Successful map commits support later siblings and subsequent explicit
  reference parsing. Keep the established links-before-includes core ordering: a
  same-pass root title link to a mapping that exists only inside a physical child
  still cannot resolve before that child is processed. Root-encoded child:grand
  mappings remain available to same-pass links, as before. No deferred lookup phase.
  Preserve the builtin visibility writer's `meta.visibilityAudiences` aggregate by
  unioning successful include/fragment contributions in its canonical `human`,
  then `agent` order; overlapping values appear once. Reference/failed children
  contribute none. Other unknown parent metadata remains untouched.
  Other child frontmatter keys (title, custom flags, etc.) stay child-local.
  Fragment parses used for term text retain access to parent terms and do not
  replace document frontmatter or begin a new root lifecycle.
- Reference/title inspection returns tokens without committing metadata, terms,
  assets, runtime or CSP from the linked page. This corrects incidental asset
  contamination from the old shared md.assets implementation.
- Failed children commit no resource/metadata/term changes. Existing include
  skip-error behavior may continue after logging, but it must restore traversal
  and activation. A cycle is a recoverable typed error with its chain; remove
  the embedded `process.exit(1)` so callers can clean up and decide failure policy.
  The current `disableCircularError` reference-inspection behavior remains bounded.

Fragment includes currently parse a full child before selecting heading tokens.
Keep conservative resource collection from that successfully parsed child; this
may include resources from nonselected portions. Do not promise token-level
resource pruning. Preserve exact explicit anchors/attrs 4.3.1 behavior and test
both attrs-enabled and disabled configurations. No attrs default flip in this task.

Normalize finite resource collections at child commit, root parse completion and
compile completion, because renderer hooks may append resources too. Assets and
script/style URL lists use exact-string stable first-occurrence deduplication.
Order follows deterministic existing rule execution and include traversal; do not
claim a new universal source-order ordering across different core rule phases.

Keep CSP as an array of directive records. Within a valid record, deduplicate each
string-value array stably; eliminate structurally equivalent records using sorted
keys/value sets only for comparison, preserving the first record's display order.
Do not merge distinct policy records or change their policy semantics. Unrecognized
custom metadata outside these finite resource shapes is preserved, not recursively
merged or arbitrarily normalized. Malformed child resource-shaped frontmatter stays
child-local; a valid child resource list colliding with a malformed parent list
throws an actionable error before any child contributions commit. Reference-only
inspection does not attempt that merge. No custom-plugin/global resource registry.

CSS allowances merge as the existing property-to-boolean maps for resources in
included content. Child resource merging must not disable the final HTML/style
sanitizer or broaden its configured security policy beyond the existing extension
allowance mechanism. Test malicious HTML/SVG and styles alongside valid includes.

## Completion and failure

A successful parse returns a handle with complete parse metadata; compile may
add renderer resources and returns HTML. Repeated compile uses the same env and
stable deduplication, but does not promise arbitrary callbacks/custom generators
are idempotent. No automatic HTML caching. Handles remain inspectable after use;
there is no required dispose method and no lifetime claim beyond owned references.

All activation/traversal cleanup uses finally. A failed parse returns no handle;
a failed compile invalidates that handle for further compilation, retaining its
partial env only for inspection. Subsequent top-level B receives a completely
fresh env and deprecation scope. Do not roll back external side effects performed
by user callbacks, logger calls, filesystem reads/bundling callbacks or custom ID
generators. Their ownership is explicit.

## Consumer migration and acceptance

Transform and Translation changes are both required before completing the task.
Translation's hook already receives `{env}` from its custom renderer; switch the
writer and reader together. Its current metadata writer is markdown-it-meta, not
Transform's meta plugin, so changing the hook alone would silently lose frontmatter.
Its current parser/declaration dependency is 13.x; a separately owned consumer
branch must establish a compatible real parser/types set before claiming tests.
Do not edit its primary checkout or silently hide mismatches with skipLibCheck.

CLI should use parseDocument/compileDocument and return handle.env in its existing
MD/HTML flow. Validate MD output, HTML output, and MD→MD→HTML with materialized
included blocks and fragment IDs. Viewer should migrate both custom nested parse
wrappers, while keeping its own token/file cache policy explicit. Also run its
model/native-worker fixtures with repeated includes and YQL highlighting.

Required finite tests:

1. One parser: A(frontmatter/image)→B(no frontmatter/image), A→A, parse-error→B,
   render-error→B. Compare real meta/assets/resources and hidden bundling-state
   identity; never only compare HTML snapshots. Retained a.env must not change.
2. parseA→parseB→compileA then compileB; renderer observes exact env identity from
   each parse. Original arrays, in-place edits, explicit derived arrays, foreign
   handles, and warned legacy unassociated-array fallback.
3. Destructure legacy env before parse; enumerate/spread it, mutate custom fields,
   verify pending writes/last-root semantics, nested child pointers and errors.
   Plain env accepts real extension non-configurable hidden properties. View
   freeze/seal errors are explicit; no Proxy invariant failure.
4. Parent/child/grandchild frontmatter, same include twice, cyclic/error include,
   fragment include, notitle, reference/autotitle lookup and included materialized
   source A→B. Parent title/custom metadata survives; resources and terms obey
   the exact purpose/commit contract.
5. Real cut/tabs/file runtime registration, video CSP, images/SVG assets, term
   nested parse and CSS allowance merge; deterministic deduplication with attrs
   enabled/disabled. Keep security and normal synchronous output regressions.
6. ParserEnv augmentation in strict installed native CJS/ESM/Bundler fixtures;
   explicit handle types and negative wrong core-field types. No new required
   runtime path where ordinary transform may omit it.
7. Deprecation scopes: one occurrence per document, again on A→A, clean error→B,
   setup-only scope, nested source locations, external logger forwarding and
   unchanged global collection semantics. Custom generator identity/call sequence
   is preserved; no implicit reset.
8. Real Translation frontmatter extract/compose, nested translation/render hooks;
   real CLI MD/HTML/roundtrip and Viewer models/workers; installed immutable
   Transform package with compatible real companions outside the workspace.

Implementation will require focused unit/integration tests, full project checks,
normal hooks, exact-package checks and root/independent review. No dependency or
lockfile adoption is part of this design work; the parser owner controls that lane.
No publishing, PR, Tracker changes or consumer edits are authorized by this spec.

## Decisions requested from coordinator

Approve the additive handle API, narrow legacy view, explicit unassociated-token
compatibility warning, fixed parser-options boundary, nested purpose/merge rules,
and recoverable cycle failure. These are concrete implementation choices within
the task. No missing user product requirement currently requires a question.
The global diagnostic collector and opaque custom/third-party mutable closures
remain explicit limits, not silently claimed document isolation.

## Same-parser fragment contribution replay

`parseDocumentFragmentResult(md, source, parentEnv, options, prepareSource?)`
returns an opaque `ParsedDocumentFragment` with readonly `tokens` property. The
array/tokens themselves remain mutable with their original identity. A private
WeakMap associates this handle with its configured parser and a finite snapshot.
`replayDocumentFragment(md, fragment, parentEnv, {purpose})` commits that snapshot
using the same merge as the initial parse. Foreign-parser and forged handles
throw before any parent mutation. There is no serialization or cache registry.

The capsule contains only child-owned assets, script/style, cloned CSP records
and arrays, ordered visibility audiences, CSS flags, and terms/materialized keys
absent from the inherited parent at parse start. Parent-only keys, unknown child
metadata and title are excluded. Changes to inherited keys are not contributions.
All captured arrays/maps are copied; subsequent child or parent mutation cannot
change future replay. Parent terms/materialized mappings retain first-wins
semantics, and resources retain the established first-occurrence deduplication.

An initial reference captures contributions but commits none. Later include replay
can promote it. Fragment purpose excludes terms/materialized mappings. Every
resource collision is validated before committing anything; failed replay leaves
the parent unchanged and the handle remains retryable. Replay never parses,
renders, preprocesses, or calls an ID generator. The existing tokens-only
`parseDocumentFragment` delegates to the result API with unchanged behavior.

The optional final `prepareSource(source): string` callback runs synchronously
inside the child's active frame before native parse, with child path/flags already
set. This permits materialized-source preprocessing to write to the child rather
than its parent. Promise and other non-string return values throw a clear TypeError;
no handle/contributions are returned on preparation or parse failure. No implicit
Liquid execution is added. The callback may close over the same native parser.

The consumer owns cache keys/lifetime and token reuse policy. This API does not
make tokens context-free, repair cached IDs, handle changed caller flags, clone
custom plugin state, or permit cross-parser reuse. Same configured parser means
the exact parser object within its existing installation/options lifetime; callers
must not mutate its configured rules/options while treating fragments as reusable.
