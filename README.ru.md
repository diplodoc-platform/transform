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

## License

MIT
