# ADR-012: Public ESM and CommonJS entry points

## Status and scope

Accepted for the Transform 5 integration branch (DOCSTOOLS-6936). This change does
not remove Liquid or YFMLint, publish a release, or make the Node transformation
graph a browser API. The browser TRANSFORM entry point belongs to DOCSTOOLS-6940.

## Module and build contract

Server sources use standard imports and exports. TypeScript emits one CommonJS
implementation graph into `lib/`, targeting ES2018. `tsconfig.transform.json`
explicitly selects Node16 module resolution and output. The package root remains
CommonJS so generated infrastructure configuration files keep working.

`scripts/public-api.mjs` is the entry-point manifest. The build generates:

- `api/**/*.mjs`: native ESM facades with explicit named exports and defaults;
- `api/**/*.cjs`: CommonJS namespace or legacy direct-value adapters;
- `api/**/*.d.mts` and `api/**/*.d.cts`: native declarations derived from the
  compiler-emitted implementation declarations, without copied API signatures.

An ESM facade imports the same CommonJS implementation as its CJS adapter. There
is no second implementation bundle, asynchronous initialization, or top-level
await in the public modules. Loggers, include caches, plugin objects, and callable
functions retain identity across mixed imports. The root default export, named
`transform`, CJS return value, and `transform.transform` are the same function.
The CJS declarations retain `transform.Options`, `transform.Output`, and the SVG
plugin's callable `images.replaceSvgContent` property.

Ordinary production dependencies remain external. In particular,
`createRequire(require.resolve('@diplodoc/transform'))('js-yaml')` continues to work.
Patched SVGO remains one isolated CommonJS bundle with its existing notices. Its
reachable upstream declarations are copied with that bundle and rewritten to
local paths, so consuming declarations never requires the development-only SVGO
package. Only the actually referenced Lodash and sanitize-html declaration
packages move from development to production dependencies.

The optional highlighter's registration callbacks use the peer-independent
`HighlightLanguageFactory = (highlighter: never) => object`. Transform forwards
these opaque callbacks to the installed highlighter's registration method; it
does not invoke them against an invented API. A callback typed as the installed
Highlight.js `LanguageFn` is accepted for both supported major families, 10 and 11. Inline callbacks that access the highlighter API must be annotated with that
installed library's type. No Highlight.js declaration or runtime dependency is
required when the peer is absent.

Run `npm run exports:update` after deliberately updating the manifest. The build
rejects an out-of-date `package.json#exports`. `npm run build:lib` regenerates all
facades and declarations; `dev:lib` performs that build before watching sources.
After changing the public export surface during watch mode, rerun the full build.

## Stable API

| Entry                                                        | Native ESM                                         | CommonJS                                    |
| ------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------- |
| package root                                                 | default and named `transform`                      | directly callable transform                 |
| `/parser`                                                    | default synchronous parser factory                 | directly callable factory                   |
| `/types`                                                     | named type exports                                 | named type exports                          |
| `/plugins`                                                   | default preset array                               | preset array                                |
| `/plugins/<plugin>`                                          | default plugin and explicit existing named exports | historical callable or namespace shape      |
| `/plugins/{anchors,changelog,images,includes,links}/collect` | default collector                                  | callable collector                          |
| `/plugins/utils`                                             | named plugin helpers                               | namespace                                   |
| `/preprocessors`                                             | default preset and named `preprocess`              | namespace with `.default` and `.preprocess` |
| `/frontmatter`                                               | named extraction/composition helpers               | namespace                                   |
| `/utils`, `/utils/fs`                                        | named helpers                                      | namespace                                   |
| `/sanitize`                                                  | default sanitizer and named options/style helpers  | namespace with `.default`                   |
| `/log`, `/deprecation`                                       | existing named exports and logger default          | historical namespace shape                  |

The precise plugin list lives in `stableEntries` in the manifest. A namespace
module such as `sanitize` or `visibility` is not converted into a directly
callable CJS value: existing `.default` and named-property consumers retain their
contract. The images plugin additionally has a native named `replaceSvgContent`
export, referring to the same function as its callable property.

```js
import transform, {transform as namedTransform} from '@diplodoc/transform';
import parser from '@diplodoc/transform/parser';
import images from '@diplodoc/transform/plugins/images';

const document = parser({plugins: [images]});
const html = document.compile(document.parse('# Example'));
```

```ts
import transform = require('@diplodoc/transform');
import images = require('@diplodoc/transform/plugins/images');

const options: transform.Options = {disableLiquid: true};
const output: transform.Output = transform.transform('# Example', options);
images.replaceSvgContent('<svg/>', {width: null, height: null, title: null});
```

## Runtime and stylesheet assets

