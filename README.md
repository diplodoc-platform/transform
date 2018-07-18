Трансформер YFM (Yandex Flavored Markdown) -> HTML

## Установка
```bash
npm install yfm-transform
```

## Использование

### CLI
```bash
yfm-transform --source ./md-sources-dir --dest ./html-output --styles
```

### API
```js
const fs = require('fs');
const transform = require('yfm-transform');

const filePath = '/path/to/markdown/file.md';
const content = fs.readFileSync(filePath, 'utf');

const {html, meta} = transform(content, filePath)
```
