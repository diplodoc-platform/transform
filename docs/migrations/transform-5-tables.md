# Transform 5 tables

## Header rows

With `|:{header-rows="2"}`, the first two rows are header rows.
Transform groups them in `<thead>`, and `sticky-header` pins them together.
Tables without a declared header keep their existing structure.

If a vertical merge (`^`) spans the header/body boundary, all rows remain
in one `<tbody>` so the cell can span both rows. Header rows keep their
`data-header` attribute in either layout. Use `tr[data-header]` to find them
and `table.rows` when you need all rows of a particular table.

Markdown-it consumers, including editors, still receive one pair of
`yfm_tbody_open` and `yfm_tbody_close` tokens around all rows. If you
provide your own renderer for either of those tokens, for `yfm_tr_open`,
or override the renderer instance’s `renderToken` method, your renderer
controls the sections and retains the previous single-body layout by default.

## Pipes inside inline code

YFM tables now ignore cell separators inside recognized inline code by default:

```markdown
#|
|| `before|after` | next cell ||
|#
```

This produces two cells, with `before|after` kept together as code. To retain
Transform 4's omitted-option behavior, pass an explicit false:

```typescript
transform(markdown, {table_ignoreSplittersInInlineCode: false});
```

The strict configuration form is:

```typescript
defineTransformOptions({
  plugins: {options: {table: {table_ignoreSplittersInInlineCode: false}}},
});
```

The other three table splitter defaults are unchanged. Inline-code and block-code
options can overlap: when block-code protection is explicitly disabled, the new
inline-code default may still recognize matching backticks across lines. Set both
options false when you need the previous unprotected-code behavior.

A matching pair of backticks can span several lines. Inside that span, pipes and
row delimiters are literal code. A backtick with no matching closer stays
literal. Complex mixed backtick runs retain their existing interpretation.

### If the next row disappears

Check the preceding cell for a stray backtick. In this example, the apostrophe
in `CDN's` was typed as a backtick. It pairs with the opening backtick of the
command on the next row, so the separator between the two becomes code.

```markdown
#|
|| Option | On the CDN`s end. ||
|| Example | Run `--subnets=id1'. ||
|| Pattern | Use `x|y`. ||
|#
```

Use an apostrophe in prose and matching backticks around the command. If the
prose should display a literal backtick, escape it as `` \` ``.

```markdown
#|
|| Option | On the CDN's end. ||
|| Example | Run `--subnets=id1`. ||
|| Pattern | Use `x|y`. ||
|#
```

With the Transform 5 defaults, the corrected table has three rows and two cells
per row. Use
`table_ignoreSplittersInInlineCode: false` only when you need the old default for
the whole table parser. It also splits the pipe in the valid `x|y` example.

## Cell alignment

Replace final `.cell-align-*` content attributes with cell attributes immediately
after the cell marker:

```markdown
#|
||::{align="center"} Centered text |::{align="top-left"} Other text ||
|#
```

Supported values are `top-left`, `top-center`, `top-right`, `center`, `bottom-left`,
and `bottom-right`. The modern form works when general Markdown attributes are
disabled. It retains the corresponding `cell-align-*` CSS class and adds
`data-align`. Existing custom styles can keep using that class.

The legacy suffix remains supported. Actual use emits scoped
`TABLE_CELL_ALIGN_CLASS` diagnostics through the existing logger, including a
source location and replacement. Both compatibility modes retain the syntax and
warning. Transform 6 is the earliest removal target, subject to the published
warning and consumer-migration requirements in ADR-009; no removal is performed
in Transform 5.

## Source migration helper

```typescript
import {migrateTableAlignment} from '@diplodoc/transform/migrations/table-alignment';

const result = migrateTableAlignment(markdown, {path: 'guide.md'});
// result.output is a string. The caller decides whether to save it.
// result.edits use original UTF-16 offsets; result.diagnostics require review.
```

The synchronous helper rewrites only unambiguous final shorthand attributes such
as `Text {.cell-align-center}` in simple, single-line, top-level YFM table cells.
It preserves source line endings and content outside its edits. Applying it twice
does not produce further edits. The original `table` splitter options can be
supplied when the document uses explicit compatibility settings.

Mixed classes or other attributes, existing modern cell attributes, unknown
alignment values, multiline/empty/structural cells, nested tables, and row/column
spans are left unchanged with diagnostics when a candidate can be identified.
Code examples, frontmatter, and raw HTML blocks are protected. The helper checks
the resulting table structure before returning edits; text, classes, spans, and
other rendered attributes must remain equivalent. The only permitted additions
are modern alignment metadata. Review diagnostics manually rather than removing
custom classes to make the input fit the automatic subset.

The helper does not evaluate Liquid, render includes, load referenced files, run
consumer plugins or highlighters, log warnings, or write files. Its `path` option
is only a diagnostic label. It provides no promise that arbitrary application
plugins treat new source syntax identically; validate real generated HTML,
Markdown, lint and merge-includes output in your application before adoption.
