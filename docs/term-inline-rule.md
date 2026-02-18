# ADR-001: Inline rule for term plugin to fix asterisk handling

**Status**: Accepted  
**Date**: 2026-02-18

## Context

The term plugin uses syntax `[text](*termId)` to create interactive term references. When `text` contains an asterisk (`*`), for example `[=*](*eqtimes)`, markdown-it's emphasis parser pairs the `*` characters from different term patterns, producing broken HTML output with unintended `<em>` tags.

### Previous approach (before this change)

The original code overrode `md.validateLink` to return `false` for `*`-prefixed URLs, preventing `[text](*termId)` from being parsed as a link. A core rule (`termReplace`) then matched the raw `[text](*termId)` pattern in text tokens via regex and replaced it with `term_open`/`term_close` tokens.

**Problem**: Since `validateLink` rejected the URL, markdown-it left `[text](*termId)` as raw text. The `*` characters in that raw text were exposed to emphasis parsing. When multiple term patterns appeared in the same paragraph, their `*` characters paired up and produced `<em>` tags, corrupting the output.

### Alternative considered: remove validateLink override

Removing the `validateLink` override lets markdown-it create normal `link_open`/`link_close` tokens for `[text](*termId)`. A core rule could then convert those links to term tokens.

**Rejected because**: The `links` plugin runs as a core rule and transforms `href` attributes of local-looking URLs. Since `isLocalUrl('*termId')` returns `true`, the links plugin modifies the href (e.g. `*termId` → `../../*termId`) before the term plugin can check `href.startsWith('*')`. This caused e2e test failures — terms were not rendered as `<i class="yfm-term_title">`.

## Decision

Add a **custom inline rule** (`term_inline`) that matches `[text](*termId)` during inline parsing, **before** both the emphasis and link rules run.

### Architecture

1. **`matchTermPattern(src, start, max)`** — pure scanning function that detects the `[text](*termId)` character sequence and returns label boundaries and term id.

2. **`termInlineRule(state, silent)`** — inline rule registered via `md.inline.ruler.before('link', ...)`. For defined terms, it consumes the entire pattern and emits `term_open`/`text`/`term_close` tokens directly. Markdown escape sequences in the label are unescaped (`.replace(/\\(.)/g, '$1')`), consistent with how `termDefinitions` processes labels.

3. **`md.validateLink` override** — retained for backward compatibility. Blocks `*`-prefixed URLs from becoming links, protecting against undefined terms leaking as broken `<a>` tags.

4. **`termReplace` core rule** — retained as fallback. Handles lint checks (`__yfm_lint` / `YFM007` for undefined terms) and any edge cases where text-based matching is still needed.

### Why inline rule works

- Runs during inline tokenization, **before** emphasis and link rules see the characters.
- Consumes `[`, `text`, `]`, `(`, `*termId`, `)` entirely — the `*` characters never enter the emphasis delimiter stack.
- Creates term tokens at parse time — they are already in the token stream before any core rule (links, includes, etc.) executes, eliminating plugin ordering issues.

## Consequences

### Positive

- `[=*](*eqtimes)` renders correctly — asterisks in term text are no longer mangled by emphasis.
- Full backward compatibility with existing term syntax.
- No dependency on core rule execution order — immune to interactions with the `links` plugin.
- Markdown escape sequences (`\*`) in labels are properly unescaped, making output stable regardless of whether Prettier reformats `.md` files.

### Negative

- Label content is treated as plain text (no inline markdown formatting inside `[text]`). This matches the original regex-based behavior.

## Files changed

| File                                   | Change                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/transform/plugins/term/index.ts`  | Added `setTermAttrs`, `matchTermPattern`, `termInlineRule`; registered inline rule; kept `validateLink` override and `termReplace` fallback |
| `test/term.test.ts`                    | Added tests: asterisk-in-text, regular links coexistence, undefined terms, lint mode; improved `clearRandomId` helper                       |
| `test/mocks/term/asterisk-in-text.md`  | New mock for the asterisk-in-text scenario                                                                                                  |
| `test/mocks/term/with-regular-link.md` | New mock for regular link + term coexistence                                                                                                |
| `test/mocks/term/undefined-term.md`    | New mock for undefined term handling                                                                                                        |
| `test/__snapshots__/term.test.ts.snap` | Updated snapshots for new tests                                                                                                             |
