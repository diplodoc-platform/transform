# ADR-010: markdown-it 15 and public parser APIs

Status: implementation candidate; registry RC integration is verified, while consumer and release validation remain gates.

## Decision

Transform uses **markdown-it 15.0.3**, exact-pinned with its dependency lock, and
its bundled TypeScript declarations. It no longer directly depends on
`@types/markdown-it`. This version provides CJS and ESM entrypoints, public parser
classes, and the reference/HTML complexity fixes released on October 16, 2026.
Future parser updates require the compatibility checks below before changing the
pin. Supporting markdown-it 13 or 14 as Transform's own parser is outside this
contract; standalone legacy lint may still bring its own older parser.

`markdown-it-deflist` moves from 2.1.0 to 4.0.0 because markdown-it 15 removed
`StateBlock.ddIndent`. With the old plugin, `a\nb\n: definition` incorrectly
becomes two paragraphs. The updated plugin preserves one ordinary paragraph.
`markdown-it-sup` remains at 1.0.0: the existing implementation passes the
superscript and term composition fixtures. `markdown-it-attrs` stays pinned to
4.3.1, preserving quoted backslashes and trailing backslashes. SVGO stays an
exact 4.1.0 development dependency with the existing patched internal bundle.

This task does not convert Transform source or its emitted package to ESM. The
separate package-entrypoint migration must test the same parser and plugin
contracts from both formats.

## Import migration

markdown-it 15 exports only the package root, `markdown-it/browser`, and
`markdown-it/package.json`. Its old `lib/*` paths cannot be imported, even when
the caller uses CommonJS.

| Previous dependency                                         | Supported replacement                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `markdown-it/lib/token` type                                | `import type {Token} from 'markdown-it'`                                                                           |
| `markdown-it/lib/rules_core/state_core`                     | Public `StateCore` type                                                                                            |
| `markdown-it/lib/rules_block/state_block`                   | Public `StateBlock` type                                                                                           |
| `markdown-it/lib/rules_inline/state_inline` and `Delimiter` | Public types from the package root                                                                                 |
| Parser and renderer types under `lib/`                      | Public `ParserCore`, `ParserInline`, `RendererRule`, or explicit callback signatures                               |
| Runtime `lib/common/utils`                                  | The parser's `md.utils`; shared helpers without a document parser use one public `new MarkdownIt().utils` instance |
| Runtime Token constructor                                   | `MarkdownIt.Token` or the supplied parser state's `state.Token`                                                    |
| DefinitelyTyped `PluginWithOptions<T>`                      | A function accepting the public `MarkdownIt` type and optional `T`                                                 |
| `Core.RuleCore`, `ParserInline.RuleInline`                  | Functions with public state types                                                                                  |

Native types describe parser environments as unknown-valued records. Transform
now declares its own known environment fields, rather than relying on the old
untyped record. Numeric token attributes are converted to strings where the
Transform API requires text, preserving zero through nullish rather than falsy
fallbacks. A custom-plugin fixture checks numeric href/src/width lookup and HTML. Parser `use()` infers plugin parameters; direct
collectors must provide their actual plugin context. Changelog metadata types
now match the existing runtime: an image is optional and its ratio is a number.

## Preserved behavior

Transform's `linkify` option remains false by default. When enabled, bare domains,
email addresses, and URLs containing authentication continue to be recognized.
Transform explicitly sets `fuzzyLink: true`, `fuzzyEmail: true`, and `urlAuth: true`
on linkify-it 6. Differential checks against markdown-it 13 establish these
values: fuzzy domain recognition and URL authentication changed upstream;
email recognition already defaults to true. This does not disable HTML
sanitization or enable script URL protocols.

The existing parser/HTML snapshots remain unchanged. Heading IDs, fragment
includes, nested notes/cuts/tabs, attrs, code, tables, sanitization, and inline SVG
continue to be checked by their existing suites.

## Intended upstream changes

These changes are accepted explicitly and covered by `test/markdown-it-15.test.ts`:

- A loose definition (`Term`, blank line, `: first`) now renders
  `<dd><p>first</p></dd>` instead of `<dd>first</dd>`. Deflist 4 also computes
  tightness per definition: a later tight definition need not acquire a
  paragraph wrapper merely because an earlier definition was loose.
- Unicode punctuation such as a fullwidth comma terminates an automatically
  detected URL. `https://example.com/a，後半` links only through `/a`.
