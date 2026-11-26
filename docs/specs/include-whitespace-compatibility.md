# DOCSTOOLS-6935: legacy include paragraph whitespace

Native markdown-it 13 applied JavaScript `trim()` to paragraph content. Native 15
uses ASCII trimming and preserves NBSP, BOM and other Unicode spacing characters.
An authored NBSP before a standalone include therefore stopped matching the
anchored include grammar. The CLI's merged Markdown route expanded the include,
while its unmerged and direct HTML routes displayed the literal marker and lost
the included prose. Four real Metrica install-tag pages reproduce this failure.

Restore the previous candidate text only at the existing paragraph-open, inline,
paragraph-close recognition boundary. Match `inline.content.trim()` against the
unchanged grammar. Do not assign the normalized string to the token, change source
maps, trim the full document, alter collection offsets, or introduce a new API.
The added trimming takes linear time in the candidate paragraph size; the include
grammar is unchanged.

Surrounding whitespace accepted by native 13 remains accepted, including NBSP,
FEFF, em space, narrow NBSP, ideographic space and whitespace-only lines. The native
block parser still owns indented code and fences: a leading tab or four spaces
does not become an include candidate. Zero-width space, surrounding prose and
additional non-whitespace lines remain literal. Internal marker syntax is unchanged.

Failure-first checks cover public Transform with the built-in includes callback,
the CLI include detector, all three real CLI build routes, source token identity
and maps, nested relative paths, and protected/non-marker input. The frozen old
and new graphs and the four corpus failures remain negative controls. This repair
does not accept unrelated parser/highlighter differences found during corpus review.

A separate consumer adaptation must preserve native paragraph-edge semantics
across the three CLI routes through the existing included fallback. Dependency
locations, source lines, collector offsets and source-map ownership must remain
unchanged. Exact runtime comparisons are required for standalone paragraphs and
nested containers; pre-existing route differences must be reported separately.

This Transform change proves include recognition compatibility, not global CLI
route parity. The consumer adaptation has its own implementation and acceptance
boundary.
