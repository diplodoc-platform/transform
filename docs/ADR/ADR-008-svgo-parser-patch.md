# SVGO parser patch delivery

Transform uses SVGO 4.1.0 with the Node parser changes from [svg/svgo#2224](https://github.com/svg/svgo/pull/2224). They make SAX's entity expansion limit configurable without changing its default for other callers. Transform passes a finite limit of 100,000 when it inlines SVGs. Draw.io metadata in real documentation can exceed SAX's default of 512; see [DOCSTOOLS-6096](https://st.yandex-team.ru/DOCSTOOLS-6096) and [svg/svgo#2218](https://github.com/svg/svgo/issues/2218).

The version-specific patch lives in `patches/svgo+4.1.0.patch`. It changes the ESM parser and optimizer, the native SVGO CLI, the generated CommonJS entry used by Transform, and the generated TypeScript declarations. Transform does not use SVGO's browser bundle, which this patch leaves unchanged.

`npm install` and `npm ci` apply the patch in the development checkout through `prepare`. `prepack` reapplies it idempotently before packing. The helper resolves SVGO's actual installation directory, supporting both standalone and hoisted npm workspace installations. After installing with scripts disabled, run `npm run patch:svgo` before tests or builds.

SVGO is listed in `bundleDependencies` so npm includes the patched installation and its transitive dependencies in the Transform tarball. Consumers receive the fixed Node parser without running a patching install script or configuring their own package manager. This increases the package size and keeps this dependency local to Transform, which is intentional until upstream releases the option. `patch-package` remains a development dependency; the published package has no patching `postinstall`.

`npm run test:package` builds Transform, packs it, extracts the tarball, and exercises the bundled ESM and CommonJS entries without the development installation. It checks the raised limit, default limit, multipass, and independence of successive calls. `test/svgo-entities.test.ts` exercises Transform's SVG integration, including the finite upper bound. Use counted numeric references in regressions: a large number of predefined XML entities such as `&amp;` alone does not trigger SAX's counter.

To remove the workaround after an upstream release:

1. Upgrade the exact SVGO dependency and regenerate the lockfile.
2. Remove the patch and its prepare/prepack helpers, the development `patch-package` dependency, and `bundleDependencies` once ordinary installs preserve the fix.
3. Keep the counted-entity integration regression and verify the published package without bundling.
4. Recheck the TypeScript import adaptation against upstream's CommonJS declarations, and update the central DEP-0001 dependency policy.
