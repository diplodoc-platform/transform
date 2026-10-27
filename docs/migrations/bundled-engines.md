# Bundled Liquid and YFMLint in Transform 5

Transform 5 retains its bundled engines, APIs and defaults. Actual invocation
emits `TRANSFORM_BUNDLED_LIQUID` or `TRANSFORM_BUNDLED_YFMLINT`, including plain
input. Imports alone do not warn. Removal is no earlier than Transform 6 and
requires a published warning release and validated consumer migrations. No
Transform 4 warning release is claimed.

Root Transform runs Liquid unless `disableLiquid` or `isLiquided` is true.
`getFileTokens` processes included/reference content unless `disableLiquid` is
true; `isLiquided` bypasses only the root. `conditionsInCode` controls processing
inside code; it is not a global bypass. These settings retain their behavior.

For new composition, run standalone Liquid explicitly before synchronous Transform:

```typescript
import {createContext, liquidDocument} from '@diplodoc/liquid';
import transform from '@diplodoc/transform';

const context = createContext(logger, {conditionsInCode: false});
context.path = path;
const processed = liquidDocument.call(context, source, vars);
const output = transform(processed, {path, disableLiquid: true});
```

The caller must process included content too when disabling helper Liquid.
Alternatively `isLiquided: true` leaves helper processing enabled and its warning
visible. Translation callers must explicitly preserve their strict conditions,
`substitutions: false` and `cycles: false` settings. Source-map APIs and condition
semantics need consumer-specific validation; this is not an automatic engine swap.

Standalone YFMLint currently returns a Promise. Await it in the caller's pipeline:

```typescript
import {yfmlint} from '@diplodoc/yfmlint';
import transform from '@diplodoc/transform';

const diagnostics = await yfmlint(source, path, lintOptions);
// The caller handles diagnostics using its configured levels and failure policy.
const output = transform(source, transformOptions);
```

Keep lint plugins, config, source maps and diagnostic handling explicit. Do not
supply an asynchronous callback to the synchronous `getFileTokens` lint hook.
Calling an external lint callback does not itself use bundled YFMLint; standalone
lint plugins can still invoke bundled Liquid through enabled include helpers.
`disableLint` controls the helper callback; `isLintRun` remains a plugin marker.

Direct bundled Liquid's final settings and bundled YFMLint's plugin options accept
optional `log`, `compatibility` and `deprecations` diagnostics. Omitted reporter
means a fresh invocation scope; pass one reporter to deduplicate across explicitly
related calls and reset it at your next document/build boundary. Ordinary root
calls share their reporter with included sources. Repeated source paths deduplicate
within the scope; separate included files remain visible. Both compatibility
policy choices retain behavior and warnings. No process-wide cache suppresses
future deprecation warnings; the existing collected-log and lint-result-cache
behavior remains unchanged.

See [the implementation contract](../specs/transform-5/legacy-engines.md) and
[ADR-009](../ADR/ADR-009-deprecation-process.md) for lifecycle and release gates.
