# Block-directive contract

Task: [DOCSTOOLS-6943](https://st.yandex-team.ru/DOCSTOOLS-6943).
The automatic builtin default accepts legacy and colon syntax. Final installed
package, consumer and current-head CI acceptance are in progress.

The public grammar, configuration, examples and migration API are specified in
[Block directives](../../block-directives.md). Cut, Notes and Tabs own their
parameter semantics. The published shared Directive registrar/tokenizers own
colon labels, attributes, fences and body parsing. No parallel parameter or
closure grammar is introduced in Transform.

- Scope `directiveSyntax: disabled|enabled|only` to the three owners. Preserve
  explicit callback defaults, ordering, Cut collector identity, Notes styles,
  Tabs variants, ID sequence, resources and closed Node/browser settings.
- Use canonical public legacy recognizers on original normalized native block
  tokens. Protect frontmatter, code, HTML, escaped examples, unknown/protected
  colon containers and the included preprocessor's generated raw-line regions.
- Keep original UTF-16 offsets, BOM, NUL, CRLF/LF/bare-CR and EOF choice. Return
  sorted nonoverlapping edits and located refusal diagnostics. Do not read
  files or traverse include graphs. Reapplication must be unchanged.
- Unsupported, crossed and unclosed parents quarantine their descendants until
  the actual matching close or EOF. Independently proved siblings remain
  eligible. Unconsumed raw Cut attribute suffixes cannot disappear silently.
- Compare actual owner rendering, body tokens/maps, attributes, hidden flags,
  parsed inline children, metadata, IDs and allocator/resource invocation order
  under both general-attributes profiles. Preserve legacy implementations.
  Check only the explicit structural projections below.

## Finite metadata differences

Notes' synthetic content-wrapper maps differ: with zero-based opening and
closing lines O/C, legacy uses `[O+2,C-1]` and colon uses `[O+1,C]`. Body maps
still have to agree. Cut structural maps, markup, block flags and parser levels
differ because legacy inserts synthetic tokens after parsing. Private validation
may harmonize block-format newlines for the exact public Cut structural token
kinds, with restoration; it must preserve ordinary body/inline whitespace.
Tabs requires exact token maps, generated IDs and allocation sequence.

Cut title inline maps are synthetic: legacy uses `[0,1]`, colon uses `[O,O+1]`.
Validate these exact maps against their owning Cut before projecting them away;
ordinary body maps and title children remain exact. Other title differences in
loose lists remain a refusal. Tight-list Notes whose installed implementation
changes real paragraph visibility/HTML remain unchanged, as do empty legacy
Cuts that fail to produce a Cut. Do not normalize those differences away.

Notes keep synthetic wrapper/title levels independent of the parser's body
level. A lazy controlled Note probe, once for each attributes profile, recognizes
only the published zero-offset representation or the corrected two-wrapper
body offset. Validate paired Note maps and subtract that exact offset only
inside colon Note content, accumulating it for each ancestor. Preserve every
ordinary token level, hidden flag and other field in the comparison. Unknown
probe representations do not enable normalization. Tight-list Notes become
eligible only when the installed extension actually preserves paragraph HTML.

Resource comparison uses the existing `normalizeDocumentResources` function at
the same finalization boundary as public Transform parsing. It preserves order
and only normalizes its documented resource fields. Arbitrary environment and
metadata fields still compare exactly; bare-parser duplicate resource entries
are not a new public document semantic difference.

## Conservative migration and work budget

Shield only positively closed frontmatter (`---` or `...` closer). An unmatched
opening delimiter remains ordinary Markdown, so subsequent real directives can
migrate without losing the authored prefix.

The API accepts raw Markdown without a template execution context. Any unresolved
Liquid output opener (`{{`, even unterminated) or unknown template-like `{%`
opener leaves the **entire document unchanged**, with a located
`unresolved-liquid-template` diagnostic at the first such opener. Interpolation
inside a title may emit a closing bracket; interpolation before a container may
emit an opening code fence. Therefore even apparently separate literal siblings
cannot be proved independent. This guard applies inside code/HTML examples too:
the bundled Liquid engine substitutes variables in code, and callers can enable
conditions in code. It does not guess values or simulate branches.

The finite non-template YFM delimiter inventory comes from existing syntax:

- `cut` / `endcut`, `note` / `endnote`: their extension legacy recognizers.
- `list tabs` / `endlist`: the Tabs extension legacy recognizer (including its
  static variants and parameters; other `list` families are unknown).
- `file`: File extension's legacy `PREFIX`.
- `anchor`: `src/transform/plugins/block-anchor/block-anchor.ts`.
- `changelog` / `endchangelog`: `src/transform/plugins/changelog/collect.ts`.
- `include`: the exact `[label](path)` grammar from
  `src/transform/plugins/includes/syntax.ts`; a Liquid-style template include is
  unknown, even though it shares the tag name.
- `included` / `endincluded`: `src/transform/preprocessors/included/boundaries.ts`.

The lexical guard classifies these known families only; their existing parsers
still own parameter validity. It scans every opener independently, including
inside recognized parameters. Static unsupported parameters and protected YFM
examples retain partial-migration behavior; unknown tags are never assumed
harmless. Liquid whitespace-control prefixes are not legacy YFM delimiters.

Closed frontmatter remains shielded under the existing metadata contract.
`liquidDocument` extracts metadata, processes its values separately, and
serializes YAML before joining the independently processed Markdown body;
metadata interpolation cannot inject a Markdown fence through that path.
Unclosed frontmatter is ordinary Markdown and receives the template guard.

Compute source signatures once for both general-attributes profiles. Test whole
documents in hierarchical batches; nested groups are atomic. Cache complete
candidate verdicts, including failed proofs, and avoid retrying an identical
escaped-title candidate. Each actual full-input parser invocation in candidate
analysis or either signature profile consumes one of **32 work units** per
migration call. Partial proofs never authorize edits. After exhaustion, leave
unproved groups unchanged and return `equivalence-budget-exceeded` at each
opener. The constant setup (two observation parses, two source signatures, and
at most two small Note probes) and mandatory uncached final whole-document proof
are outside this candidate budget. Final proof failure restores the entire
original source. No public parser/rendering path gains this migration work.

Source edits are assembled from slices in one join rather than repeatedly
copying the whole document. The finite budget bounds full-source reparsing and
cached candidate strings; it deliberately permits conservative partial migration
on adversarial documents rather than replacing equivalence with a local guess.

## Acceptance gates

Source tests and a pure browser-bundle graph are necessary but insufficient.
Install the real archive and genuine dependency locks; test CJS/ESM identity,
strict emitted declarations, all three per-owner modes, Node/browser behavior,
runtime and styles. Keep source/token evidence for supported and refused cases.

Then exercise the real CLI, Viewer, both Translation pipelines and YFMLint
SDK/VSC adapters. Verify source and translated targets, syntax protected from
translation, lint lines/include chains, source ownership across cached/nested
includes, resource collection and browser interaction. Token line text replaced
by markdownlint from the root document is not proof of child source context.
Preserve independent reference/selection/materialization/replay ownership.

Consumer changes remain on local branches. The final installed matrix precedes
the automatic default flip, then final checks repeat. Current-head GitHub CI
and two further root reviews precede a merge into the Transform major branch.
Companion publication requires separate exact-version authorization; no master
merge or stable npm promotion is implied by these gates.
