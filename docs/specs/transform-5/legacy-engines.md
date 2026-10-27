# Retained legacy Liquid and YFMLint engines

Status: Approved contract; implementation under coordinator review.

Task: [DOCSTOOLS-6938](https://st.yandex-team.ru/DOCSTOOLS-6938).
Runtime design base: `18856b846ce06b27ab3739b11f5195967048307d`.
Reviewed registry baseline: `87d076745e905bdaaa1cc774668ef30520197d38`.

## Outcome and retained contract

Transform 5 deprecates bundled engines while retaining their implementations,
public entries, signatures, synchronous return shapes, settings and defaults.
Existing consumers make removal in this major inappropriate. No dependency,
lockfile, async API, generic loader, default flip or engine substitution belongs
in this task. Removal is no earlier than Transform 6, and requires a published
warning release plus migrated and validated consumers under ADR-009. A branch
warning is not evidence that warnings shipped in Transform 4.

The bounded audit is coordinator-owned and recorded in Tracker comment
`6ae0d795e516c53fcc29417c`; it is not repeated here. Confirmed dependencies:

- CLI translation units call `Transform/lib/liquid` directly with strict
  conditions, substitutions disabled and cycles disabled.
- CLI changelogs call root Transform without a Liquid bypass.
- The VS Code path uses standalone YFMLint with Transform includes/links; those
  reach `utilsFS.getFileTokens` and bundled Liquid.
- Viewer root calls explicitly bypass Liquid using `isLiquided` or
  `disableLiquid`; its own include helper does not run Liquid.

No direct bundled-YFMLint caller was found in those bounded sources. This is not
an ecosystem-wide absence claim and does not authorize removing its API.

## Proposed diagnostic decision

**Warn on actual engine invocation, including plain input.** The deprecated
feature is the bundled engine API/composition, not a particular syntax token.
Importing a module, registering a plugin or merely supplying a setting does not
warn. No regex/classifier attempts to decide whether Liquid syntax is meaningful.
This intentionally adds a warning to the default root call on plain text; root
approval of that diagnostic-count change is required before implementation.

| Stable code                 | Actual trigger                                                                                           | Replacement                                                                                                                         | Earliest removal                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `TRANSFORM_BUNDLED_LIQUID`  | Enter a public bundled Liquid document/snippet call, or an enabled root/helper invocation of that engine | Explicit `@diplodoc/liquid` composition; bypass bundled processing only after caller has supplied the corresponding processed input | 6.0.0, subject to release/migration gates |
| `TRANSFORM_BUNDLED_YFMLINT` | Call the bundled `yfmlint` entry, before its existing path-cache early return                            | Run `@diplodoc/yfmlint` in the caller's lint pipeline                                                                               | 6.0.0, subject to release/migration gates |

Both policy modes (`current` and `legacy`) preserve the existing engine/defaults
and emit the same warnings. No compatibility entry silences diagnostics, removes
an engine, or automatically selects a standalone package. This task needs no
second behavior implementation because the old behavior is retained.

Every warning uses ADR-009's reporter and existing collector/injected `log.warn`.
Use the actual source path if available; engine-level warnings do not invent line
or column coordinates. A stable option/API label (`bundledLiquid` or
`bundledYfmlint`) provides an honest occurrence when no path exists. With a path,
use the same code/path/label across root, helper and recursive calls, so repeated
processing of one file within one scope emits once. Different included source
paths emit separate occurrences. Frontmatter strings/internal snippet expansion
must not create additional public-call warnings.

The new deprecation entry is distinguishable from all existing engine/lint
messages by code. Tests assert unchanged existing diagnostic content/counts after
filtering only those exact new codes; snapshots and consumer assertions must not
silently discard arbitrary warnings. The existing bundled lint path cache, engine
settings service and module-global log collector are retained; fixing their
separate lifecycle is not part of this task. An API invocation can warn even if
its existing lint cache skips work, but lint errors themselves remain unchanged.

## Flags and negative cases

| Surface                | Existing invocation contract, retained                                | Warning result                                                                                      |
| ---------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| Root Transform         | Liquid runs unless `disableLiquid                                     |                                                                                                     | isLiquided`; both default false | One Liquid occurrence for an enabled call, including plain input and tokens mode |
| `getFileTokens`        | Only `disableLiquid` bypasses Liquid                                  | Enabled helper warns for the child file; root `isLiquided` alone does not disable helper processing |
| Direct bundled Liquid  | Public document/snippet function call runs with its existing settings | Warn even when all operations are disabled; the deprecated API was invoked                          |
| `conditionsInCode`     | Defaults false and controls only code-region processing               | Neither an engine bypass nor a warning suppressor                                                   |
| Helper lint callback   | Runs iff `!disableLint && lintMarkdown`                               | No bundled-YFMLint warning merely because a callback runs                                           |
| Direct bundled YFMLint | Its API has no root engine-disable switch                             | Warn for the call; preserve lint config, cache and diagnostics                                      |
| `isLintRun`            | Internal plugin lint-context marker                                   | Never treated as an engine-selection or warning flag                                                |

Setting both root Liquid bypasses, imports without calls, modern standalone
processing, absent lint callbacks, and standalone lint using Transform plugins
without invoking bundled YFMLint produce no bundled-YFMLint warning. Standalone
lint's includes may still legitimately invoke bundled Liquid unless disabled.

## Scope and direct API compatibility

One ordinary Transform call owns one document scope beginning **before** root
Liquid and shared through parsing, preprocessing, includes and title/reference
inspection. A repeat call with the same logger warns again; failure does not
suppress the next call. Never clear global logs to reset a reporter or modify the
generic logger adapter's warning deduplication.

Coordinate with the proposed DOCSTOOLS-6951 document-context design: each root
gets a fresh reporter, child frames share it, plugin closures receive the stable
active-scope facade, and registration-only diagnostics have a separate scope.
Root Liquid is a document operation, not a parser-installation warning. The root
wrapper must establish/adopt the same root scope before invoking Liquid; this
uses the agreed internal `initMarkdownIt(options, firstDocumentReporter?)` bridge.
The root wrapper passes its pre-Liquid reporter. DOCSTOOLS-6951 consumes that
reporter for the first attempted root only (including failure), then creates fresh
scopes. It does not add Liquid processing to the low-level parser.

Before 6951 lands, a narrowly injected shared reporter may bridge root Liquid and
parser initialization; reusable low-level parsers retain the documented existing
scope limitation until the document lifecycle change is accepted. Do not claim
automatic reset from that intermediate implementation.

Direct helper calls prefer an explicitly supplied reporter, then the active
state document reporter; otherwise allocate a fresh invocation scope. Direct
bundled Liquid document/snippet calls allocate a fresh invocation scope unless
an optional diagnostic context was supplied. Extend their final settings object
additively with typed `log`, `compatibility`, and `deprecations` fields; preserve
all existing arguments/generic return inference, and do not pass diagnostic fields
into engine settings state. Direct bundled YFMLint uses the same optional fields
on its existing plugin options, preserving the required logger shape. Do not
mutate or clone-away caller plugin fields. Parent and child calls with an explicit
scope share deduplication; separate standalone calls intentionally warn again.

Private implementation calls avoid duplicate public entry instrumentation:
`liquidDocument` and frontmatter processing use uninstrumented internal snippet
work while the public `liquidSnippet` wrapper reports actual direct use. No public
signature is removed. Low-level internal Liquid utility exports remain available;
the two public engine entry functions, not every internal evaluator/filter call,
are the initial diagnostic boundary. Their future removal remains separately gated.

## Migration compositions and declaration documentation

Add an ADR/migration guide and `@deprecated` JSDoc to the bundled Liquid and
YFMLint callable declarations/types, pointing to their standalone counterparts
and the earliest gated major. Preserve compatibility aliases and native ESM/CJS
shape tests; regeneration of facade declarations must not close paths.

Show the real standalone Liquid contract: `createContext(logger, settings)`,
set `context.path`, then `liquidDocument.call(context, source, vars)`. Pass the
processed result to synchronous Transform with `disableLiquid: true`. This
bypasses helper Liquid too, so the caller must have handled included content;
`isLiquided: true` skips only the root and deliberately leaves helper behavior.
Neither bypass flag is deprecated: both remain useful composition controls.
Document strict translation settings and source-map differences explicitly;
standalone substitution is not an automatic drop-in engine replacement.

Standalone YFMLint currently returns a Promise. Show it as an explicit caller
stage using `await yfmlint(source, path, options)` followed by ordinary synchronous
Transform; do not put an async lint callback into `getFileTokens` or change
Transform's return type. Preserve plugin/config/log-level mapping, rule behavior
and source-map needs as consumer-specific migration work. Do not promise exact
lint equivalence without the corresponding consumer fixture.

The parent workstream decision is updated in `plan.md`: the future browser entry
must compose a graph excluding retained server legacy code without claiming that
Node implementations or compatibility exports were removed by workstream 5.

## Required verification after design approval

1. Root flag matrix: defaults, each bypass independently and together, explicit
   false values, `conditionsInCode` false/true, plain text, actual Liquid syntax,
   tokens mode and malformed engine input. Preserve outputs/errors and old logs;
   assert exact deprecation codes and injected logger counts.
2. Helper matrix: enabled/disabled Liquid, `isLiquided` alone, plain/templated
   includes, repeated/nested/fragment includes and reference-title lookup. Assert
   root/child paths, one occurrence per same path/scope, distinct child paths,
   and no duplicate document/snippet/frontmatter warnings.
3. Direct public Liquid document/snippet calls retain default/named imports,
   strict conditions, cycles/substitutions false, source-map generic return
   types and fenced-code behavior. Cover omitted paths, frozen settings, a
   supplied shared reporter, separate fresh calls and reset/re-emission.
4. Bundled YFMLint calls preserve real rule diagnostics, suppression/re-enabling,
   config and cache behavior; warn through actual injected logger even on cached
   repeat calls with a fresh scope. External callbacks, disabled callbacks and
   `isLintRun` alone do not falsely report bundled lint usage.
5. With one reused external logger, repeat root A, A-to-B and failed-A-to-B;
   confirm forwarding re-emits in fresh scopes while ordinary warnings retain
   their old logger deduplication. Keep collected-log semantics explicit.
6. Native installed ESM/CJS runtime and strict declaration fixtures retain every
   affected compatibility API, optional diagnostic fields and generic returns.
   Run focused and complete units, typecheck, lint, build and package gates.
7. Consumer owner runs actual CLI translation units (strict/false/false),
   changelog generation, and the VS Code standalone-lint include/title chain
   against an immutable installed candidate. Require unchanged semantic output,
   error/lint diagnostics and callbacks plus expected new deprecations. Viewer
   bypass paths must add none unless an actually enabled bundled helper runs.
   Record source/consumer SHAs, tarball hash and exact commands. These are
   acceptance requirements, not claims that this design has run those consumers.

## Decisions requested

Approve invocation-level warnings on plain input, the two stable codes, one
occurrence per code/source/engine label, fresh standalone-call scopes with optional
shared context, unchanged current/legacy behavior, and the shared pre-Liquid root
scope contract with 6951. Implementation and consumer evidence remain pending.
No PR, push, publication or Tracker write is authorized by this specification.
