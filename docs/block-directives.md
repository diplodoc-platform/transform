# Block directives

Cut, Notes and Tabs accept container directives through the shared
`@diplodoc/directive` parser. Their existing `{% ... %}` syntax remains
available. File and inline directives are outside this change.

## Select syntax per feature

`directiveSyntax` belongs to each selected feature's options:

```ts
import transform from '@diplodoc/transform';
import {defineTransformOptions} from '@diplodoc/transform/configuration';

const options = defineTransformOptions({
  core: {disableLiquid: true},
  plugins: {
    options: {
      cut: {directiveSyntax: 'enabled'},
      notes: {directiveSyntax: 'enabled'},
      tabs: {directiveSyntax: 'only'},
    },
  },
});

transform(':::note {type=info}\n\nBody\n\n:::', options);
```

| Mode       | Legacy syntax     | Colon syntax      |
| ---------- | ----------------- | ----------------- |
| `disabled` | accepted          | ordinary Markdown |
| `enabled`  | accepted          | accepted          |
| `only`     | ordinary Markdown | accepted          |

Disabling a feature removes both spellings. The minimal preset has no block
features. An invalid mode is rejected before plugins are installed. There is
no shared flat `directiveSyntax` option that changes every plugin.

The standard preset defaults to `enabled`, accepting both legacy and colon
syntax. Standalone extension factories and explicit legacy Transform callbacks
default to `disabled`. A consumer
that supplies its own callback array must configure its own factories:

```ts
import {transform as createCut} from '@diplodoc/cut-extension';
import {createNotesPlugin} from '@diplodoc/notes-extension/plugin';
import {transform as createTabs} from '@diplodoc/tabs-extension';

const cut = createCut({directiveSyntax: 'enabled'});
const notes = createNotesPlugin(undefined, undefined, {directiveSyntax: 'enabled'});
const tabs = createTabs({directiveSyntax: 'enabled'});
```

Preserve the consumer's ordering, generator, runtime paths and include/link
handlers when replacing callbacks. Standalone Notes emits no styles through
the pure `/plugin` factory; the host must already provide Notes styles or use
the extension's resource-producing root/browser factory. Transform's builtin
bridge retains its existing Notes styles.

## Grammar and examples

An opening marker starts with at least three colons and a directive name at
the Markdown content position. Parameters follow in order: an optional
`[inline title]`, then the optional `{attributes}`. Cut, Note and Tabs reject
authored destinations and trailing prose. Titles and attributes occupy one
physical line; strings may use quotes and Markdown escaping.

A colon-only marker of at least three colons closes the innermost container.
Fence lengths are not paired: a four-colon opener can close with three colons,
and nested containers may use the same length. Indentation follows the shared
Markdown container parser, including list and blockquote contexts. The shared
parser owns labels, attributes, escaping and closure recognition. Longer outer
fences can make a nested example easier to read:

```markdown
::::cut [Details]

:::note [Read **carefully**] {type=warning}

The body is ordinary Markdown.

:::

::::
```

Code blocks, escaped markers and raw HTML retain ordinary Markdown parsing.
The extensions register their names with conflict detection: another owner
already registered as `cut`, `note` or `tabs` causes an explicit installation
error. Unknown directive names do not become one of these features.

### Cut

```markdown
:::cut [Optional **title**] {id="details" class="extra" open=true name="group"}

Body.

:::
```

The title may be absent or empty. Supported attributes are `id`, `class`,
`open` and `name`; `open` accepts `true` or `false`. Repeated classes are
combined; repeated scalar attributes and unknown attributes are rejected.
Destinations are unsupported. IDs retain the existing Cut anchor behavior.

### Notes

```markdown
:::note [Optional *title*] {type=info}

Body.

:::
```

`type` is required: `info`, `tip`, `warning` or `alert`. An absent title uses
the existing localized automatic title when enabled; `[]` explicitly suppresses
it. Other attributes, repeated `type` values and destinations are unsupported.
`notesAutotitle` retains its existing meaning.

### Tabs

```markdown
:::tabs {variant=radio group="shared"}

- First

  First body.

- Second {selected}

  Second body.

:::
```

The body uses the existing Markdown list and selected-item syntax. `variant`
is `regular` (the default), `radio`, `dropdown` or `accordion`. A valid variant
disabled by the host's existing feature settings falls back to regular.
`group`, when supplied, must be nonempty. Titles, destinations, other
attributes and repeated attributes are unsupported. ID allocation and runtime
resources retain the existing Tabs behavior.

## Diagnostics and source ownership

Invalid recognized parameters leave the container as ordinary Markdown; an
independently valid nested directive can still parse in that fallback. The
factory's optional `onDiagnostic({line, reason})` receives a one-based line in
the current parser input. It does not provide a source path or include chain
and is not a complete validator for every malformed or unclosed marker.

Transform's builtin bridge forwards those diagnostics to its local logger and
active document-fragment path. A host that preprocesses or caches includes
must retain its own source mapping. An input line in a generated combined
document must not be presented as a proved original child-file line.

## Migrate authored source

```ts
import {migrateBlockDirectives} from '@diplodoc/transform/migrations/block-directives';

const result = migrateBlockDirectives(source, {path: 'guide.md'});
// Review result.diagnostics before saving result.output.
```

CommonJS exposes the same synchronous named function:

```js
const {migrateBlockDirectives} = require('@diplodoc/transform/migrations/block-directives');
```

The pure API returns `output`, readonly `edits` and readonly `diagnostics`.
Edits use original JavaScript UTF-16 offsets: zero-based `start`, exclusive
`end`, and `replacement`. They are sorted and nonoverlapping. Apply them from
last to first if applying them yourself. Diagnostics use
`code: 'BLOCK_DIRECTIVE_NOT_MIGRATED'`, a reason, original `offset`, one-based
`line`/`column`, and the optional supplied path. The path is a diagnostic label;
the function performs no file reads or writes.

Only proved legacy Cut, Note and Tabs marker pairs are changed. Body bytes,
BOM, line endings and final-newline choice remain intact. The migrator uses
the extension owners' public recognizers and parsers, verifies whole-document
rendering and semantic fields with general Markdown attributes both enabled
and disabled, and preserves deterministic ID/resource behavior. Running it
again leaves the output unchanged.

Code, HTML, frontmatter, escaped examples, generated `{% included ... %}`
regions and protected directive scopes remain untouched. Migrate original
authored files before include expansion. The function does not traverse
includes, regenerate caches or execute consumer plugins.

Unsupported, crossed or unclosed parents and their descendants remain
unchanged with located diagnostics; independently safe siblings may migrate.
The same conservative rule covers unproved Cut attribute suffixes, empty
legacy Cuts and tight-list Notes whose real paragraph rendering differs.
Even semantically valid shorthand or differently formatted attributes can
require manual review when exact consumption cannot be proved.

The spellings do not have byte-identical token metadata. Notes content-wrapper
maps describe different synthetic boundaries; Cut structural maps, block
formatting and parser levels differ. Ordinary body maps, hidden flags,
attributes, inline contents, IDs and metadata are still compared. The migrator
does not discard all maps or whitespace to make a conversion pass. Cut title
map differences in loose lists currently cause a conservative refusal.

Source migration does not alter the chosen runtime mode. Configure the
consuming parser before deploying migrated documents. Translation, lint and
include integrations require their own source-aware adapters; successful
migration alone does not establish their acceptance.
