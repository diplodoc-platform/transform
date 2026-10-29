# Reference footnotes and task lists

The standard Node and browser presets include reference footnotes and disabled task-list checkboxes. Their IDs are `footnotes` and `task-list`; both have empty closed settings. The previously accepted 19 builtin IDs retain their order, followed by these two registrations. Legacy callback arrays are still replacement lists: add the callbacks explicitly when using that API.

```markdown
A reference[^details], repeated here[^details].

[^details]: A paragraph in the note.

    - [x] A completed task
    - [ ] An incomplete task
```

Definitions are local to their parsed source. An include cannot resolve a parent's label, or supply the definition of a parent reference. Same-label definitions in separate children are independent. Missing references stay literal and unused definitions emit no section, following the pinned official `markdown-it-footnote@4.0.0` grammar. Inline caret notes (`^[...]`) are disabled to preserve the existing superscript syntax. These ordinary grammar cases do not produce new diagnostics.

Footnote bodies retain ordinary Markdown formatting and sanitizer policy. Headings inside them do not enter page navigation. Backlinks have localized visible text in the configured language, defaulting to Russian. No script, resource metadata, CSP permission, enabled checkbox behavior, or broader HTML allowlist is added.

## Selection and public callbacks

The standard Node and browser presets enable both features. Disable either
independently, or select just one on the core-only preset:

```ts
import transform from '@diplodoc/transform';
import {defineTransformOptions} from '@diplodoc/transform/configuration';

transform(source, defineTransformOptions({plugins: {disable: ['footnotes']}}));
transform(source, defineTransformOptions({plugins: {disable: ['task-list']}}));
transform(
  source,
  defineTransformOptions({
    plugins: {preset: 'none', enable: ['footnotes'], options: {footnotes: {}}},
  }),
);
transform(
  source,
  defineTransformOptions({
    plugins: {preset: 'none', enable: ['task-list'], options: {'task-list': {}}},
  }),
);
```

Both settings objects are empty and closed: unknown keys and settings for an
unselected feature are rejected. `preset: 'none'` retains core Markdown and
sanitization. Task-list checkboxes are disabled; inline caret notes remain
superscript syntax rather than footnotes.

The stable ESM callback exports can be added to an integration's existing
legacy callback array, which replaces the standard list. Preserve the callbacks
already owned by that integration:

```ts
import transform from '@diplodoc/transform';
import footnotes from '@diplodoc/transform/plugins/footnotes';
import taskList from '@diplodoc/transform/plugins/task-list';

transform(source, {plugins: [...integrationPlugins, footnotes, taskList]});
```

CommonJS exposes the same default callbacks:

```js
const {default: footnotes} = require('@diplodoc/transform/plugins/footnotes');
const {default: taskList} = require('@diplodoc/transform/plugins/task-list');
```

For a CLI integration that does not already register these callbacks, the
existing extension hook can add them without replacing its other plugins:

```js
const {getHooks: getBaseHooks} = require('@diplodoc/cli/lib/program');
const {getHooks: getMarkdownHooks} = require('@diplodoc/cli/lib/markdown');
const {default: footnotes} = require('@diplodoc/transform/plugins/footnotes');
const {default: taskList} = require('@diplodoc/transform/plugins/task-list');

class Extension {
  apply(program) {
    getBaseHooks(program).BeforeAnyRun.tap('FootnoteSyntax', (run) => {
      if (run.markdown) {
        getMarkdownHooks(run.markdown).Plugins.tap('FootnoteSyntax', (plugins) =>
          plugins.concat(footnotes, taskList),
        );
      }
    });
  }
}

module.exports = {Extension};
```

Do not append callbacks already registered by the CLI. Adding callbacks alone
does not implement source-local footnote ownership for include expansion: a host
that selects or caches child tokens must also follow the document ownership
contract below. A Transform preset does not modify a consumer-owned callback
array.

## Document ownership

Use the normal synchronous document API for independently compiled roots. A namespace is allocated lazily when actual note anchors are emitted. An extracted H1 containing a reference is already rendered during parsing and therefore needs the same namespace early. `needTitle` retains its established precedence, including a second H1; a discarded extracted title does not contribute phantom references. Stable repeated compilation preserves IDs and does not repeat title renderer effects.

The exact caller `generateID` function is retained. Its prefix is encoded before internal scope/note/reference suffixes are appended. Constant prefixes are safe within one output; callers composing independently generated documents are responsible for distinct prefixes. A recognizable collision with an authored token ID fails clearly. Failed rendering does not commit a candidate namespace or mutate source tokens. Calls already consumed by an opaque generator cannot be undone.

With `renderInline:true`, note bodies are omitted and references become escaped literal `[^label]` text. This mode emits no footnote namespace.

