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
npm run transform -- --source ./md-sources-dir --dest ./html-output --styles
```

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
yfm-transform --source ./md-sources-dir --dest ./html-output --styles
```

**API**
```js
const fs = require('fs');
const transform = require('yfm-transform');

const filePath = '/path/to/markdown/file.md';
const content = fs.readFileSync(filePath, 'utf');

const {html, meta} = transform(content, filePath)
```
