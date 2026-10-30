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

Cut title attribution in loose lists currently remains a refusal. Tight-list
Notes can change real paragraph visibility/HTML; empty legacy Cut can fail to
produce a Cut. Both remain unchanged. Do not normalize those differences away.

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
