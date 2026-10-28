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
const occurrence = materializeFootnoteTokens(child.tokens, selected);
replayDocumentFragment(md, child, parentEnv, {purpose: 'include'});
parentTokens.push(...occurrence);
```

Materialization keeps transitive definitions reachable from the selected references, even when the definitions are outside the selected heading. It preserves currently admitted transformed bodies, copies token trees, reconstructs local nested sections, and prunes backlinks to absent references. It has no parser, renderer, resource, or generator effects. Do it before replay so a malformed selection cannot commit child resources.

The browser document API exports the same helper. Browser filesystem include directives remain unsupported: hosts prepare those sources before browser transformation. The helper is pure and does not import the footnote grammar into the minimal browser entry.

### Mutable titles and raw native callbacks

Replacing `document.env.title` with ordinary caller HTML/text remains supported and authoritative. The replacement relinquishes references from the previously generated title. Retaining generated anchor HTML while editing that opaque string is outside the ownership contract. Exact previously generated reference IDs in the `id="..."` or `href="#..."` spellings emitted by the renderer fail clearly before compilation effects. This finite guard does not parse arbitrary HTML or infer ownership of rewritten references. Caller-manipulated HTML links remain the caller's responsibility.

A native MarkdownIt callback supports reused environments and A/B/A rendering of the original parsed arrays. Temporary upstream fields are restored after parsing. For a selected standalone raw output, call `materializeFootnoteTokens(original, selection)` and render the returned array. Anonymous slices or assembled arrays containing unplanned references fail clearly because they have lost their source output record. An owned `compile(copiedTokens, document)` call retains its explicit document context and remains supported.

Replacing MarkdownIt's renderer, as Translation's structural/XLIFF pipeline does, requires explicit feature adoption in that renderer. The raw callback contract does not claim support for arbitrary token serialization or anonymous array copies. CLI, Viewer, Translation and SDK acceptance is a separate gate from this source implementation.
