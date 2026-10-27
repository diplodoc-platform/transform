# Code highlighting in Transform 5

Transform 5 renders escaped plain code unless you supply a `highlighter`.
Installing Highlight.js alone no longer enables highlighting or causes Transform
to load it. Transformation remains synchronous.

## Preserve existing highlighted output

Import the implementation explicitly and adapt it once at your application's
initialization boundary:

```typescript
import transform from '@diplodoc/transform';
import hljs from 'highlight.js';
import {createHighlightJsHighlighter} from '@diplodoc/transform/highlighter';

const highlighter = createHighlightJsHighlighter(hljs);
const output = transform(markdown, {highlighter});
```

This preserves the full imported language set and the existing `hljs` wrapper
classes. `require('highlight.js')`, an ESM default import, and an awaited dynamic
import namespace are supported. The adapter itself does not import Highlight.js.
Supported peer versions remain `^10.0.3 || ^11`; the adapter selects the legacy
call for 10.0–10.6 and the modern call for 10.7 and 11.

The strict builder accepts the same core option:

```typescript
import {defineTransformOptions} from '@diplodoc/transform/configuration';

const options = defineTransformOptions({core: {highlighter}});
transform(markdown, options);
```

## Select and load languages

With Highlight.js 11, load a small implementation and grammar modules before
calling Transform. These paths support native Node.js imports and bundlers:

```typescript
const [module, javascript] = await Promise.all([
  import('highlight.js/lib/core'),
  import('highlight.js/lib/languages/javascript'),
]);
const highlighter = createHighlightJsHighlighter(module, {
  languages: {javascript: javascript.default},
  allowedLanguages: ['javascript', 'js'],
});
const output = transform(markdown, {highlighter});
```

For Highlight.js 10.x in native Node.js, use its version-specific `.js` paths:

```typescript
const [module, javascript] = await Promise.all([
  import('highlight.js/lib/core.js'),
  import('highlight.js/lib/languages/javascript.js'),
]);
```

Pass these resolved modules to the same adapter shown above. Do not apply `.js`
to both majors: Highlight.js 11 does not export `lib/core.js`, and its language
`.js` path is a deprecated compatibility shim. Extensionless subpaths on 10.x
may work through a bundler but fail with native Node.js module resolution.

When selecting individual grammars is unnecessary, the full package root is a
portable native import across all tested supported versions:

```typescript
const module = await import('highlight.js');
const highlighter = createHighlightJsHighlighter(module);
const output = transform(markdown, {highlighter});
```

`languages` registers factories on your instance. `allowedLanguages` restricts
fence identifiers, including aliases, by exact case-sensitive matching. Omit the
list to use every registered language; use `[]` to highlight none. Missing,
unknown and excluded languages render escaped source. No language is autodetected
or loaded from its name. Use independent Highlight.js instances when applications
need separate grammar registries.

## Migrate custom grammars

Replace `transform(markdown, {highlightLangs})` with:

```typescript
const highlighter = createHighlightJsHighlighter(hljs, {languages: highlightLangs});
transform(markdown, {highlighter});
```

For a transition, `highlightLangs` still registers factories when an explicit
adapter is supplied. This produces the scoped `HIGHLIGHT_LANGS` warning. A
nonempty map without a compatible highlighter raises an actionable configuration
error. An empty map does not load the optional peer or warn.

An explicit legacy factory is available when retaining the old initialization
style is necessary:

```typescript
import {createLegacyHighlighter} from '@diplodoc/transform/highlighter/legacy';

const highlighter = createLegacyHighlighter(highlightLangs, {log});
transform(markdown, {highlighter, log});
```

Calling this factory loads the full optional peer and emits
`LEGACY_HIGHLIGHTER_FACTORY`. If the peer is absent, code remains safely escaped.
The existing callable `lib/highlight` compatibility import also remains available.
The legacy factory and `highlightLangs` are scheduled for removal no earlier than
Transform 6, after a supported release with these warnings and consumer migration.
This document does not claim the warnings were published in Transform 4.

## Use another renderer

A `Highlighter` is a synchronous callback receiving source and a fence language.
It returns `{html, classes?}` containing a code-content fragment, or `undefined`
to request escaped source. Transform owns the `pre`/`code` wrapper. Class tokens
are escaped; empty `html` is retained. Custom callback errors propagate, and
Promise or malformed results fail explicitly. Highlight.js code-highlighting
exceptions fall back to escaped source; invalid modules and registration errors
fail clearly.

The usual final HTML sanitizer remains enabled by default. Supplying a highlighter
does not change an explicit `needToSanitizeHtml: false` setting. Terms, prompts,
line numbers, wrapping and copy controls continue through the existing code
plugin. This change does not provide a browser-safe Transform entry or optimize
the editor bundle.
