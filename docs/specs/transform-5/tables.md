# Table splitters and alignment migration

Status: approved by the coordinator for implementation. The scanner algorithm remains unchanged.

Task: [DOCSTOOLS-6945](https://st.yandex-team.ru/DOCSTOOLS-6945).
Base: `87d076745e905bdaaa1cc774668ef30520197d38`.
Branch: `codex/docstools-6945-tables`.

## Scope and existing behavior

The YFM table plugin recognizes `#|`, `||`, `|`, and `|#`, including nested
tables, multiline cells, and row/column spans. Its four splitter flags remain
available through both legacy options and `plugins.options.table`.

Currently, `table_ignoreSplittersInInlineCode` defaults to false. The new default
is true, with an explicit false retaining legacy splitter interpretation. The
other three splitter defaults do not change. The existing scanner behavior is
preserved; its line-limit parameter alone is not evidence that multiline code
spans should become invalid.

Legacy final cell-content attributes such as `Text {.cell-align-center}` are
still supported and add the class to the cell. The plugin already emits an
unstructured warning. Modern cell attributes immediately follow the cell marker:
`||::{align="center"} Text ||`. They set `data-align` and emit the same
`cell-align-center` CSS class. This table-specific attribute syntax works
independently of the general Markdown attributes plugin.

The existing suffix extractor has broader and sometimes surprising behavior for
multiple classes and other attributes. This work does not repair or generalize
that extractor. It preserves existing rendered classes and legacy syntax support.
It does not remove CSS selectors, alignment values, or any public plugin path.

The six supported alignment values are `top-left`, `top-center`, `top-right`,
`center`, `bottom-left`, and `bottom-right`. No additional values or CSS layout
changes are introduced.

## Splitter default and existing multiline behavior

Omitted `table_ignoreSplittersInInlineCode` means true in Transform 5, including
direct table-plugin calls. An explicit false continues to interpret unescaped
pipes inside inline code as table delimiters. This is an intentional major-version
default change and must be documented rather than hidden in updated snapshots.

Do not restrict code spans to a physical line. Native MarkdownIt accepts multiline
backtick spans within a cell, and baseline explicit-true table parsing already
preserves valid examples. Apparent cell/row/table delimiters inside a matched
code span may be literal code. There is no demonstrated context-free delimiter
boundary that can be imposed here without changing this behavior.

Source-derived baseline probes at the base revision, repeated with native
MarkdownIt 15.0.3, establish:

| Cell source or case                                                | Baseline explicit-true result                    | Native inline result               |
| ------------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------- |
| Single-backtick multiline span in the example below                | One cell; code text is `before after\|inside`    | Same code span                     |
| The same example with matching double-backtick delimiters          | One cell; same normalized code text              | Same code span                     |
| Escaped opening backtick before `before\|after`                    | Pipe splits the cells                            | Opening backtick is literal        |
| An opening backtick in one apparent row and its closer in the next | Apparent row delimiters can become code contents | Same multiline span interpretation |

```markdown
#|
|| code `before
after|inside` tail ||
|#
```

For example, the following is one row with two cells in the baseline explicit-true
mode. The first cell contains `<code>unclosed | b || || c </code>` followed by
`later`; the second contains `d`:

```markdown
#|
|| a `unclosed | b ||
|| c `later | d ||
|#
```

This is ambiguous author intent, not sufficient evidence of an incorrectly
crossed row boundary. Conversely, the baseline does have scanner quirks: a
multiline double-backtick span containing an intervening single-backtick run can
split an internal pipe even when native inline parsing recognizes the span. A
closer outside an apparent table can prevent that table from being recognized.
This task neither repairs nor declares those quirks a new grammar contract.
Any correction needs a separate bounded design and consumer/output acceptance.

Implementation therefore changes only the omitted flag's effective default;
explicit true and false behavior remain the baseline behavior. Fixtures prove
valid single/multiple-backtick multiline cases, escaped openers/pipes, and the
documented ambiguous cases by comparing omitted mode to baseline explicit true.
Do not change block-code or math scanners. Ordinary Markdown pipe tables are
outside this change.

## Scoped legacy-alignment warning

Replace the existing unstructured warning with the shared reporter descriptor:

- Code: `TABLE_CELL_ALIGN_CLASS`.
- Feature: legacy `.cell-align-*` attributes at the end of table-cell content.
- Replacement: the equivalent `::{align="..."}` cell attribute and the migration
  guide/API described below.
- Earliest removal target: Transform 6, subject to ADR-009's published-warning
  and compatibility gates. This proposal authorizes no removal or release.

Emit only when the existing extractor actually recognizes a legacy alignment
class. Preserve its current treatment of unknown `cell-align-` suffixes; a warning
does not make an unknown value eligible for automatic migration. Ordinary classes,
modern alignment attributes, and code examples that are not consumed by that
extractor do not gain warnings.

Use the parser's reporter when supplied. Direct table-plugin consumers get a
reporter scoped to that plugin instance, forwarding through their existing logger.
Deduplicate per cell occurrence, not globally or once for the whole document.
Use the source cell's line and column with the supplied path, or `<input>` for a
pathless invocation. Distinct cells remain distinct occurrences. The same document
parsed in a fresh scope warns again. Reset behavior remains owned by the document
context workstream; this plugin introduces no global registry.

`current` and `legacy` compatibility modes both retain the legacy syntax and its
warning. They do not change splitter flags or unrelated behavior. The explicit
false splitter option is the compatibility mechanism for the default change.

## Public migration API

Add one finite stable entry, `@diplodoc/transform/migrations/table-alignment`,
backed by the ordinary single implementation graph. It exports a synchronous,
pure source-to-source function and its small data types:

```typescript
export interface TableAlignmentMigrationOptions {
  readonly path?: string;
  readonly table?: Readonly<YfmTablePluginOptions>;
}

export interface TableAlignmentEdit {
  /** Zero-based UTF-16 offsets into the original source; end is exclusive. */
  readonly start: number;
  readonly end: number;
  readonly replacement: string;
}

export type TableAlignmentMigrationReason =
  | 'mixed-attributes'
  | 'existing-cell-attributes'
  | 'conflicting-alignment'
  | 'unknown-alignment'
  | 'multiline-cell'
  | 'nested-or-spanning-table'
  | 'ambiguous-content'
  | 'unclosed-table'
  | 'equivalence-check-failed';

export interface TableAlignmentMigrationDiagnostic {
  readonly code: 'TABLE_ALIGNMENT_NOT_MIGRATED';
  readonly reason: TableAlignmentMigrationReason;
  readonly message: string;
  readonly offset: number;
  /** One-based source coordinates, in the original input. */
  readonly line: number;
  readonly column: number;
  readonly path?: string;
}

export interface TableAlignmentMigrationResult {
  readonly output: string;
  readonly edits: readonly TableAlignmentEdit[];
  readonly diagnostics: readonly TableAlignmentMigrationDiagnostic[];
}

export function migrateTableAlignment(
  source: string,
  options?: TableAlignmentMigrationOptions,
): TableAlignmentMigrationResult;
```

`YfmTablePluginOptions` is re-exported as a type by this entry so callers do not
need an internal import. `table` controls only the existing four splitter flags;
it uses the same defaults as the plugin. The migrator does not translate the old
inline-code splitter default or rewrite escapes to conceal that separate change.

There are no logging callbacks, filesystem paths to open, parser/plugin callbacks,
or automatic writes in this API. `path` is a diagnostic label only. The function
does not call Transform, Liquid, preprocessors, includes, a highlighter, or any
filesystem helper. It neither evaluates templates nor reads referenced files.
Diagnostics are returned as data for a CLI/editor to present. It adds no CLI
command or generic migration framework in this workstream.

Return edits sorted by ascending original offset and with no overlaps. Applying
them from the end of the original input reproduces `output`. Preserve original LF
and CRLF bytes, indentation, text outside edits, and unrelated attributes. No
document serialization or global newline normalization is allowed. A second call
on successful output returns that output with no further edits. Skipped cases may
continue to return the same diagnostic until the source is changed manually.

## Parser-aware migration and ambiguity policy

Use a private MarkdownIt parser with the actual YFM table scanner/plugin and
standard Markdown block/inline rules. No consumer plugins or external resources
are installed. Share table-position extraction internally with the existing
plugin rather than maintaining another implementation of table delimiters. Keep
the shared position records and capture mechanism private; do not add a callback
or migration controls to the public table-plugin options.

Shield a document-opening YAML frontmatter block (including a BOM and a closing
`---` or `...`) without parsing YAML. Unclosed opening frontmatter shields the
rest of the document. Standard fenced/indented code and raw HTML blocks are opaque
to migration. Recognized code examples are left unchanged without diagnostics.
Only top-level, closed YFM tables are candidates. Tables inside list/blockquote
containers are left unchanged; their source indentation and effective parser
state are not assumed equivalent to a standalone table.

Preserve a mapping between MarkdownIt's normalized source offsets and original
UTF-16 offsets, including CRLF pairs. Do not use a whole-document alignment regex.
Within an actual cell span, a small anchored lexical match may identify a final
attribute group, followed by parser validation and the checks below.

The initial automatic subset is deliberately finite:

1. The table has no nested table or row/column-span cells. A suffix whose removal
   would expose a bare `>` or `^` span marker is also unsafe.
2. The candidate occupies a single physical source line and has a nonempty,
   ordinary paragraph content block. Empty/attribute-only cells, headings, raw
   HTML, links/images with ambiguous trailing attributes, block constructs,
   template/directive delimiters, or unmatched backtick/attribute delimiters are
   skipped when their exact interpretation cannot be established.
3. Its final standalone content-attribute group contains exactly one unescaped
   shorthand class, `.cell-align-<supported value>`, and no other key or class.
   The group is outside code/HTML and is precisely the group consumed by the
   existing extractor. Quoted `class=`, duplicate alignment classes, mixed custom
   classes, nested attribute delimiters and unknown values require manual review.
4. The cell has no existing `::{...}` prefix. Conflicting modern alignment is
   diagnosed explicitly; identical alignment or other prefix attributes are also
   left unchanged with an existing-attributes diagnostic. Do not invent a merge
   or precedence policy for mixed old/new attributes.

For a safe cell, insert `::{align="value"}` immediately after its cell marker and
remove exactly the consumed final legacy attribute suffix, including its
syntactic separating horizontal whitespace. Preserve the rest of the cell text,
including code contents, escapes and trailing source whitespace. For example:

```markdown
#|
|| A {.cell-align-center} | `x|y` {.cell-align-bottom-right} ||
|#
```

becomes:

```markdown
#|
||::{align="center"} A |::{align="bottom-right"} `x|y` ||
|#
```

Before emitting a table's proposed edits, verify its before/after canonical token
structure using that same isolated parser and the same splitter settings. Cell
text, inline children, tags, class tokens, spans, and all other rendered
attributes must agree. The only allowed additions are the modern alignment
metadata (`data-align`, `meta.align`, and its raw attribute representation).
Source maps naturally move and are not rendered semantics. If this check fails,
discard that table's proposed edits and return diagnostics. It is an additional
guard on the finite subset, not permission to rewrite arbitrary Markdown.
Check the original unmasked token stream for nested tables as well: a standard
Markdown code mask must not hide an indented nested YFM table inside a real cell.
Unfinished first-row cells have diagnostic-only source spans; they do not become
rendered rows merely to find a detectable final legacy suffix in an unclosed table.
Final LF/CRLF whitespace does not hide such a suffix. Identify suffixes in the
original cell text and confirm they are outside protected source: masking a later
code example must not make an earlier, nonfinal attribute group look eligible.

An unsafe candidate cell stays byte-for-byte unchanged and gets a diagnostic at
its original location; safe independent cells may still migrate. Nested/span
ambiguity or failed table equivalence suppresses edits for the whole affected
table. An unclosed table with a detectable legacy candidate is unchanged with an
unclosed-table diagnostic. Do not scan protected code/frontmatter/HTML for fake
legacy candidates merely to issue diagnostics.

## Implementation boundary and acceptance

Implementation owns the table inline-code splitter default, a narrowly
shared private position helper, scoped suffix diagnostics, the migration module,
one public entry, tests, and migration documentation. Preserve existing extractor
semantics, other table attributes/defaults, span behavior, sanitizer behavior,
CSS, and legacy imports. Do not change dependency versions or lockfiles.
Coordinate the public-entry generator change with the document-context owner.

Required source and installed-package checks:

- Existing table suite and unchanged legacy alignment/span/header/background
  assertions; new default/false, multiline and ambiguous-boundary preservation
  fixtures. No inline scanner algorithm change is included.
- Scoped warning identity, independent cells/documents, pathless/direct plugin
  calls, injected logger/collected logs, and no warning for modern syntax.
- Every valid alignment, inline code with multiple backtick runs and pipes,
  escapes, CRLF/BOM, idempotence, and exact edit reconstruction. Preserve empty
  cells and title/content elsewhere even when their own migration is skipped.
- Mixed classes/attributes, conflicting or duplicate modern/legacy alignment,
  unknown values, multiline cells, code examples, frontmatter, HTML, malformed
  tables, nested tables, `>`/`^` cells and newly exposed span markers stay unchanged
  with appropriate diagnostics where an actual candidate is identifiable.
- Before/after HTML equivalence for successful migrations with general Markdown
  attrs enabled and disabled. Only new modern alignment metadata may differ;
  CSS classes, text, other attributes and table structure must remain equivalent.
- Native ESM/CJS imports and strict declaration fixtures from the actual tarball;
  the migrator must not load filesystem helpers, Liquid or optional highlighters.
- Full tests, typecheck, lint, build, normal hooks and applicable package checks.

Real CLI acceptance remains a merge gate: HTML, Markdown output and Markdown to
Markdown to HTML, lint, include fragments and merge-includes with inline-code
pipes/alignment. Exercise explicit false as well as the new default. Verify the
actual generated Markdown, not only Transform mocks. Record source/tarball and
consumer revisions. Relevant Viewer table/include rendering must also be checked.
Consumer owners use their separate worktrees; this proposal authorizes no edits
there. Coordinator approval precedes implementation, and current-head CI and
independent review precede merging the child into the major integration branch.
