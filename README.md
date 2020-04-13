[![build status](https://teamcity.yandex-team.ru/app/rest/builds/buildType:DataUI_Cloud_Yfm_Publish/statusIcon.svg)](https://teamcity.yandex-team.ru/viewType.html?buildTypeId=DataUI_Cloud_Yfm_Publish)
[![oko health](https://badger.yandex-team.ru/oko/repo/data-ui/yfm/health.svg)](https://oko.yandex-team.ru/repo/data-ui/yfm)

Трансформер YFM (Yandex Flavored Markdown) -> HTML

[Описание синтаксиса YFM](./DOCS.md)

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

## npm-пакет
### Установка
```bash
npm install yfm-transform
```

### Использование

#### Параметры

Имя | Описание | Тип | Значение по-умолчанию
:--- | :--- | :--- | :---
vars | Переменные | Object | {}
plugins | Используемые плагины | function[] | alerts, attrs, anchors, code, cut, deflist, imsize, meta, sup, tabs, titles
extractTitle | Вернуть первый заголовок первого уровня в качестве заголовка всего документа | bool | false
needTitle | Вернуть первый заголовок первого уровня не удалив его из контента | bool | false
allowHTML | Разрешено ли использование HTML | bool | false
linkify | Делать ли ссылками ссылкоподобные строки | bool | false
breaks | Переносить ли строки по символу перевода каретки | bool | true

#### Подключение и вызов

```js
const fs = require('fs');
const transform = require('yfm-transform');

const root = '/path/to/docs/root'; // optional
const path = '/path/to/markdown/file.md';
const content = fs.readFileSync(filePath, 'utf');
const vars = { user: { name: 'Alice' } };

const {html, meta} = transform(content, {root, path, vars});
```

## License

Mozilla Public License
Version 2.0
