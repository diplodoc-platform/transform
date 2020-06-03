[![build status](https://teamcity.yandex-team.ru/app/rest/builds/buildType:DataUI_Cloud_Yfm_Publish/statusIcon.svg)](https://teamcity.yandex-team.ru/viewType.html?buildTypeId=DataUI_Cloud_Yfm_Publish)
[![oko health](https://badger.yandex-team.ru/oko/repo/data-ui/yfm/health.svg)](https://oko.yandex-team.ru/repo/data-ui/yfm)

Трансформер YFM (Yandex Flavored Markdown) -> HTML

[Описание синтаксиса YFM](./DOCS.md)

## Использование

### Параметры

Имя | Описание | Тип | Значение по-умолчанию
:--- | :--- | :--- | :---
vars | Переменные | Object | {}
plugins | Используемые плагины | function[] | alerts, attrs, anchors, code, cut, deflist, imsize, meta, sup, tabs, titles
extractTitle | Вернуть первый заголовок первого уровня в качестве заголовка всего документа | bool | false
needTitle | Вернуть первый заголовок первого уровня не удалив его из контента | bool | false
allowHTML | Разрешено ли использование HTML | bool | false
linkify | Делать ли ссылками ссылкоподобные строки | bool | false
breaks | Переносить ли строки по символу перевода каретки | bool | true
conditionsInCode | Выполнять ли условия в блоках кода | bool | false

### Подключение и вызов

```js
const fs = require('fs');
const transform = require('yfm-transform');

const content = fs.readFileSync(filePath, 'utf');
const vars = { user: { name: 'Alice' } };

const {result: {html, meta}, logs} = transform(content, {vars});
```

### Плагины

Вы можете использовать произвольный набор плагинов, как предоставленные этим пакетом, так и любые [markdown-it плагины](https://www.npmjs.com/search?q=keywords:markdown-it-plugin)

```js
const fs = require('fs');
const transform = require('yfm-transform');
const {plugins: {cut, sup}} = require('yfm-transform');
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

## Исходники
### Установка
```bash
git clone git@github.yandex-team.ru:data-ui/yfm.git
cd yfm
npm install
```

При добавлении изменений в файлы из директории src перед обновлением версии пакета нужно выполнить
```bash
npm run dist
```

## License

MIT
