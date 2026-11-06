# Document diagnostics and explicit project aggregation

Task: [DOCSTOOLS-6938](https://st.yandex-team.ru/DOCSTOOLS-6938), finding 1.
Status: approved contract for the Transform 5 development branch.

## Default ownership

Every ordinary Node/browser Transform root owns a fresh diagnostic collector.
`Output.logs` is a detached snapshot of that document's info/warn/error/disabled
arrays. Later documents, parser reuse, explicit collector clearing, and mutation
of another returned snapshot cannot change an earlier output. No ordinary root
implicitly retains its diagnostics in a module-global collector. This is an
intentional Transform 5 behavior change from process-wide accumulated returns.

The document sink includes installation messages assigned to the first document,
root Liquid preprocessing, included/reference sources, child fragments, parser
rules, compile/render and final sanitizer diagnostics. All levels and existing
message codes/content remain supported. Child parsing uses its enclosing document
sink even when its metadata/resources commit differently. A thrown exception
leaves the failed document diagnostics available through its explicit external
logger/project collector and, after parser construction, `parser.logs`.

## Explicit project collector

`createDiagnosticCollector()` is exported by the Node `/log` entry and both
browser entries. Pass `diagnostics: collector` to retain project/build history:

```ts
const build = createDiagnosticCollector();
const a = transform('A', {path: 'a.md', diagnostics: build});
const b = transform('B', {path: 'b.md', diagnostics: build});
// a.logs and b.logs contain only their own document messages.
const buildLogs = build.get(); // Detached aggregate snapshot.
build.clear(); // Explicit caller-owned boundary; old snapshots are unchanged.
```

The optional collector is an aggregate mirror, not the document return sink.
The existing `log` option still forwards messages to an embedding application's
logger; it does not define a document boundary. Shared collectors deduplicate
identical formatted info/warn/error entries with indexed membership and retain
first occurrence order. `add()` appends supplied arrays, including duplicates;
`clear()` clears only that collector. `get()` returns copies, so arbitrary caller
mutation does not require Proxy traps or stale membership-cache repair.

The existing exported module-global `log` retains its mutable `get/add/clear`
compatibility behavior. It receives only explicit writes, explicit `log` forwarding,
or an explicit `diagnostics: log` aggregation request. It is not silently cleared
at root entry/exit. Its retained history is caller-owned and unbounded by design;
new document-scoped collectors do not claim to repair that legacy lookup path.

## Parser and helper routing

`parseDocument()` allocates a fresh sink on every root, including after failure.
A parsed handle exposes `document.logs` as a snapshot getter; compilation of an
older owned handle routes back to that handle's sink. `parser.logs` exposes the
active/latest root snapshot or pending installation messages before the first
parse. Setup diagnostics are emitted once when setup actually executes and belong
to the first root only; reuse does not rerun setup or invent new occurrences.

Rules and extension callbacks retain a stable per-parser logger facade. Its
selected sink is owned by the parser's synchronous document state, restored in
`finally`; separate/reentrant roots use separate facades. No process ambient
context, global active logger, Node AsyncLocalStorage or asynchronous boundary is
introduced. Parent/child fragments retain the same logger and reporter routing.

Returnless standalone Liquid/lint/helpers allocate an invocation-local sink unless
they receive an existing managed logger. Optional `diagnostics` mirrors messages
to an explicitly retained collector; optional `log` forwards them externally.
Internal frontmatter/evaluation/condition/cycle/substitution paths receive their
logger explicitly, including recursion. Compatibility subfunctions that are called
directly without an invocation context retain their documented optional logger
fallback; actual root routes never use an implicit global fallback. Node/browser
sanitizers bind the selected document logger for their runtime diagnostics.

## Acceptance

Cover 250 unique-path roots with one warning each and no global growth; stable old
outputs after new roots, collector clear and snapshot mutation; explicit project
aggregation/order/add duplicates; parser reuse and compile of older handles;
setup diagnostics once; success/failure/reentry; tokens-only roots; all levels,
runtime Liquid/frontmatter and sanitizer diagnostics; nested includes/fragments;
external logger scoped re-emission; Node/browser parity; installed native CJS/ESM
and strict declaration fixtures. Keep legacy mutable `log` behavior tests intact.

## Deprecation warnings

Deprecations remain enabled by default. Preserve their existing messages in the
document's `logs.warn` and in explicit build collectors. When an external logger
provides `deprecation(message)`, forward through that callback exactly once per
reported occurrence. Fall back to `warn(message)` for existing loggers. Ordinary
warnings always go to `warn`, including warnings emitted by third-party plugins.
The category is selected by the emitter, independent of the message text.

Flat Node and browser options, the typed core builder and standalone diagnostic
entry points accept `deprecationWarnings: false`. Skip deprecation formatting,
deduplication and retention in this mode. Keep parser compatibility choices,
ordinary warnings, actual errors and HTML unchanged. Explicit custom reporters
do not override the global opt-out. The adapted CLI can therefore display
deprecations without including them in its strict warning count.
