# Underline and subscript parser adapters

The underline and subscript callbacks are the first bounded part of
DOCSTOOLS-6948. They use the official `markdown-it-ins@4.0.0` and
`markdown-it-sub@2.0.0` parsers. Both are enabled in the standard preset, after
the historical 17 callbacks. This interim standard inventory has 19 features;
footnotes and task lists remain outside this slice. Neither feature has options.

## Selection and public callbacks

```ts
import transform from '@diplodoc/transform';
import {defineTransformOptions} from '@diplodoc/transform/configuration';

transform('++underlined++ H~2~O');
transform(
  '++literal++ H~2~O',
  defineTransformOptions({
    plugins: {disable: ['underline']},
  }),
);
transform(
  '++literal++ H~2~O',
  defineTransformOptions({
    plugins: {preset: 'none', enable: ['subscript'], options: {subscript: {}}},
  }),
);
```

Stable ESM callbacks are default exports at
`@diplodoc/transform/plugins/underline` and
`@diplodoc/transform/plugins/subscript`. CommonJS uses the same default callback:

```js
const {default: underline} = require('@diplodoc/transform/plugins/underline');
const {default: subscript} = require('@diplodoc/transform/plugins/subscript');
```

No historical `lib/*` aliases are invented for these new modules. Empty settings
objects are accepted; unknown option keys and settings for unselected features
are rejected. `preset: 'none'` retains core Markdown parsing and sanitization,
while omitting both feature callbacks and underline-specific URL handling.

A legacy `plugins` callback array still replaces the standard list. Append the
callbacks explicitly to an integration's own array, preserving its includes,
links, and other custom callbacks:

```ts
import transform from '@diplodoc/transform';
import underline from '@diplodoc/transform/plugins/underline';
import subscript from '@diplodoc/transform/plugins/subscript';

transform(source, {plugins: [...integrationPlugins, underline, subscript]});
```

The CLI currently owns its callback list. Its existing extension hooks allow the
same additive composition without replacing CLI includes/link/image handlers:

```ts
import type {Run} from '@diplodoc/cli/lib/run';
import type {BaseProgram, IExtension} from '@diplodoc/cli/lib/program';
import type {MarkdownService} from '@diplodoc/cli/lib/markdown';

import {getHooks as getBaseHooks} from '@diplodoc/cli/lib/program';
import {getHooks as getMarkdownHooks} from '@diplodoc/cli/lib/markdown';
import underline from '@diplodoc/transform/plugins/underline';
import subscript from '@diplodoc/transform/plugins/subscript';

type MarkdownRun = Run & {markdown?: MarkdownService};

export class Extension implements IExtension {
  apply(program: BaseProgram) {
    getBaseHooks<MarkdownRun>(program).BeforeAnyRun.tap('InlineSyntax', (run) => {
      if (run.markdown) {
        getMarkdownHooks(run.markdown).Plugins.tap('InlineSyntax', (plugins) =>
          plugins.concat(underline, subscript),
        );
      }
    });
  }
}
```

This example follows the current CLI `mdit-plugins` extension's hook API. Actual
CLI/Viewer/Translation/Yfmlint acceptance is a separate pending gate; a Transform
preset change does not change an existing consumer-owned callback array.

## Underline

`++text++` produces `<u>text</u>`. Nested emphasis and links remain ordinary
Markdown: `++**bold** and _em_++` underlines bold and emphasized text without
changing `_em_`, `__strong__`, `*em*`, or `**strong**` elsewhere.

Delimiter balancing follows the pinned upstream grammar. `a++b++c` underlines
`b`; `+++x+++` leaves a literal plus on either side; `++ x ++` and unmatched
pairs remain literal. Block `+ item` lists, escaped pluses, and code are
unaffected. Only tokens belonging to matched plus delimiters are retagged;
third-party inserted-text tokens and renderers retain their behavior.

Use one parser for the `++` grammar. When the official `ins` plugin is installed
first, its tokenizer takes precedence and retains `<ins>` output. Installing
`ins` after underline while its postprocessor is enabled is rejected explicitly:
its postprocessor would otherwise reinterpret underline delimiters and corrupt
odd runs. Omit or disable underline when inserted-text output is intended, or
install only the intended `++` grammar. This precedence contract does not promise
isolation from arbitrary
third-party parsers that replace the same grammar.

Installing underline also enables paired plus suffix handling in Transform's
existing linkify helper. `++https://example.com++` underlines a linked URL.
An actual URL ending in pluses, such as `https://example.com/a++`, retains those
bytes when no underline opener is present. Only the grammar-owned pair is
removed from a wrapped URL: `+++https://example.com+++` produces a literal
leading plus and underlines a link whose href and visible URL both end in one
plus. Ordinary `+++text+++` still leaves a literal plus on either side. A parser without the underline
callback retains its previous linkify and strikethrough behavior. The helper
keeps the native `linkify` rule name, including its disable behavior.

## Subscript

`H~2~O` produces `H<sub>2</sub>O`. Subscript bodies contain plain text, with
Markdown escapes removed; nested Markdown is not parsed. For example,
`~**x**~` produces `<sub>**x**</sub>`. Unicode text is supported.

Unescaped whitespace and newlines, empty pairs, escaped openers, and unmatched
delimiters remain literal. An escaped space is accepted: `~a\ b~` produces
`<sub>a b</sub>`. Existing `~~strike~~`, odd/even tilde runs, tilde fences, and
superscript caret syntax retain their behavior.

## Options, attributes, and output

Neither callback has feature-specific options or browser state. Attribute
attachment follows the existing pinned `markdown-it-attrs@4.3.1` policy when
attrs is installed. For example, `++x++{.mark}` attaches the class to `u`, while
a trailing `H~2~O{.chem}` in a paragraph attaches the class to the paragraph.
Without attrs, the annotations remain literal.

Both callbacks emit native tokens and use normal rendering and sanitization.
Existing policy permits `u` and `sub`; no HTML allowance or URL scheme is added.
A shared scoped stylesheet makes underline explicit and retains zero subscript
line height with readable sizing and alignment. Base, yfm-only, full and print
style exports include it; existing links retain their link color. No new runtime asset, metadata field, or ID is needed.

The focused tests exercise native MarkdownIt 15.0.3 with attrs disabled and
enabled, standard selection, explicit legacy callback lists, and the existing
empty/none preset baseline. Packed package tests check native CJS/ESM callback
identity, closed types, browser-safe leaf imports, and stylesheet graphs.
Browser parser and actual consumer acceptance gates remain separate. This parser slice does
not complete DOCSTOOLS-6948 or its four source issue acceptance gates.
