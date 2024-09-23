# YFM File plugin

```md
{% file src="path/to/file" name='readme.md' %}

==>

<a href="path/to/file" download="readme.md" class="yfm-file"><span class="yfm-file__icon"></span>readme.md</a>
```

## Attributes

| Name             | Required | Description                                                                                                                                       |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src`            | yes      | URL of the file. Will be mapped to [`href` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-href)                      |
| `name`           | yes      | Name of the file. Will be mapped to [`download` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-download)             |
| `lang`           | -        | Language of the file content. Will be mapped to [`hreflang` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-hreflang) |
| `referrerpolicy` | -        | [`referrerpolicy` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-referrerpolicy)                                     |
| `rel`            | -        | [`rel` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-rel)                                                           |
| `target`         | -        | [`target` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-target)                                                     |
| `type`           | -        | [`type` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#attr-type)                                                         |

> _Note: other attributes will be ignored_

## Plugin options

| Name             | Type                 | Description                                      |
| ---------------- | -------------------- | ------------------------------------------------ |
| `fileExtraAttrs` | `[string, string][]` | Adds additional attributes to rendered hyperlink |

## CSS public variables

- `--yfm-file-icon` – sets custom file icon image
- `--yfm-file-icon-color` – sets custom file icon color

  _common_

- `--yfm-color-text`
- `--yfm-color-link`
- `--yfm-color-base`
- `--yfm-color-link-hover`
- `--yfm-color-table`
- `--yfm-color-table-row-background`
- `--yfm-color-border`
- `--yfm-color-accent`

  _code_

- `--yfm-color-inline-code`
- `--yfm-color-inline-code-background`
- `--yfm-color-code-background`

  _hightlight_

- `--yfm-color-hljs-background`
- `--yfm-color-hljs-subst`
- `--yfm-color-hljs-comment`
- `--yfm-color-hljs-deletion`
- `--yfm-color-hljs-section`
- `--yfm-color-hljs-pseudo`
- `--yfm-color-hljs-literal`
- `--yfm-color-hljs-addition`
- `--yfm-color-hljs-meta`
- `--yfm-color-hljs-meta-string`

  _note_

- `--yfm-color-note-tip`
- `--yfm-color-note-tip-background`
- `--yfm-color-note-warning`
- `--yfm-color-note-warning-background`
- `--yfm-color-note-important-background`
- `--yfm-color-note-info-background`

  _term_

- `--yfm-color-term-title`
- `--yfm-color-term-title-hover`
- `--yfm-color-term-dfn-background`
- `--yfm-color-term-dfn-shadow`
- `--yfm-color-term-dfn-pseudo-shadow`

  _modal_

- `--yfm-color-modal-content`
- `--yfm-color-modal-actions-hover`
- `--yfm-color-modal-wide-content`
- `--yfm-color-modal-wide-content-overlay`
