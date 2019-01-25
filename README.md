Трансформер YFM (Yandex Flavored Markdown) -> HTML

## Исходники
### Установка
```bash
git clone git@github.yandex-team.ru:data-ui/yfm.git
cd yfm
npm install
```

### Использование
```bash
npm run transform -- --source ./md-sources-dir --dest ./html-output --styles --vars {\"user\":{\"name\":\"Alice\"}}
```

### Сборка bin-файла
```bash
npm install -g pkg
pkg ./
```

Если нужно собирать полученным bin-файлом pdf-ки:

then, copy contents of node_modules/puppeteer/.local-chromium folder to chromium folder, next to your binaries.

for example:

project/\
├── build/\
│   ├── app-linux\
│   ├── app-macos\
│   ├── app-win.exe\
│   ├── chromium/\
│       ├── mac-526987/\
├── index.js\
├── package.json

https://github.com/zeit/pkg/issues/204#issuecomment-363219758

## npm-пакет
### Установка
```bash
npm install yfm-transform
```

Для использования CLI будет удобнее поставить пакет глобально:
```bash
sudo npm install -g yfm-transform
```

### Использование
**CLI**
```bash
yfm-transform --source ./md-sources-dir --dest ./html-output --styles --vars {\"user\":{\"name\":\"Alice\"}}
```

**API**
```js
const fs = require('fs');
const transform = require('yfm-transform');

const root = '/path/to/docs/root'; // optional
const path = '/path/to/markdown/file.md';
const content = fs.readFileSync(filePath, 'utf');
const vars = { user: { name: 'Alice' } };

const {html, meta} = transform(content, {root, path, vars});
```
