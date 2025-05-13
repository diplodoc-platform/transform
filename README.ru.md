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

### Пользовательский HTML-санитайзер

Вы можете заменить стандартный HTML-санитайзер своей собственной реализацией, передав функцию `sanitize` в опциях:

```javascript
const customSanitizer = (html, options) => {
  // Ваша логика санитизации
  return sanitizedHtml;
};

const {result} = transform(content, {
  sanitize: customSanitizer,
  // Другие опции...
});
```

Это полезно, когда вам нужно реализовать специфические правила санитизации или интегрироваться с другой библиотекой санитизации. Функция санитайзера должна принимать HTML-строку в качестве входных данных и возвращать санитизированный HTML.

## License

MIT

## Публичные CSS-переменные

**common**

- `--yfm-color-text`
- `--yfm-color-link`
- `--yfm-color-base`
- `--yfm-color-link-hover`
- `--yfm-color-table`
- `--yfm-color-table-row-background`
- `--yfm-color-border`
- `--yfm-color-accent`
- `--yfm-tab-size`
- `--yfm-text-block-margin-block`
- `--yfm-text-block-margin-inline`

**code**

- `--yfm-color-inline-code`
- `--yfm-color-inline-code-background`
- `--yfm-color-code-background`
- `--yfm-tab-size-code`

**hightlight**

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

**note**

- `--yfm-color-note-tip`
- `--yfm-color-note-tip-background`
- `--yfm-color-note-warning`
- `--yfm-color-note-warning-background`
- `--yfm-color-note-important-background`
- `--yfm-color-note-info`
- `--yfm-color-note-info-background`

**term**

- `--yfm-color-term-title`
- `--yfm-color-term-title-hover`
- `--yfm-color-term-dfn-background`
- `--yfm-color-term-dfn-shadow`
- `--yfm-color-term-dfn-pseudo-shadow`

**modal**

- `--yfm-color-modal-content`
- `--yfm-color-modal-actions-hover`
- `--yfm-color-modal-wide-content`
- `--yfm-color-modal-wide-content-overlay`

**file**

- `--yfm-file-icon`
- `--yfm-file-icon-color`

**list**

- `--yfm-list-item-margin-block`
- `--yfm-list-text-margin-block`
- `--yfm-list-text-only-margin-block`
- `--yfm-list-text-last-margin-block`

## Контрибуции

### Тесты

В пакете представлены unit-тесты на базе Jest и визуальные e2e-тесты на базе Playwright. Playwright-тесты
расположены в подпакете `e2e`.

#### Playwright: prerequisites

Для того, чтобы обеспечить минимальное количество внешних факторов, которые могут повлиять на выполнение e2e-тестов, рекомендуется запускать локально Playwright-тесты в Docker-контейнере с помощью скрипта пакета `test:playwright`.
Этот скрипт настроит необходимое окружение в Docker и установит все зависимости для него.

```sh
$ npm run test:playwright
```

Подразумевается, что у вас установлен Docker CLI и Docker Engine.

Для того, чтобы использовать UI-режим Playwright, используйте скрипт `playwright:docker:ui` (в подпакете e2e):

```sh
$ cd e2e
$ npm run playwright:docker:ui
```

##### Пользователям macOS: не хотите/не имеете возможность использовать Docker Desktop?

Благодаря относительно недавним изменениям лицензии, использование Docker Desktop в коммерческих условиях
больше не является бесплатным. Используйте [Lima](https://github.com/lima-vm/lima) или одну из обёрток, таких как [Colima](https://github.com/abiosoft/colima) или [Rancher Desktop](https://rancherdesktop.io/).

Если при настройке вы выбрали имя инстанса не `docker`, можете передать нужное с помощью переменной `LIMA_INSTANCE` при обращении к скрипту `playwright:docker`/`test:playwright`:

```sh
$ LIMA_INSTANCE=instancename npm run test:playwright
```

Эта информация необходима скрипту, чтобы корректно настроить переменную окружения `DOCKER_HOST`.