- Reference-link opening tokens include `meta.label` with the normalized label.
  Reference-definition tokens remain suppressed by default. Plugin consumers
  must tolerate the additional metadata.
- Image alt text includes inline code and literal HTML markup rather than
  dropping them. HTML markup is escaped in the alt attribute.
- Whitespace-only code spans retain all their spaces.
- IPv6 link destinations preserve brackets rather than percent-encoding them.
- Reference definitions enforce a 999 Unicode code point label limit.

Other upstream corrections and resource-complexity fixes remain in effect; this
list describes representative migration fixtures, not a promise to preserve all
markdown-it 13 parsing edge cases. See the
[official changelog](https://github.com/markdown-it/markdown-it/blob/15.0.3/CHANGELOG.md).

## Release and validation gates

The stable file extension still peers on markdown-it 13, and stable tabs import
`markdown-it/lib/token` at runtime. Transform's integration candidate therefore
pins the reviewed registry prereleases exactly:

- `@diplodoc/file-extension`: `0.2.7-transform5.0`;
- `@diplodoc/tabs-extension`: `3.10.8-transform5.0`;
- `@diplodoc/utils`: `2.3.7-transform5.0`.

The RC tarballs were verified against the reviewed bytes in the npm registry;
tabs also depends on the exact utils RC in production. The registry manifest and
npm-generated lock use these versions without local paths, overrides, or peer
suppression. Clean standalone installation is checked against the registry.
Stable `latest` tags remain unchanged. Earlier local companion fixtures establish
candidate behavior only; the registry RC installation and package checks are
separate evidence. Nested older parsers from legacy lint and directive packages
remain allowed until their own migration is agreed.

Required validation:

1. A standalone clean `npm ci` without peer suppression, with an inspected parser
   tree and the intended file/tabs/directive resolutions.
2. All Transform tests, typecheck, lint, complete build, and installed-tarball
   package tests; verify patched SVGO remains isolated from registry consumers.
3. File, tabs, directive, and nested extension fixtures on the candidate parser.
4. CLI render and translation-document fixtures, standalone yfmlint plugin/token
   integration, and translation extraction, including attrs/backslash and
   visibility/term composition regressions.
5. Native CJS/ESM installed-tarball entrypoints and downstream declarations;
   browser/SSR/bundler coverage follows the package-entrypoint task.

[#397](https://github.com/diplodoc-platform/transform/issues/397) and
[#448](https://github.com/diplodoc-platform/transform/issues/448) describe the
original parser upgrade/loading scenarios.
[#519](https://github.com/diplodoc-platform/transform/issues/519#issuecomment-5915781869)
selects markdown-it 15 and remains open for the broader major.
[#1067](https://github.com/diplodoc-platform/transform/issues/1067) is covered only
partially: the separate css/decode-uri-component dependency chain, legacy lint
parser, and remaining downstream releases prevent a claim that its full scope
or all audit findings are resolved.

## Native declaration resolution

markdown-it 15.0.3's CJS declaration shim uses unqualified type queries into its
ESM declaration file. With TypeScript 6.0.3, Node16 module resolution, and
`skipLibCheck: false`, even this minimal CJS consumer fails with TS1542:

```typescript
// upstream-types.cts
import type {Token} from 'markdown-it';
```

Transform's declarations select the public ESM types explicitly, while its
runtime can continue loading the CJS implementation:

```typescript
import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
```

The same strict compile succeeds with this import. The
[TypeScript 5.3 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html#stable-support-resolution-mode-in-import-types)
document the syntax requirement, so declaration consumers need TypeScript 5.3 or
newer. Validation currently uses 6.0.3; it does not establish compatibility of all
transitive declarations with every earlier compiler.

A consumer importing markdown-it directly from a CJS source file may still hit
the upstream shim defect. It can select the ESM type surface separately from the
runtime require:

```typescript
import type MarkdownItConstructor from 'markdown-it' with {'resolution-mode': 'import'};

const MarkdownIt: typeof MarkdownItConstructor = require('markdown-it');
const md = new MarkdownIt();
```

This workaround does not modify the dependency, weaken declaration checks, or
change runtime module loading. Native ESM consumers use the upstream ESM export.
The package test checks Transform through both CJS and ESM loading and compiles
both consumer forms with `skipLibCheck: false`.
