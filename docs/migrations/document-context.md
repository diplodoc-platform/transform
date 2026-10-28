# Reusing a parser with document contexts

Transform 5 keeps parsing and compilation synchronous. Each top-level parse now
owns a fresh plain environment. Keep the returned handle when parsing several
inputs with one configured parser:

```typescript
import parser from '@diplodoc/transform/parser';

const md = parser(options);
const first = md.parseDocument('---\nname: First\n---\n# First');
const second = md.parseDocument('# Second');
const firstHtml = md.compileDocument(first);
const secondHtml = md.compileDocument(second);

console.log(first.env.meta, second.env.meta);
```

Parser options and plugin configuration remain fixed at installation. Construct a
new parser for another path/root/options configuration. A custom `generateID`
function keeps its identity and caller-owned state; it is not reset or cloned.

`parse(input)` still returns tokens. `compile(originalTokens)` keeps their original
environment even after another parse. For a copied or independently assembled
array, explicitly select an owned handle: `compile(tokens.slice(), document)`.
Passing a handle created by another parser throws. A renderer failure invalidates
that handle for further compilation; a later parse starts clean.

The legacy destructured `env` reference remains a forwarding view of the active
root or last successful root operation. Use `document.env` to retain one document's
actual mutable object. Writes before the first parse seed its first attempt only; if that attempt fails,
the implicit view returns to a clean feature-initialized environment.
Custom per-document initialization belongs in `parseDocument(input, env => {...})`.
Do not freeze/seal the forwarding view; the error points to the plain document env.

## Plugins and nested content

Read and write metadata/assets through `state.env.meta` and `state.env.assets`.
Custom context fields can augment `ParserEnv` from `@diplodoc/transform/types`;
make application fields optional unless your own initializer guarantees them.
Import the augmentation target in your declaration/module file so TypeScript
loads the public interface before extending it:

```typescript
import type {ParserEnv} from '@diplodoc/transform/types';

declare module '@diplodoc/transform/types' {
  interface ParserEnv {
    requestLabel?: string;
  }
}

function initialize(env: ParserEnv) {
  env.requestLabel = 'page';
}

md.parseDocument(source, initialize);
```

The options object passed when installing a plugin remains parser configuration.

Use `parseDocumentFragment(md, source, state.env, options)` from
`@diplodoc/transform/document` for nested preprocessed Markdown. Its purpose is
explicit: `include`, `fragment`, or `reference`. Successful includes/fragments
contribute assets, runtime script/style URLs, CSP records, CSS allowances and
visibility audiences; includes also contribute first-wins term definitions and materialized-source
mappings. Explicit parent mappings and earlier successful includes win path
conflicts; reference and failed children do not populate the parent store. Links
still run before includes: a same-pass root title link cannot discover a mapping
that will only be materialized later inside a physical child. Root-encoded mappings
and subsequent explicit reference parsing are supported.
Child frontmatter does not replace parent frontmatter. A valid resource list that
collides with a malformed parent resource field fails before child data commits;
unrecognized resource-shaped frontmatter otherwise stays local and unchanged. Reference/title inspection
contributes none of those resources. Failed children do not commit those fields.
Custom mutable values are inherited by reference, without rollback of external
side effects.

Repeated resources are deduplicated in first-occurrence order. CSP keeps its array
of policy records; distinct records are not combined. Fragment includes still
parse the complete child before selecting tokens, so its resources are conservative.
Include cycles throw `IncludeCycleError` with the traversal chain and log a visible
error; the caller owns process/build failure policy. Transform no longer exits the
process from an include rule.

## Native MarkdownIt consumers

For an environment-aware metadata writer on native MarkdownIt 13 or 15, use the
small structural `envMeta` plugin. Its parser boundary does not depend on either
version's full parser type. The supplied environment is also the object passed to
render hooks:

```typescript
import MarkdownIt from 'markdown-it';
import {createDocumentEnv, envMeta} from '@diplodoc/transform/document';

const md = new MarkdownIt().use(envMeta);
const env = createDocumentEnv();
md.render('---\nname: Example\n---\nBody', env);
console.log(env.meta);
```

This is the replacement for consumers pairing external `markdown-it-meta` with
`md.meta` readers. Migrate both writer and reader; changing only the reader loses
metadata. Raw MarkdownIt callers own fresh environment creation between renders.

The live `env.meta` may also contain resources generated by body plugins, such as
stylesheet URLs or visibility audiences. Consumers extracting only authored text
must capture a document-owned metadata snapshot when the frontmatter rule succeeds,
before body plugins append those resources. Keep that snapshot separate from the
live resource collection. Do not exclude fields by name: an author can legitimately
provide `style`, `script` or `visibilityAudiences` in frontmatter.

Malformed YAML is left as ordinary Markdown by `envMeta`. This differs from the
exception raised by external `markdown-it-meta`; extraction consumers must retain
the original source when composing such documents.

## Compatibility diagnostics

| Code                           | Replacement                                 |
| ------------------------------ | ------------------------------------------- |
| `MD_META`                      | `state.env.meta` or `document.env.meta`     |
| `MD_ASSETS`                    | `state.env.assets` or `document.env.assets` |
| `MD_INCLUDED`                  | The current document's `env.included`       |
| `UNASSOCIATED_DOCUMENT_TOKENS` | `compile(tokens, document)`                 |

These transitions retain their legacy behavior with scoped warnings; removal is
no earlier than Transform 6. The unassociated-token fallback uses the last root
and cannot establish the original token source. Existing original-array calls do
not warn. Installation diagnostics have their own scope, while each document has
a fresh occurrence scope shared with its children. Ordinary root Liquid processing
shares the first document's reporter; low-level parsing does not invoke Liquid.
The existing global collected log arrays are unchanged.

This lifecycle change does not establish a parser cache, safe concurrent top-level
calls, or a fix for memory issue #605. Top-level reentrance is rejected explicitly.