### Selected or cached child insertion

The existing capsule API captures contributions. Replay is still void and does not parse, render, allocate IDs, or copy tokens. Materialize a fresh occurrence for **every** insertion, including whole-file repeats. Keep the original capsule and its tokens unchanged.

```ts
import {
  materializeFootnoteTokens,
  parseDocumentFragmentResult,
  replayDocumentFragment,
} from '@diplodoc/transform/document';

const child = parseDocumentFragmentResult(md, source, parentEnv, {purpose: 'reference'});
const selected = child.tokens.slice(start, end); // retain original token identities
const occurrence = materializeFootnoteTokens(child.tokens, selected, includePlaceholder);
replayDocumentFragment(md, child, parentEnv, {purpose: 'include'});
parentTokens.push(...occurrence);
```

Pass the actual include placeholder as the optional third argument. If it belongs to a footnote body, the helper copies the selection and privately inherits that provenance, including plain children and selected headings. The cached source is unchanged. No private marker API is required.

When there are no owned footnote tokens and no body provenance to inherit, the helper returns the selection unchanged; retain any ordinary token-copying policy your host already needs. Footnote-free root compilation similarly preserves original token identity and creates no optional footnote service. With footnotes, copies preserve token prototypes/property descriptors and arbitrary custom metadata identity; only native arrays and private feature data are copied.

Keep the existing host inclusion context during child parsing: the include stack defers heading anchors until admission. Materialization does not reconstruct already generated heading anchors from arbitrary pre-anchored capsules. As with ordinary repeated includes, the host retains its existing copy and heading-admission policy outside footnote bodies.

Materialization keeps transitive definitions reachable from the selected references, even when the definitions are outside the selected heading. It preserves currently admitted transformed bodies, copies token trees, reconstructs local nested sections, and prunes backlinks to absent references. It has no parser, renderer, resource, or generator effects. Do it before replay so a malformed selection cannot commit child resources.

The browser document API exports the same helper. Browser filesystem include directives remain unsupported: hosts prepare those sources before browser transformation. The helper is pure and does not import the footnote grammar into the minimal browser entry.

### Mutable titles and raw native callbacks

Replacing `document.env.title` with ordinary caller HTML/text remains supported and authoritative. The replacement relinquishes references from the previously generated title. Retaining generated anchor HTML while editing that opaque string is outside the ownership contract. Exact previously generated reference IDs in the `id="..."` or `href="#..."` spellings emitted by the renderer fail clearly before compilation effects. This finite guard does not parse arbitrary HTML or infer ownership of rewritten references. Caller-manipulated HTML links remain the caller's responsibility.

The callback uses finite public grammar, parsing, and rendering capabilities, without native private State or Ruler requirements. The pinned upstream installer is a plain function with no receiver dependence; the adapter invokes it directly.

Actual native13/14 hosts are checked with their published `@types/markdown-it` declarations in strict CJS and ESM modes. Native15 uses its bundled ESM declarations, including a dynamic ESM import from a CJS TypeScript fixture: the upstream 15.0.3 require declaration itself lacks required `resolution-mode` attributes under strict Node16 TypeScript. Its actual CommonJS runtime is separately exercised. Transform's stable CJS facade does not expose that broken declaration branch.

A native MarkdownIt callback supports reused environments and A/B/A rendering of the original parsed arrays. Temporary upstream fields are restored after parsing. For a selected standalone raw output, call `materializeFootnoteTokens(original, selection)` and render the returned array. Anonymous slices or assembled arrays containing unplanned references fail clearly because they have lost their source output record. An owned `compile(copiedTokens, document)` call retains its explicit document context and remains supported.

Replacing MarkdownIt's renderer, as Translation's structural/XLIFF pipeline does, requires explicit feature adoption in that renderer. The raw callback contract does not claim support for arbitrary token serialization or anonymous array copies. CLI, Viewer, Translation and SDK acceptance is a separate gate from this source implementation.

### Mixed and late inline contexts

Reference syntax in ordinary note/cut titles is supported when the source parse has already admitted the corresponding local definition. Term definitions keep the provenance of their independently parsed child scopes, including when their block parsing precedes the root tail. Table cells, tab bodies and ordinary nested formatting use the same reference forest. The existing tabs extension renders tab labels as escaped text: a label `Tab[^a]` stays literal, contributes no reference, and cannot retain a phantom note body by itself.

An active source's `parseInline` call after tail admission may resolve only labels whose bodies were already admitted by that source's local tail. A late synthetic metadata title cannot introduce a previously unused definition or resolve an unknown label: those references remain literal. Existing admitted references retain their source-local identity and counts. This finite host constraint does not reparse definitions or allocate another namespace. Inline parsing outside an active source also remains literal.
