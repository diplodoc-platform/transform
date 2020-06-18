Простой трансформер текста на YFM (Yandex Flavored Markdown) в HTML.

## Yandex Flavored Markdown

Yandex Flavored Markdown (YFM) является диалектом Markdown, который используется сейчас для
[документации Яндекс.Облака](https://cloud.yandex.ru/docs), [контента сайта Я.Облака](https://cloud.yandex.ru) и в
различных внутренних проектах Яндекса.

Синтаксис базируется на CommonMark Spec, расширяя его дополнительными возможностями. В том числе, для создания
полноценного сложного документационного проекта, такого как документация Яндекс.Облака.

Для сборки своего документационного проекта на YFM вы можете использовать пакет [@doc-tools/docs](https://www.npmjs.com/package/@doc-tools/docs).

[Более подробное описание синтаксиса YFM](./DOCS.md)

## Использование

### Параметры

Имя | Описание | Тип | Значение по-умолчанию
:--- | :--- | :--- | :---
vars | Переменные | Object | {}
plugins | Используемые плагины | function[] | alerts, attrs, anchors, code, cut, deflist, imsize, meta, sup, tabs, titles
highlightLangs | Дополнительные языки для подсветки |  {'lang': function} | {}
extractTitle | Вернуть первый заголовок первого уровня в качестве заголовка всего документа | bool | false
needTitle | Вернуть первый заголовок первого уровня не удалив его из контента | bool | false
allowHTML | Разрешено ли использование HTML | bool | false
linkify | Делать ли ссылками ссылкоподобные строки | bool | false
breaks | Переносить ли строки по символу перевода каретки | bool | true
conditionsInCode | Выполнять ли условия в блоках кода | bool | false

### Подключение и вызов

Трансформер возвращает результат преобразования и лог, разделенный по типу сообщения: ошибки, предупреждения и информационные.
Вы можете обработать сообщения об ошибках и предупреждениях исходя из необходимого вам уровня строгости.

```js
const fs = require('fs');
const transform = require('@yfm/transform');

const content = fs.readFileSync(filePath, 'utf');
const vars = { user: { name: 'Alice' } };

const {result: {html, meta}, logs} = transform(content, {vars});
```

### Плагины

Вы можете использовать произвольный набор плагинов, как предоставленные этим пакетом, так и любые [markdown-it плагины](https://www.npmjs.com/search?q=keywords:markdown-it-plugin)

```js
const fs = require('fs');
const transform = require('@yfm/transform');
const {plugins: {cut, sup}} = require('@yfm/transform');
const video = require('markdown-it-video');

const content = fs.readFileSync(filePath, 'utf');
const vars = { user: { name: 'Alice' } };

const {result: {html, meta}, logs} = transform(content, {vars, plugins: [cut, sup, video]});
```

#### Предоставляемые плагины

Имя | Описание | Параметры
:--- | :--- | :---
anchors | Добавляет якоря заголовкам | {extractTitleOption? = false - нужно ли учитывать заголовок первого уровня}
code | Добавляет кнопку копирования в блоки кода | -
cut | [Сворачиваемые блоки](./DOCS.md#cutes) | -
images | [Вставка изображений](./DOCS.md#images) | {assetsPublicPath = '/' - путь до расположения иконок, root - путь до корня проекта, path - путь до текущего трансформируемого файла}
includes | [Вставки](./DOCS.md#includes) | {path - путь до текущего трансформируемого файла, getVarsPerFile? - функция, которая должна по пути файла вернуть вычисленные переменные}
links | [Расширенные ссылки](./DOCS.md#links) | {path - путь до текущего трансформируемого файла, root - путь до корня проекта}
notes | [Заметки](./DOCS.md#notes) | {lang? = ru - язык, нужен для локализации дефолтных текстов}
tabs | [Табы](./DOCS.md#tabs) | -

Набор плагинов подключаемый по умолчанию: attrs, meta, deflist, cut, alerts, anchors, tabs, code, imsize, sup.

Все плагины принимают опциональным параметром path путь до файла, который будет добавлен в лог ошибок.

### Дополнительные языки для подсветки

Трансформер YFM использует highlight.js для подсветки языков. Вы можете передать дополнительный набор языков,
который будет зарегистрирован для использования. Набор языков представляет собой обьект, где ключ - это имя языка,
а значение - функция, определяющая язык. Смотрите [уже существующие языки](https://github.com/highlightjs/highlight.js/tree/master/src/languages).

```js
const transform = require('@yfm/transform');
const customLang = require('./custom-lang');

const highlightLangs = { 'custom-lang': customLang };

const {result: {html, meta}, logs} = transform(content, {highlightLangs});
```

## Исходники
### Установка
```shell script
git clone git@github.com:yandex-cloud/yfm-transform.git
cd yfm-transform
npm install
```

При добавлении изменений в файлы из директории src перед обновлением версии пакета нужно выполнить
```shell script
npm run dist
```

## License

MIT