| Stable entry        | Existing artifact        |
| ------------------- | ------------------------ |
| `/runtime`          | `dist/js/yfm.js`         |
| `/runtime/base`     | `dist/js/base.js`        |
| `/runtime/yfm-only` | `dist/js/_yfm-only.js`   |
| `/runtime/print`    | `dist/js/print.js`       |
| `/styles`           | `dist/css/yfm.css`       |
| `/styles/base`      | `dist/css/base.css`      |
| `/styles/yfm-only`  | `dist/css/_yfm-only.css` |
| `/styles/print`     | `dist/css/print.css`     |
| `/scss/*`           | `dist/scss/*`            |
| `/package.json`     | package metadata         |

These aliases preserve the actual split artifacts. A consumer's existing
bundler alias from base/yfm-only to full runtime remains that consumer's choice.
Node server modules support SSR without browser globals; runtime assets are
browser side effects and are tested in a DOM environment. Sass's package importer
can resolve, for example, `@use "pkg:@diplodoc/transform/scss/yfm-base.scss"`.

## Compatibility inventory and migration

The finite `legacyModules` inventory records the pre-existing server files.
Each remains accessible as `lib/<file>` and `lib/<file>.js`; directory entries
also retain `lib/<directory>`, `lib/<directory>/index`, and
`lib/<directory>/index.js`. These aliases use the same generated adapters and do
not promote every helper to stable public API. New implementation files do not
automatically receive aliases.

Existing distribution JS/CSS names, minified files, sourcemaps, `dist/scss/*`, and
`src/*` remain accessible. Retaining source delivery does not promise that
uncompiled TypeScript can be executed by every runtime.

| Existing consumer import                 | Preferred replacement                    |
| ---------------------------------------- | ---------------------------------------- |
| `lib/md` or `lib/md.js`                  | `/parser`                                |
| `lib/typings`, `lib/plugins/typings`     | `/types`                                 |
| `lib/plugins`                            | `/plugins`                               |
| `lib/plugins/<name>[/index][.js]`        | `/plugins/<name>`                        |
| `lib/plugins/<name>/collect[.js]`        | `/plugins/<name>/collect`                |
| `lib/utilsFS[.js]`                       | `/utils/fs`                              |
| `lib/utils[.js]`, `lib/frontmatter[.js]` | `/utils`, `/frontmatter`                 |
| `lib/sanitize[.js]`, `lib/log[.js]`      | `/sanitize`, `/log`                      |
| `dist/js/yfm[.js]`                       | `/runtime`                               |
| `dist/css/yfm.css`                       | `/styles`                                |
| `dist/scss/yfm-base.scss`                | `/scss/yfm-base.scss`                    |
| `lib/liquid/*`, `lib/yfmlint/*`          | retained; removal is explicitly deferred |

An alias may be removed only after a stable replacement, consumer migration,
and the deprecation process in ADR-009 have been completed. This change does
not emit warnings merely for resolving an alias or close known consumer paths.
The separate SVG option migration retains its `inlineSvg` alias and scoped
warning, as described in ADR-011.

## Runtime support and acceptance

The supported engine is Node.js 24 or newer. Published
`@diplodoc/tabs-extension@3.10.7` already declares `node >=24` (verified against the
registry on 2026-10-27); this formalizes the existing dependency graph's floor.
The tested runtime is Node 24.15.0. ES2018 is the JavaScript syntax target, not a
claim that all dependencies support an older Node runtime. The parser's
transitive dependency floor alone is insufficient to establish package support.

`npm run test:package` packs and installs the actual artifact, then verifies:

- native ESM and CJS for every stable entry and retained server alias;
- synchronous parser/transform operation, SSR without DOM globals, shared
  function/plugin/logger identity and include-cache state;
- callable CJS namespace types and SVG helper properties without interop;
- strict `.mts`/`.cts` consumers with Node16 and NodeNext resolution, plus ESM
  bundler resolution, all with `skipLibCheck: false`;
- patched SVG buffer/entity handling and third-party notices;
- optional highlighter absence and supported installed highlighter families;
- packed runtime/style/source paths, browser bundles and DOM execution for each
  split runtime, CSS bundling, and Sass package-importer resolution.

For unreleased companion compatibility work, an isolated fixture may explicitly
set `TRANSFORM_PACKAGE_COMPANIONS` to a JSON map of local tarball dependencies.
This is an acceptance fixture only: committed dependencies and the lockfile
remain registry-based. The current registry file-extension peer range still
rejects parser 15; clean registry installation remains gated on companion
releases. The two promoted type dependencies reuse existing lockfile versions
and integrity records; their production reachability metadata is updated without
changing the blocked peer resolution.

CLI/viewer acceptance and CI for the final integration revision remain separate
merge gates. Passing an isolated local fixture does not establish those gates.
