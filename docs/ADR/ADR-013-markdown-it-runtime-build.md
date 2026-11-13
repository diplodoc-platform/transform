# ADR-013: Build the pinned Markdown-it runtime for ES2022

The legacy CommonJS distribution of Markdown-it 15.0.3 initializes Token fields
through repeated property-definition helpers. On Node 24 this adds measurable
cost to large paragraphs and repeated canonical parsing.

Build a private CommonJS runtime from the exact TypeScript sources embedded in the
installed 15.0.3 source map, with esbuild targeting ES2022. Use the same sources in
the browser build: its published ESM input is already lowered, so changing the
target alone does not recover native fields. Ship the
runtime and its complete third-party notices inside Transform; installation does
not modify upstream dependencies or depend on install hooks. Keep the existing
Markdown-it dependency for declarations and compatibility entry points. All Node
auxiliary parser construction, including visibility filtering, migrations and
link/image collectors, uses the same private runtime. Escaping utilities also
construct this runtime when obtaining utils, so they do not load a second stock
parser graph at startup. Dependency-owned parser imports remain separate.

Preserve native class fields, including property descriptors and the behavior of
inherited setters. Moving initializers into constructor assignments would change
that behavior and is not part of this decision. Parser rules and upstream source
are unchanged. The private runtime owns its constructor and Token classes; plugins
must use the parser instance they receive rather than constructor identity from an
independently installed Markdown-it copy.

The installed-package gate compares HTML, serialized tokens and environments with
the pinned distribution on public fixtures, and verifies inherited-setter behavior
and actual use by the public parser. The installed auxiliary API gate refuses
parsing through the stock dependency while exercising visibility, all migrations
and both collectors through native CJS and ESM entry points. A fresh-process
startup probe verifies utility loading and records dependency-owned bare imports
before any stock reference is loaded. Integration and
performance acceptance use the exact packed runtime. Reconsider the private build after upstream distribution
provides equivalent performance and compatibility.
