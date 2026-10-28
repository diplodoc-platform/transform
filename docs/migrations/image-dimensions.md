# Image dimensions in Transform 5

Legacy dimensions continue to render and imsize remains in the standard plugin
composition. Actual uses now warn with `IMAGE_SIZE_LEGACY_SYNTAX`:

```markdown
![Alt](image.png "Title" =300x200)
```

Use immediately adjacent dimension attributes instead:

```markdown
![Alt](image.png 'Title'){width=300 height=200}
![Width only](image.png){width=50%}
![Height only](image.png){height=200}
```

These dimensions work with `enableMarkdownAttrs: false` and with the standalone
imsize plugin. This does not enable arbitrary attributes. Inline styling, image
sanitization, alt/title handling and modern attributes' precedence are unchanged.

Warnings occur once per actual source path in a document diagnostic scope. Without
a nonblank path they identify the `imsize legacy image dimensions` option; no
approximate line number is printed. Native standalone parser calls create a fresh
warning scope per parse. An explicitly supplied reporter retains caller-owned
reset semantics. A replayed cached document fragment does not parse or warn again.
Both `current` and `legacy` policies preserve rendering and warn:

```typescript
transform(source, {
  compatibility: {IMAGE_SIZE_LEGACY_SYNTAX: 'legacy'},
});
```

Removal is no earlier than Transform 6 and requires a separately agreed release,
published warnings and migration gates. It is not announced for that release;
this work does not claim a warning was previously published in Transform 4.

## Pure source migration

```typescript
import {migrateImageDimensions} from '@diplodoc/transform/migrations/image-dimensions';

const {output, edits, diagnostics} = migrateImageDimensions(source, {path: 'guide.md'});
```

The CJS entry exposes the same named function. It is synchronous and does not run
Transform, Liquid, includes, filesystem access, custom plugins or ID generators.
`path` is only a diagnostic label. It does not change global collected logs.

Each edit uses original, zero-based UTF-16 `start`/exclusive `end` offsets and a
replacement string. Applying the sorted edits in reverse order reproduces output.
Unchanged ranges retain their original text, including CRLF, escapes, URLs, title
quotes and astral characters. Diagnostics have a finite reason, original offset,
one-based line/column and optional path. For nested images or ambiguous source
mapping, the diagnostic anchors the original container's first line, or document
start if the parser supplies no block map. Those anchors are not an exact image or
`=` location. Other recognized, uniquely mapped candidates use the original size
suffix position. Inspect diagnostics before writing output.

The first version handles canonical numeric and percentage dimensions, either
partial dimension, zero and leading zeroes. It preserves values exactly. `=x`
becomes an ordinary image without empty braces. A second migration makes no edits.

Existing adjacent brace groups, unusual accepted percent strings, nested images
and ambiguous source ranges remain unchanged with diagnostics. Unsupported units
and decimals are not repaired. Detection of rejected syntax is conservative and
limited to failed image recognition; it is not a linter for every size-like string.
References already using dimension attributes are unchanged; size suffixes in
reference definitions are unsupported and not migrated. Code, HTML blocks/comments
and frontmatter are protected. Multiline container prefixes can prevent a unique
source mapping; those candidates are reported rather than guessed.

Each candidate and the combined result must preserve tokens, rendered HTML and
CSS allowances with general attrs both disabled/enabled and inline styling both
disabled/enabled. This checks the built-in image grammar; custom parser syntax and
preprocessor-generated images are outside the migration's capability. Run it on
the source corpus and validate the resulting documents in their actual consumer.
