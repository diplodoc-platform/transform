# ADR-009: Feature deprecation and compatibility scopes

Status: Accepted for the Transform 5 development branch.

Task: [DOCSTOOLS-6934](https://st.yandex-team.ru/DOCSTOOLS-6934).

## Decision

Every API or syntax migration follows this order:

1. Provide and document a replacement, including examples and affected consumers.
2. Publish a warning in a supported release before removal. The warning identifies
   actual usage, its replacement and the announced removal version and/or date.
3. Offer an explicit, feature-specific compatibility choice when a transition
   requires both behaviors. Document its defaults, supported releases and migration.
4. Remove the old behavior in the announced next major release after consumer
   migration checks. A date alone does not authorize removal in a minor release.
   Remove the temporary compatibility choice with its old behavior.

This task supplies the mechanism and policy contract. It introduces no concrete
deprecated features, warnings on existing options, syntax removals or changes to
existing parser defaults. Feature owners implement these in their migration tasks.

## Descriptor and usage contract

Import the helper and types from `@diplodoc/transform/lib/deprecation` (or the
corresponding source module while developing Transform). A descriptor contains:

- `code`: a stable identifier, shared by the warning, migration guide and policy;
  never reuse it for a different migration or derive it from message text;
- `feature`: the old API or syntax that was actually used;
- `replacement`: actionable replacement text;
- `removal`: at least one of `version` or `date`, or both. Use a semantic release
  version and an ISO calendar date when announcing a real migration.

Each `warn(descriptor, usage)` call supplies `location: {path, line?, column?}`
and/or `option`. Coordinates are one-based. Detect actual legacy usage first;
configuration presence or registration of a plugin alone is insufficient.
JavaScript callers receive a `TypeError` for empty required migration information.
The reporter field is optional in the shared plugin-options type to preserve
callers that construct options for direct plugin or collect calls; Transform
always supplies it when initializing its own plugins and preprocessors.

Warnings use the existing diagnostic collector and the injected logger's `warn`
method. For example:

```text
[DEPRECATED EXAMPLE_SYNTAX] Example legacy syntax at guide.md:3:4, option "exampleOption". Use example current syntax. Removal: version 6.0.0.
```

`EXAMPLE_SYNTAX` and all examples below are illustrative identifiers, not registered
deprecations or release promises.

## Scope and lifecycle

`createDeprecationReporter({log?, compatibility?})` returns a synchronous,
caller-owned reporter with `warn`, `reset` and `compatibility`. There is no global
registry or process-wide set of emitted deprecations.

Transform creates one reporter per parser initialization and passes it as
`options.deprecations` to plugins and preprocessors. Ordinary `transform()` calls
therefore receive fresh scopes, even when the embedding application reuses its
logger or a previous document failed. Within a scope, the tuple of code, path,
line, column and option suppresses repeated warnings. Different occurrences remain
visible. Message edits do not create a second warning for the same occurrence.

`reset()` only clears that reporter's occurrence set. It does not clear logs or
compatibility choices. Explicit reporters let a build owner choose a build scope;
reset that scope at the next build. A caller using a normalized Transform logger
still receives warnings after reset: scoped forwarding bypasses the generic
logger adapter's warning cache. Ordinary logger warnings retain their existing
deduplication behavior.

The existing collector deduplicates identical formatted messages in `logs.warn`.
An injected logger still receives an occurrence again in a fresh scope or after
reset. The helper does not isolate the collector or clear prior document logs.
There is no asynchronous API change or guarantee that a shared parser supports
concurrent use.

The low-level reusable parser currently retains its initialization scope across
multiple parses. Automatic per-document reset and carrying this scope in a unified
document `env` belong to DOCSTOOLS-6951. Consumers needing explicit build/document
boundaries outside ordinary `transform()` should own a reporter and call `reset()`
at that boundary. Do not create a process singleton to hide repeated diagnostics.

## Compatibility policy

`Options.compatibility` is a typed map from stable deprecation code to
`'current' | 'legacy'`:

```typescript
transform(markdown, {
  compatibility: {EXAMPLE_SYNTAX: 'legacy'},
});
```

A feature reads `options.deprecations.compatibility('EXAMPLE_SYNTAX')`. An omitted
code resolves to `current`; `*` is not a wildcard and prototype properties are not
policy entries. `current` means the feature's documented current contract. The
policy itself does not change parser behavior. Each feature task must define and
test the behavior of both choices before consuming its entry. Unknown code entries
are inert, so future feature policies can pass through older integrations.

Choosing `legacy` does not silence warnings, extend a removal deadline or enable
unrelated legacy behavior. There is no global legacy switch or warning-disable
switch. Custom plugin options continue to pass through unchanged; `compatibility`
and `deprecations` are reserved integration fields.

## Integration and verification

Plugins call the shared scope after detecting legacy usage, for example:

```typescript
const migration = {
  code: 'EXAMPLE_SYNTAX',
  feature: 'Example legacy syntax',
  replacement: 'example current syntax',
  removal: {version: '6.0.0'},
};

function examplePlugin(md, options) {
  md.core.ruler.push('example-migration', (state) => {
    if (detectExampleLegacySyntax(state.tokens)) {
      options.deprecations?.warn(migration, {location: {path: options.path}});
    }
  });
}
```

CLI already injects a logger through Transform's `log` option. Scoped warnings
must reach this logger and remain in `Output.logs.warn`; no console output or
parallel diagnostic channel is introduced. The Transform regression test runs a
real plugin and preprocessor with an injected logger, verifies both outputs,
checks independent calls and failures, and protects custom option forwarding.
An installed-package CLI smoke check is a separate integration acceptance step;
a mocked consumer alone does not prove the CLI application's logging behavior.
