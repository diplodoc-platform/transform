# Footnote review corrections

Related issue: DOCSTOOLS-6948.

## Contract

Only admitted references determine the displayed occurrence ordinal within each
owned source scope and note. The private upstream note/subId identity remains
unchanged for replay and ownership validation. Forward IDs, backlink destinations
and visible backlink labels use the same derived ordinal map. Removing a title
reference must not leave a gap. A/B/A document compilation remains stable.

Replace only the pinned `markdown-it-footnote@4.0.0` tail callback with a licensed
local adaptation. Append each body token once instead of concatenating the
growing document for every definition. Keep definition filtering, order, inline
note fallback, backlink placement and metadata unchanged. The pinned installer
and all other grammar rules remain in use; no consumer installation patch is
required.

## Acceptance

- Cover legacy and colon Cut/Note titles with retained body references and
  discarded speculative title references. Late inline titles still cannot admit
  otherwise unused definitions; that existing ownership constraint is unchanged.
- Compare complete tokens, environment and rendered HTML with the pinned
  upstream tail, including inline notes, repeated/duplicate/missing definitions,
  nested formatting and references inside definitions.
- Count copied token slots at increasing input sizes using the pinned tail as a
  failing control. Keep elapsed-time checks in the separate manual performance
  suite, outside ordinary unit tests.
- Retain the existing include replay, extracted-title, custom metadata, collision,
  Node/browser and installed native-host checks.
- Document the caret-label link collision and explicit selection between legacy
  `checkbox` and standard `task-list` in both migration guides.
