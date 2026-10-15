# SVGO parser patch delivery

Transform uses SVGO 4.1.0 with the Node parser changes from [svg/svgo#2224](https://github.com/svg/svgo/pull/2224). They make SAX's entity expansion limit configurable without changing its default for other callers. Transform passes a finite limit of 100,000 when it inlines SVGs. Draw.io metadata in real documentation can exceed SAX's default of 512; see [DOCSTOOLS-6096](https://st.yandex-team.ru/DOCSTOOLS-6096) and [svg/svgo#2218](https://github.com/svg/svgo/issues/2218).

The version-specific patch lives in `patches/svgo+4.1.0.patch`. It changes the ESM parser and optimizer, native SVGO CLI, generated CommonJS entry used by Transform, and generated TypeScript declarations. The browser bundle is unused by this integration and remains unchanged.

`npm install` and `npm ci` apply the patch through `prepare`; `prepack` reapplies it idempotently. The helper resolves the actual installation directory for standalone and hoisted npm workspaces. After installing with scripts disabled, run `npm run patch:svgo` before tests or builds.

SVGO is a development dependency. `build:lib` first compiles TypeScript, then bundles the patched adapter and its runtime dependencies into `lib/svgo.js`. Generated third-party notices are included in `lib/svgo.LICENSES.txt`. The published package neither fetches SVGO nor runs a patching install script: all of the Node parser code is already present in its internal module.

The isolated module avoids placing SVGO's dependency tree in the consumer's `node_modules`. Shipping that tree with npm `bundleDependencies` was rejected after an existing CLI installation placed `htmlparser2` beside a bundled, incompatible `entities` version. Keeping dependency code inside the module isolates both npm and pnpm consumers from this collision.

`npm run test:package` builds Transform, packs it, extracts the tarball, and exercises the isolated module through CommonJS and ESM without any installed dependencies. It checks the raised limit, default limit, multipass, per-call isolation, and third-party notices. `test/svgo-entities.test.ts` exercises the actual SVG integration and its finite upper bound. Regressions must use counted numeric references: predefined XML entities such as `&amp;` alone do not trigger SAX's counter.

After upstream releases the option, upgrade the exact development dependency and remove the patch and its prepare/prepack helpers. Keep the counted-entity integration and package regressions. Recheck the adapter's type-only import against upstream declarations and update DEP-0001. The isolated module can remain the delivery boundary when the local patch is removed.
