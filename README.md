**english** | [русский](https://github.com/yandex-cloud/yfm-transform/blob/master/README.ru.md)
- - -

[![NPM version](https://img.shields.io/npm/v/@doc-tools/transform.svg?style=flat)](https://www.npmjs.org/package/@doc-tools/transform)

A simple transformer of text in YFM (Yandex Flavored Markdown) to HTML.

## Yandex Flavored Markdown

Yandex Flavored Markdown (YFM) is a Markdown dialect that is now used for
[Yandex.Cloud documentation](https://cloud.yandex.ru/docs), [Yandex.Cloud website content](https://cloud.yandex.ru), and in a variety of internal Yandex projects.

The syntax is based on the CommonMark Spec, extending it with additional features. It's designed for creating
a full-fledged complex documentation project, such as Yandex.Cloud documentation.

To build your documentation project in YFM, use the [@doc-tools/docs](https://www.npmjs.com/package/@doc-tools/docs) package.

[Learn more about YFM syntax](./DOCS.md)

## Usage

### Parameters

| Name | Description | Type | Default value |
| :--- | :--- | :--- | :--- |
| vars | Variables | Object | {} |
| plugins | Plugins in use | function[] | alerts, attrs, anchors, code, cut, deflist, meta, sup, tabs, titles |
| highlightLangs | Additional languages for highlighting | {'lang': function} | {} |
| extractTitle | Return the first title of the first level as the title of the entire document | bool | false |
| needTitle | Return the first title of the first level without deleting it from the content | bool | false |
| allowHTML | Shows whether it's allowed to use HTML | bool | false |
| linkify | Shows whether to convert clickable lines into links | bool | false |
| breaks | Shows whether to use the carriage return character for a line break | bool | true |
| conditionsInCode | Shows whether to meet conditions in code blocks | bool | false |

### Connect and run

The transformer returns the result of transformation and the log classified by message type: errors, warnings, and information messages.
You can handle error and warning messages based on the required severity level.

```js
const fs = require('fs');
const transform = require('@doc-tools/transform');

const content = fs.readFileSync(filePath, 'utf');
const vars = { user: { name: 'Alice' } };

const {result: {html, meta}, logs} = transform(content, {vars});
```

### Plugins

You can use any set of plugins provided by this package or any [markdown-it plugins](https://www.npmjs.com/search?q=keywords:markdown-it-plugin)

```js
const fs = require('fs');
const transform = require('@doc-tools/transform');
const {plugins: {cut, sup}} = require('@doc-tools/transform');
const video = require('markdown-it-video');

const content = fs.readFileSync(filePath, 'utf');
const vars = { user: { name: 'Alice' } };

const {result: {html, meta}, logs} = transform(content, {vars, plugins: [cut, sup, video]});
```

#### Provided plugins

| Name | Description | Parameters |
| :--- | :--- | :--- |
| anchors | Adds anchors to headings | extractTitleOption? = false - нужно ли учитывать заголовок первого уровня |
| code | Adds the copy button to code blocks | - |
| cut | [Collapsible blocks](./DOCS.md#cutes) | - |
| images | [Inserting images](./DOCS.md#images) | assetsPublicPath = '/' - путь до расположения иконок<br>root - путь до корня проекта<br>path - путь до текущего трансформируемого файла |
| includes | [Inserts](./DOCS.md#includes) | path - путь до текущего трансформируемого файла<br>getVarsPerFile? - функция, которая должна по пути файла вернуть вычисленные переменные |
| links | [Extended links](./DOCS.md#links) | path - путь до текущего трансформируемого файла<br>root - путь до корня проекта |
| notes | [Notes](./DOCS.md#notes) | lang? = ru - язык, нужен для локализации дефолтных текстов |
| tabs | [Tabs](./DOCS.md#tabs) | - |

A set of plugins added by default: attrs, meta, deflist, cut, alerts, anchors, tabs, code, imsize, sup.

All plugins accept the path to the file to be added to the error log as an optional path parameter.

### Additional languages for highlighting

The YFM transformer uses highlight.js for highlighting languages. You can pass an additional set of languages
that will be registered for use. A set of languages is an object, where the key is the language name
and the value is a function that defines the language. See [the list of existing languages](https://github.com/highlightjs/highlight.js/tree/master/src/languages).

```js
const transform = require('@doc-tools/transform');
const customLang = require('./custom-lang');

const highlightLangs = { 'custom-lang': customLang };

const {result: {html, meta}, logs} = transform(content, {highlightLangs});
```

## Source files

### Installation

```shell script
git clone git@github.com:yandex-cloud/yfm-transform.git
cd yfm-transform
npm install
```

When you add changes to files from the SRC folder, before updating the package version, run

```shell script
npm run dist
```

## License

MIT
