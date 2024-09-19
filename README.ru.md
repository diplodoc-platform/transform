**русский** | [english](https://github.com/yandex-cloud/yfm-transform/blob/master/README.md)

---

[![NPM version](https://img.shields.io/npm/v/@diplodoc/transform.svg?style=flat)](https://www.npmjs.org/package/@diplodoc/transform)

[@diplodoc/transform](https://www.npmjs.com/package/@diplodoc/transform) — пакет для трансформации Yandex Flavored Markdown в HTML.

Используйте его в своем коде для работы с текстом во время выполнения программы. Например, чтобы отображать пользовательский контент.

## Установка {#install}

1. Установите пакет:

   ```shell
   npm i @diplodoc/transform
   ```

1. Подключите пакет в своем коде, используя функцию `require()` или `import()`:

   ```javascript
   const transform = require('@diplodoc/transform');
   ```

1. Для корректного отображения подключите в проект CSS-стили и клиентские скрипты:

   ```css
   @import '~@diplodoc/transform/dist/css/yfm.css';
   ```

   ```javascript
   import '@diplodoc/transform/dist/js/yfm';
   ```

## Использование {#use}

Пакет предоставляет функцию `transform()`:

- входные данные — строка с YFM и [настройки](settings.md);
- возвращаемое значение — объект с полями `result` и `logs`.

### Поле result

`result` — объект результата, содержит поля:

- `html` — строка с HTML.
- `meta` — [метаданные](../../syntax/meta.md#meta) из переданного контента.
- `title` — заголовок документа. Возвращается, если заданы настройки `extractTitle = true` или `needTitle = true`.
- `headings` — список заголовков документа.

### Поле logs

`logs` — информация о процессе трансформации, включает массивы:

- `error` — ошибки.
- `warn` — предупреждения.
- `info` — дополнительная информация.

### Пример вызова функции

```javascript
const fs = require('fs');
const transform = require('@diplodoc/transform');

const content = fs.readFileSync(filePath, 'utf');
const vars = {user: {name: 'Alice'}};

const {
  result: {html, meta, title, headings},
  logs,
} = transform(content, {vars});
```

### CSS-API

    // common
    --yfm-color-base
    --yfm-color-text
    --yfm-color-link
    --yfm-color-link-hover
    --yfm-color-table
    --yfm-color-table-row-background
    --yfm-color-border
    --yfm-color-accent

    // code
    --yfm-color-inline-code
    --yfm-color-inline-code-background
    --yfm-color-code-background

    // hightlight
    --yfm-color-hljs-background
    --yfm-color-hljs-subst
    --yfm-color-hljs-comment
    --yfm-color-hljs-deletion
    --yfm-color-hljs-section
    --yfm-color-hljs-pseudo
    --yfm-color-hljs-literal
    --yfm-color-hljs-addition
    --yfm-color-hljs-meta
    --yfm-color-hljs-meta-string

    // note
    --yfm-color-note-tip
    --yfm-color-note-tip-background
    --yfm-color-note-warning
    --yfm-color-note-warning-background
    --yfm-color-note-important-background
    --yfm-color-note-info-background

    // term
    --yfm-color-term-title
    --yfm-color-term-title-hover
    --yfm-color-term-dfn-background
    --yfm-color-term-dfn-shadow
    --yfm-color-term-dfn-pseudo-shadow

    // modal
    --yfm-color-modal-content
    --yfm-color-modal-actions-hover
    --yfm-color-modal-wide-content
    --yfm-color-modal-wide-content-overlay

## License

MIT
